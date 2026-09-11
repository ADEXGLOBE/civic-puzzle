require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

const app = express();
const port = Number(process.env.PORT || 5000);

const DATA_FILE = path.join(__dirname, "headlines.json");
const LEADERBOARD_FILE = path.join(__dirname, "leaderboard.json");
const CONFIG_FILE = path.join(__dirname, "config.json");
const DICTIONARY_CACHE_FILE = path.join(__dirname, "dictionaryCache.json");

const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || "").trim();
const NEWS_FETCH_TIMEOUT_MS = Number(process.env.NEWS_FETCH_TIMEOUT_MS || 4000);
const DICTIONARY_FETCH_TIMEOUT_MS = Number(process.env.DICTIONARY_FETCH_TIMEOUT_MS || 3500);
const SOURCE_CACHE_TTL_MS = 10 * 60 * 1000;
const GENERATED_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_NEWS_ITEMS = 12;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

function defaultStore() {
  return { weeks: {}, facts: [], crosswords: [], sponsors: [] };
}

function loadJsonSafe(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJsonSafe(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

let store = loadJsonSafe(DATA_FILE, defaultStore());
let leaderboard = loadJsonSafe(LEADERBOARD_FILE, { cities: {} });
let appConfig = loadJsonSafe(CONFIG_FILE, { feedUrl: "" });
let dictionaryCache = loadJsonSafe(DICTIONARY_CACHE_FILE, {});

function saveConfig() {
  saveJsonSafe(CONFIG_FILE, appConfig);
}

function saveDictionaryCache() {
  saveJsonSafe(DICTIONARY_CACHE_FILE, dictionaryCache);
}

function saveStore() {
  saveJsonSafe(DATA_FILE, store);
}

function requireAdmin(req) {
  const auth = req.headers["authorization"] || "";
  if (!ADMIN_TOKEN) {
    return process.env.NODE_ENV !== "production" && auth === "Bearer puzzleMaster123";
  }
  return auth === `Bearer ${ADMIN_TOKEN}`;
}

function cleanText(text) {
  return String(text || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function normalizeUrl(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) return "";
  return u;
}

function cleanAnswerWord(word) {
  return String(word || "").replace(/[^a-zA-Z]/g, "").toUpperCase();
}

function getCurrentWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function makeHintFromHeadline(headline) {
  const words = String(headline || "").split(/\s+/).filter(Boolean);
  if (words.length <= 2) return "Solve the headline one word at a time.";
  return `Starts with: ${words[0]} • Ends with: ${words[words.length - 1]}`;
}

function scrambleSentence(sentence) {
  return String(sentence || "").split(/\s+/).filter(Boolean).sort(() => Math.random() - 0.5).join(" ");
}

function getStoredHeadlines() {
  const wk = getCurrentWeekKey();
  return store.weeks[wk] || [];
}

const sourceCache = new Map();
const sourceInFlight = new Map();
const generatedCache = new Map();

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function fetchText(url) {
  const timeout = createTimeoutSignal(NEWS_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: timeout.signal,
      headers: {
        "User-Agent": "CivicPuzzleBot/1.0",
        Accept: "text/html,application/rss+xml,application/xml,application/json",
      },
    });

    if (!res.ok) throw new Error(`Could not fetch URL (${res.status})`);
    return await res.text();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`News source timed out after ${NEWS_FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    timeout.clear();
  }
}

function parseJsonFeed(text) {
  try {
    const json = JSON.parse(text);
    if (!Array.isArray(json)) return [];

    return json.map((item) => {
      if (typeof item === "string") {
        return { headline: cleanText(item), summary: "", readMoreUrl: "" };
      }

      const headline = cleanText(item.headline || item.title || item.text);
      if (!headline) return null;

      return {
        headline,
        summary: cleanText(item.summary || item.description || item.fact || ""),
        readMoreUrl: cleanText(item.readMoreUrl || item.url || item.link || ""),
        hint: cleanText(item.hint || ""),
      };
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function parseRssFeed(text) {
  const $ = cheerio.load(text, { xmlMode: true });
  const items = [];

  $("item").each((_, el) => {
    const headline = cleanText($(el).find("title").first().text());
    const link = cleanText($(el).find("link").first().text());
    const description = cleanText($(el).find("description").first().text());

    if (headline) {
      items.push({
        headline,
        summary: description,
        readMoreUrl: link,
        hint: makeHintFromHeadline(headline),
      });
    }
  });

  $("entry").each((_, el) => {
    const headline = cleanText($(el).find("title").first().text());
    const link = cleanText($(el).find("link").first().attr("href"));
    const description = cleanText($(el).find("summary").first().text() || $(el).find("content").first().text());

    if (headline) {
      items.push({
        headline,
        summary: description,
        readMoreUrl: link,
        hint: makeHintFromHeadline(headline),
      });
    }
  });

  return items;
}

function parseHtmlNewsPage(text, sourceUrl) {
  const $ = cheerio.load(text);
  const items = [];

  $("article").each((_, el) => {
    const headline =
      cleanText($(el).find("h1").first().text()) ||
      cleanText($(el).find("h2").first().text()) ||
      cleanText($(el).find("h3").first().text());

    const summary =
      cleanText($(el).find("p").first().text()) ||
      cleanText($(el).attr("aria-label"));

    let link = $(el).find("a").first().attr("href") || "";

    if (link && link.startsWith("/")) {
      try {
        const base = new URL(sourceUrl);
        link = `${base.origin}${link}`;
      } catch {}
    }

    if (headline && headline.length > 12) {
      items.push({
        headline,
        summary,
        readMoreUrl: normalizeUrl(link) || sourceUrl,
        hint: makeHintFromHeadline(headline),
      });
    }
  });

  if (items.length === 0) {
    $("h1,h2,h3").each((_, el) => {
      const headline = cleanText($(el).text());

      if (headline && headline.length > 12 && headline.length < 160) {
        items.push({
          headline,
          summary: "",
          readMoreUrl: sourceUrl,
          hint: makeHintFromHeadline(headline),
        });
      }
    });
  }

  return items.slice(0, 20);
}

async function getNewsItemsFromUrl(sourceUrl) {
  const url = normalizeUrl(sourceUrl);
  if (!url) return [];

  const cached = sourceCache.get(url);
  if (cached && Date.now() - cached.ts < SOURCE_CACHE_TTL_MS) return cached.items;
  if (sourceInFlight.has(url)) return sourceInFlight.get(url);

  const request = (async () => {
    let text;
    try {
      text = await fetchText(url);
    } catch (error) {
      if (cached?.items?.length) return cached.items;
      throw error;
    }

    let items = parseJsonFeed(text);
    if (items.length === 0) items = parseRssFeed(text);
    if (items.length === 0) items = parseHtmlNewsPage(text, url);

    items = items
      .filter((item) => item.headline)
      .map((item) => ({
        headline: cleanText(item.headline),
        summary: cleanText(item.summary || ""),
        readMoreUrl: normalizeUrl(item.readMoreUrl || url),
        hint: item.hint || makeHintFromHeadline(item.headline),
      }))
      .slice(0, MAX_NEWS_ITEMS);

    sourceCache.set(url, { ts: Date.now(), items });
    generatedCache.clear();
    return items;
  })();

  sourceInFlight.set(url, request);
  try {
    return await request;
  } finally {
    sourceInFlight.delete(url);
  }
}

// ---------- LOCATION-AWARE NEWS ----------

function normalizeCity(city) {
  const cleaned = cleanText(city || "Ballarat");
  return cleaned || "Ballarat";
}

function normalizeRadius(radius) {
  const allowed = ["local", "regional", "state", "national", "global"];
  return allowed.includes(radius) ? radius : "local";
}

function getCountryFromCity(city) {
  const c = String(city || "").toLowerCase();

  const nigeriaCities = ["lagos", "abuja", "ibadan", "lekki", "ikeja", "victoria island", "port harcourt"];
  const ukCities = ["london", "manchester", "birmingham"];
  const usCities = ["new york", "los angeles", "chicago", "houston"];
  const ghanaCities = ["accra", "kumasi"];

  if (nigeriaCities.some((x) => c.includes(x))) return { gl: "NG", ceid: "NG:en", countryName: "Nigeria" };
  if (ukCities.some((x) => c.includes(x))) return { gl: "GB", ceid: "GB:en", countryName: "United Kingdom" };
  if (usCities.some((x) => c.includes(x))) return { gl: "US", ceid: "US:en", countryName: "United States" };
  if (ghanaCities.some((x) => c.includes(x))) return { gl: "GH", ceid: "GH:en", countryName: "Ghana" };

  return { gl: "AU", ceid: "AU:en", countryName: "Australia" };
}

function buildLocationQuery(city, radius) {
  const safeCity = normalizeCity(city);
  const r = normalizeRadius(radius);
  const country = getCountryFromCity(safeCity).countryName;

  if (r === "local") return `"${safeCity}" local news`;
  if (r === "regional") return `"${safeCity}" regional news`;
  if (r === "state") return `"${safeCity}" ${country} news`;
  if (r === "national") return `${country} news`;
  if (r === "global") return "world news";

  return `"${safeCity}" local news`;
}

function buildGoogleNewsRssUrl(city, radius) {
  const country = getCountryFromCity(city);
  const query = buildLocationQuery(city, radius);

  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en&gl=${country.gl}&ceid=${country.ceid}`;
}

function getStoredNewsItems() {
  const storedHeadlines = Object.keys(store.weeks || {})
    .sort()
    .reverse()
    .flatMap((week) => store.weeks[week] || [])
    .filter((item) => cleanText(item?.headline))
    .map((item) => ({
      headline: cleanText(item.headline),
      summary: "",
      readMoreUrl: normalizeUrl(item.readMoreUrl),
      hint: cleanText(item.hint) || makeHintFromHeadline(item.headline),
    }));

  const storedFacts = (store.facts || [])
    .filter((item) => cleanText(item?.text))
    .map((item) => ({
      headline: cleanText(item.text),
      summary: cleanText(item.text),
      readMoreUrl: normalizeUrl(item.readMoreUrl),
      hint: cleanText(item.hint) || makeHintFromHeadline(item.text),
    }));

  return [...storedHeadlines, ...storedFacts].slice(0, MAX_NEWS_ITEMS);
}

async function getLocationAwareNews({ city = "Ballarat", radius = "local" } = {}) {
  const sourceUrl = normalizeUrl(appConfig.feedUrl || "");
  const targetUrl = sourceUrl || buildGoogleNewsRssUrl(city, radius);
  const cached = sourceCache.get(targetUrl);

  if (cached?.items?.length && Date.now() - cached.ts < SOURCE_CACHE_TTL_MS) {
    return cached.items;
  }

  const storedItems = getStoredNewsItems();
  if (storedItems.length > 0) {
    getNewsItemsFromUrl(targetUrl).catch((error) => {
      console.warn("Background news refresh failed:", error.message);
    });
    return storedItems;
  }

  try {
    return await getNewsItemsFromUrl(targetUrl);
  } catch (error) {
    console.warn("Live news unavailable and no stored content exists:", error.message);
    return [];
  }
}

// ---------- SPONSOR SYSTEM VERSION 10 ----------

const DEFAULT_SPONSORS = [
  {
    id: "laxa",
    name: "LAXA Technology",
    city: "global",
    message: "Build, market and deploy creative technology solutions.",
    cta: "Discover LAXA Technology",
    url: "https://civic-puzzle.onrender.com",
    active: true,
  },
];

function getSponsors() {
  const existing = Array.isArray(store.sponsors) ? store.sponsors : [];
  return [...DEFAULT_SPONSORS, ...existing].filter((s) => s && s.active !== false);
}

function chooseSponsor(city) {
  const sponsors = getSponsors();
  const cleanCity = normalizeCity(city).toLowerCase();

  const citySponsor = sponsors.find((s) => String(s.city || "").toLowerCase() === cleanCity);
  if (citySponsor) return citySponsor;

  return sponsors.find((s) => String(s.city || "").toLowerCase() === "global") || null;
}

function attachSponsor(item, city, index) {
  const sponsor = chooseSponsor(city);

  if (!sponsor) return item;

  // Show sponsor on every 3rd card plus first card.
  const shouldAttach = index === 0 || index % 3 === 0;
  if (!shouldAttach) return item;

  return {
    ...item,
    sponsor: {
      id: sponsor.id,
      name: sponsor.name,
      message: sponsor.message,
      cta: sponsor.cta,
      url: sponsor.url,
    },
  };
}

// ---------- DICTIONARY HINT SYSTEM ----------

const STOP_WORDS = new Set([
  "THE", "AND", "FOR", "WITH", "FROM", "THIS", "THAT", "HAVE", "HAS", "WILL",
  "ARE", "WAS", "WERE", "YOU", "YOUR", "OUR", "NEW", "NEWS", "TODAY", "SAYS",
  "SAID", "INTO", "OVER", "AFTER", "BEFORE", "THEN", "ALL", "SAME", "DAY",
  "CAN", "NOT", "BUT", "OUT", "ABOUT", "THEIR", "THEY", "THEM", "WHO", "WHAT",
  "WHEN", "WHERE", "WHY", "HOW", "A", "AN", "OF", "TO", "IN", "ON", "AT",
  "BY", "AS", "IS", "BE", "IT",
]);

function fallbackMeaning(word) {
  const local = {
    A: "Used before a singular noun when referring to one unspecified person or thing.",
    AN: "Used before a vowel sound when referring to one unspecified person or thing.",
    AS: "Used to describe a role, comparison, or the way something happens.",
    AT: "Used to identify a particular place, time, or point.",
    BE: "To exist or to have a particular state or quality.",
    BY: "Used to identify who performed an action or what is beside something.",
    IN: "Used when something is inside a place, period, or situation.",
    IS: "A form of ‘be’ used for one person or thing in the present.",
    IT: "Used to refer to a thing, situation, or idea already mentioned.",
    OF: "Used to show belonging, connection, composition, or amount.",
    ON: "Used when something touches a surface or happens at a particular time.",
    TO: "Used to show direction, destination, purpose, or relationship.",
    AFTER: "Happening later than a particular event, action, or time.",
    BEFORE: "During an earlier time than a particular event or action.",
    YEARS: "Periods of twelve months used for measuring time or age.",
    YEAR: "A period of twelve months.",
    ISLAMOPHOBIA: "Fear of, hostility toward, or prejudice against Islam or Muslim people.",
    SHIP: "A large boat used for transporting people or goods by sea.",
    BOAT: "A small vessel used for travelling on water.",
    BANK: "A financial institution where people keep or borrow money.",
    ROAD: "A route or path used for travel by vehicles or people.",
    CITY: "A large town or populated urban area.",
    COURT: "A place where legal cases are heard.",
    POLICE: "An official organization responsible for public safety and law enforcement.",
    SCHOOL: "A place where people go to learn.",
    MARKET: "A place or system where goods and services are bought and sold.",
    HEALTH: "The condition of a person’s body or mind.",
    WATER: "A clear liquid needed by people, animals, and plants.",
    POWER: "Energy used to operate machines, systems, or devices.",
    TRAIN: "A vehicle that runs on rails.",
    AIRPORT: "A place where aircraft take off and land.",
    FARM: "Land used to grow crops or raise animals.",
    OIL: "A natural resource often used as fuel or in industry.",
    GAS: "A fuel used for energy, heating, or cooking.",
    VOTE: "A choice made in an election or decision.",
    FLOOD: "An overflow of water covering normally dry land.",
    FIRE: "Flames and heat produced when something burns.",
    TEAM: "A group of people working or playing together.",
    APP: "Software designed to run on a phone, tablet, or computer.",
    DATA: "Information used, stored, or processed by computers.",
    STOCKS: "Shares representing ownership in a company.",
    INVESTORS: "People or organizations that put money into something expecting profit.",
    RATES: "Measured amounts, levels, or prices used for comparison.",
    JOBS: "Paid positions of regular employment.",
  };

  return local[word] || "";
}

function guessCategory(word, partOfSpeech = "") {
  if (partOfSpeech) return partOfSpeech;

  const finance = ["BANK", "MARKET", "MONEY", "PRICE", "PRICES", "ECONOMY", "OIL", "GAS", "TRADE", "STOCK", "STOCKS", "INVESTORS", "RATES"];
  const politics = ["VOTE", "GOVERNMENT", "COURT", "LAW", "PRESIDENT", "MINISTER", "SENATE", "ELECTION"];
  const transport = ["SHIP", "ROAD", "TRAIN", "AIRPORT", "BUS", "CAR", "PORT", "PLANE", "TRUCK", "RAIL"];
  const tech = ["AI", "TECH", "APP", "DATA", "CYBER", "ROBOT", "DIGITAL"];

  if (finance.includes(word)) return "Finance / Economy";
  if (politics.includes(word)) return "Politics / Government";
  if (transport.includes(word)) return "Transportation";
  if (tech.includes(word)) return "Technology";

  return "News";
}

function buildRevealPattern(word) {
  const upper = cleanAnswerWord(word);

  if (!upper) return "";

  if (upper.length <= 2) {
    return upper[0] + "_".repeat(Math.max(0, upper.length - 1));
  }

  return upper
    .split("")
    .map((letter, index) => (index === 0 || index === upper.length - 1 ? letter : "_"))
    .join(" ");
}

async function fetchJsonWithDictionaryTimeout(url) {
  const timeout = createTimeoutSignal(DICTIONARY_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: timeout.signal,
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    timeout.clear();
  }
}

async function fetchFreeDictionaryMeaning(clean) {
  const data = await fetchJsonWithDictionaryTimeout(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`
  );
  const meanings = data?.[0]?.meanings || [];
  const selected = meanings.find((meaning) => {
    const definition = meaning?.definitions?.[0]?.definition || "";
    return definition && !definition.toLowerCase().includes(clean);
  }) || meanings[0];
  const definition = cleanText(selected?.definitions?.[0]?.definition || "");
  if (!definition) return null;
  return {
    definition,
    partOfSpeech: cleanText(selected?.partOfSpeech || ""),
    source: "dictionaryapi",
  };
}

async function fetchDatamuseMeaning(clean) {
  const data = await fetchJsonWithDictionaryTimeout(
    `https://api.datamuse.com/words?sp=${encodeURIComponent(clean)}&md=dp&max=5`
  );
  const exact = Array.isArray(data)
    ? data.find((entry) => String(entry?.word || "").toLowerCase() === clean && entry?.defs?.length)
    : null;
  const rawDefinition = exact?.defs?.[0] || "";
  const separator = rawDefinition.indexOf("\t");
  const definition = cleanText(separator >= 0 ? rawDefinition.slice(separator + 1) : rawDefinition);
  if (!definition) return null;
  return {
    definition,
    partOfSpeech: cleanText(separator >= 0 ? rawDefinition.slice(0, separator) : ""),
    source: "datamuse",
  };
}

async function fetchLiveDictionaryMeaning(word) {
  const clean = cleanAnswerWord(word).toLowerCase();
  if (!clean || clean.length < 3) return null;
  if (dictionaryCache[clean]?.definition) return dictionaryCache[clean];

  const providers = [fetchFreeDictionaryMeaning(clean), fetchDatamuseMeaning(clean)]
    .map((request) => request.then((result) => {
      if (!result) throw new Error("No definition returned");
      return result;
    }));

  try {
    const result = await Promise.any(providers);
    const cached = { ...result, fetchedAt: Date.now() };
    dictionaryCache[clean] = cached;
    saveDictionaryCache();
    return cached;
  } catch {
    return null;
  }
}

function buildContextClue(word, context = "") {
  const upper = cleanAnswerWord(word);
  const words = String(context || "")
    .split(/\s+/)
    .map(cleanAnswerWord)
    .filter(Boolean);
  const index = words.findIndex((item) => item === upper);

  if (index === -1) return "This answer is one of the words in the current puzzle.";

  const previous = index > 0 ? `“${words[index - 1]}”` : "the beginning of the headline";
  const next = index < words.length - 1 ? `“${words[index + 1]}”` : "the end of the headline";
  return `It appears after ${previous} and before ${next}.`;
}

async function buildHintForWord(word, context = "") {
  const upper = cleanAnswerWord(word);
  if (!upper) return null;

  const builtInMeaning = fallbackMeaning(upper);
  const live = builtInMeaning ? null : await fetchLiveDictionaryMeaning(upper);
  const meaning = live?.definition || builtInMeaning;
  const categoryHint = guessCategory(upper, live?.partOfSpeech || "");

  return {
    word: upper,
    categoryHint,
    startsWith: upper.slice(0, Math.min(2, upper.length)),
    answerLength: upper.length,
    clue: meaning,
    meaning,
    contextHint: meaning
      ? "Dictionary meaning of the current puzzle word."
      : "No dictionary definition is currently available.",
    contextClue: buildContextClue(upper, context),
    revealPattern: buildRevealPattern(upper),
    source: live?.source || (builtInMeaning ? "built-in-dictionary" : "unavailable"),
    meaningAvailable: Boolean(meaning),
  };
}

async function buildProgressiveHintsForText(text) {
  const words = String(text || "")
    .split(/\s+/)
    .map(cleanAnswerWord)
    .filter((word) => word && word.length >= 3)
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 6);

  const hints = await Promise.all(words.map((word) => buildHintForWord(word)));
  return hints.filter(Boolean);
}

function buildCachedHintsForText(text) {
  return String(text || "")
    .split(/\s+/)
    .map(cleanAnswerWord)
    .filter((word) => word && word.length >= 3 && !STOP_WORDS.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 6)
    .map((word) => {
      const live = dictionaryCache[word.toLowerCase()];
      const meaning = live?.definition || fallbackMeaning(word);
      return {
        word,
        categoryHint: guessCategory(word, live?.partOfSpeech || ""),
        startsWith: word.slice(0, Math.min(2, word.length)),
        answerLength: word.length,
        clue: meaning,
        meaning,
        contextHint: live ? "Cached dictionary meaning of this word." : "News word hint.",
        revealPattern: buildRevealPattern(word),
        source: live?.source || "fallback",
      };
    });
}

function readGeneratedCache(key) {
  const cached = generatedCache.get(key);
  if (!cached || Date.now() - cached.ts >= GENERATED_CACHE_TTL_MS) return null;
  return cached.data;
}

function writeGeneratedCache(key, data) {
  generatedCache.set(key, { ts: Date.now(), data });
  return data;
}

// ---------- CROSSWORD ----------

function getCandidateWords(text) {
  return String(text || "")
    .split(/\s+/)
    .map(cleanAnswerWord)
    .filter((word) => word.length >= 3 && word.length <= 10)
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 6);
}

function canPlaceWord(grid, word, row, col, direction) {
  if (direction === "across") {
    if (col + word.length > grid[0].length) return false;
    for (let i = 0; i < word.length; i++) {
      const existing = grid[row][col + i];
      if (existing && existing !== word[i]) return false;
    }
  } else {
    if (row + word.length > grid.length) return false;
    for (let i = 0; i < word.length; i++) {
      const existing = grid[row + i][col];
      if (existing && existing !== word[i]) return false;
    }
  }

  return true;
}

function placeWord(grid, word, row, col, direction) {
  for (let i = 0; i < word.length; i++) {
    if (direction === "across") grid[row][col + i] = word[i];
    else grid[row + i][col] = word[i];
  }
}

async function buildAutoCrossword({ id, title, sourceType, text, readMoreUrl, sponsor }) {
  const rows = 12;
  const cols = 12;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  const words = getCandidateWords(text);
  // Resolve all definitions concurrently so crossword generation stays fast.
  // buildHintForWord uses the local dictionary/cache first and bounded live
  // lookups only when necessary.
  const wordHints = await Promise.all(
    words.map((word) => buildHintForWord(word, text))
  );

  const slots = [
    { row: 1, col: 1, direction: "across" },
    { row: 3, col: 1, direction: "across" },
    { row: 5, col: 1, direction: "across" },
    { row: 1, col: 8, direction: "down" },
    { row: 1, col: 10, direction: "down" },
    { row: 7, col: 1, direction: "across" },
  ];

  const entries = [];
  let num = 1;

  for (let wordIndex = 0; wordIndex < words.length; wordIndex++) {
    const word = words[wordIndex];
    const slot = slots.find((s) => !s.used && canPlaceWord(grid, word, s.row, s.col, s.direction));
    if (!slot) continue;

    placeWord(grid, word, slot.row, slot.col, slot.direction);
    slot.used = true;

    const hint = wordHints[wordIndex];
    const clue = hint?.meaning || hint?.contextClue || `A ${word.length}-letter word from this news item.`;

    entries.push({
      num,
      row: slot.row,
      col: slot.col,
      direction: slot.direction,
      answer: word,
      clue,
      progressiveHints: {
        ...hint,
        clue,
        meaning: hint?.meaning || "",
        contextClue:
          hint?.contextClue ||
          "This answer appears in the news item used to build this crossword.",
      },
    });

    num++;
  }

  const blocks = [];
  const solution = grid.map((row, r) =>
    row.map((cell, c) => {
      if (!cell) {
        blocks.push([r, c]);
        return "#";
      }
      return cell;
    })
  );

  return {
    id,
    title,
    subtitle: sourceType === "headline" ? "Built from local headline" : "Built from local fact",
    sourceType,
    revealText: text,
    readMoreUrl,
    sponsor,
    size: { rows, cols },
    blocks,
    solution,
    entries,
    across: entries.filter((e) => e.direction === "across"),
    down: entries.filter((e) => e.direction === "down"),
  };
}

async function buildCrosswords({ city = "Ballarat", radius = "local" } = {}) {
  const items = await getLocationAwareNews({ city, radius });
  const crosswords = [];

  for (let index = 0; index < items.length; index++) {
    const item = attachSponsor(items[index], city, index);

    const crossword = await buildAutoCrossword({
      id: `${city}-headline-${index}`,
      title: `${city} Crossword #${index + 1}`,
      sourceType: "headline",
      text: item.summary || item.headline,
      readMoreUrl: item.readMoreUrl || "",
      sponsor: item.sponsor || null,
    });

    if (crossword.entries.length > 0) crosswords.push(crossword);
  }

  return crosswords;
}

// ---------- ROUTES ----------

app.get("/api/config", (req, res) => {
  res.json({
    feedUrlEnabled: Boolean(appConfig.feedUrl),
    dictionaryHintsEnabled: true,
    aiHintsEnabled: false,
    locationAwareNewsEnabled: true,
    sponsoredPuzzlesEnabled: true,
  });
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "civic-puzzle", timestamp: new Date().toISOString() });
});

app.get("/api/test-dictionary/:word", async (req, res) => {
  const word = cleanAnswerWord(req.params.word);
  const hint = await buildHintForWord(word, req.query.context);
  res.json(hint);
});

app.get("/api/hints/:word", async (req, res) => {
  const word = cleanAnswerWord(req.params.word);
  if (!word) return res.status(400).json({ error: "A valid puzzle word is required." });

  const context = cleanText(req.query.context || "").slice(0, 500);
  const hint = await buildHintForWord(word, context);
  res.json(hint);
});

app.get("/api/admin/config", (req, res) => {
  if (!requireAdmin(req)) return res.status(401).send("Unauthorized");
  res.json(appConfig);
});

app.post("/api/admin/set-feed-url", (req, res) => {
  if (!requireAdmin(req)) return res.status(401).send("Unauthorized");

  const { url } = req.body || {};
  const cleanUrl = normalizeUrl(url);

  if (!cleanUrl) return res.status(400).send("Invalid URL");

  appConfig.feedUrl = cleanUrl;
  saveConfig();
  sourceCache.clear();
  sourceInFlight.clear();
  generatedCache.clear();

  res.json({ ok: true, feedUrl: appConfig.feedUrl });
});

app.get("/api/puzzles", async (req, res) => {
  try {
    const city = normalizeCity(req.query.city || "Ballarat");
    const radius = normalizeRadius(req.query.radius || "local");
    const locationMode = cleanText(req.query.locationMode || "manual");
    const cacheKey = `puzzles:${city}:${radius}:${locationMode}`;
    const cached = readGeneratedCache(cacheKey);
    if (cached) return res.json(cached);

    const items = await getLocationAwareNews({ city, radius });
    const puzzles = items.map((rawItem, index) => {
      const h = attachSponsor(rawItem, city, index);
      const headline = cleanText(h.headline);

      return {
        puzzle: scrambleSentence(headline),
        answer: headline,
        readMoreUrl: h.readMoreUrl || "",
        hint: h.hint || makeHintFromHeadline(headline),
        city,
        radius,
        locationMode,
        sponsor: h.sponsor || null,
        progressiveHints: buildCachedHintsForText(headline),
      };
    });

    res.json(writeGeneratedCache(cacheKey, puzzles));
  } catch (error) {
    console.log("Puzzle generation failed:", error.message);
    res.status(500).json({ error: "Failed to generate local puzzles" });
  }
});

app.get("/api/facts", async (req, res) => {
  try {
    const city = normalizeCity(req.query.city || "Ballarat");
    const radius = normalizeRadius(req.query.radius || "local");
    const cacheKey = `facts:${city}:${radius}`;
    const cached = readGeneratedCache(cacheKey);
    if (cached) return res.json(cached);

    const items = await getLocationAwareNews({ city, radius });
    const facts = items.map((rawItem, index) => {
      const item = attachSponsor(rawItem, city, index);
      const text = item.summary || item.headline;

      return {
        text,
        city,
        radius,
        readMoreUrl: item.readMoreUrl,
        sponsor: item.sponsor || null,
        hint: `${city} fact challenge #${index + 1}`,
        progressiveHints: buildCachedHintsForText(text),
      };
    });

    res.json(writeGeneratedCache(cacheKey, facts));
  } catch (error) {
    console.log("Facts failed:", error.message);
    res.status(500).json({ error: "Failed to load local facts" });
  }
});

app.get("/api/crosswords", async (req, res) => {
  try {
    const city = normalizeCity(req.query.city || "Ballarat");
    const radius = normalizeRadius(req.query.radius || "local");

    const crosswords = await buildCrosswords({ city, radius });
    res.json([...(crosswords || []), ...(store.crosswords || [])]);
  } catch (error) {
    console.log("Crossword generation failed:", error.message);
    res.status(500).json({ error: "Failed to generate local crosswords" });
  }
});

app.post("/api/headlines", (req, res) => {
  if (!requireAdmin(req)) return res.status(401).send("Unauthorized");

  const { headline, readMoreUrl = "", hint } = req.body || {};

  if (!headline) return res.status(400).send("Headline is required");

  const wk = getCurrentWeekKey();
  store.weeks[wk] = store.weeks[wk] || [];

  const clean = cleanText(headline);
  const exists = store.weeks[wk].some((h) => h.headline === clean);

  if (!exists) {
    store.weeks[wk].push({
      headline: clean,
      readMoreUrl: normalizeUrl(readMoreUrl),
      hint: hint || makeHintFromHeadline(clean),
    });

    saveStore();
  }

  res.json({ ok: true, week: wk, count: store.weeks[wk].length });
});

app.post("/api/facts", (req, res) => {
  if (!requireAdmin(req)) return res.status(401).send("Unauthorized");

  const { text, readMoreUrl = "", hint } = req.body || {};

  if (!text) return res.status(400).send("Fact text is required");

  const clean = cleanText(text);
  const exists = store.facts.some((f) => f.text === clean);

  if (!exists) {
    store.facts.push({
      text: clean,
      readMoreUrl: normalizeUrl(readMoreUrl),
      hint: hint || `Think: ${clean.slice(0, 18)}...`,
    });

    saveStore();
  }

  res.json({ ok: true, count: store.facts.length });
});

// Version 10 sponsor admin route
app.post("/api/admin/sponsors", (req, res) => {
  if (!requireAdmin(req)) return res.status(401).send("Unauthorized");

  const { name, city = "global", message = "", cta = "Learn More", url = "" } = req.body || {};

  if (!name) return res.status(400).send("Sponsor name is required");

  store.sponsors = Array.isArray(store.sponsors) ? store.sponsors : [];

  const sponsor = {
    id: `${Date.now()}`,
    name: cleanText(name),
    city: cleanText(city || "global"),
    message: cleanText(message),
    cta: cleanText(cta),
    url: normalizeUrl(url),
    active: true,
    createdAt: Date.now(),
  };

  store.sponsors.push(sponsor);
  saveStore();

  res.json({ ok: true, sponsor });
});

app.get("/api/sponsors", (req, res) => {
  res.json(getSponsors());
});

app.get("/api/leaderboard", (req, res) => {
  const city = String(req.query.city || "Ballarat").trim();

  const rows = (leaderboard.cities[city] || [])
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 30);

  res.json(rows);
});

app.post("/api/leaderboard", (req, res) => {
  const {
    city = "Ballarat",
    playerName = "Player",
    score = 0,
    mode = "news",
  } = req.body || {};

  const cleanCity = String(city).trim().slice(0, 60) || "Ballarat";
  const cleanName = String(playerName).trim().slice(0, 40) || "Player";
  const cleanScore = Number(score);

  leaderboard.cities[cleanCity] = leaderboard.cities[cleanCity] || [];

  leaderboard.cities[cleanCity].push({
    playerName: cleanName,
    score: cleanScore,
    mode,
    ts: Date.now(),
  });

  saveJsonSafe(LEADERBOARD_FILE, leaderboard);

  res.json({ ok: true });
});

function startServer() {
  return app.listen(port, () => {
    console.log(`✅ Civic Puzzle backend running on port ${port}`);
    console.log("📘 Dictionary hints enabled: true");
    console.log("📍 Location-aware news enabled: true");
    console.log("🤝 Sponsored puzzles enabled: true");
  });
}

if (require.main === module) startServer();

module.exports = {
  app,
  startServer,
  getLocationAwareNews,
  buildCachedHintsForText,
  buildHintForWord,
};
