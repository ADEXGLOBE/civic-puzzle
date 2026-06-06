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

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

function defaultStore() {
  return { weeks: {}, facts: [], crosswords: [] };
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

function requireAdmin(req) {
  const auth = req.headers["authorization"] || "";

  if (!ADMIN_TOKEN) {
    return auth === "Bearer puzzleMaster123";
  }

  return auth === `Bearer ${ADMIN_TOKEN}`;
}

function getCurrentWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;

  d.setUTCDate(d.getUTCDate() + 4 - dayNum);

  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function cleanText(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeUrl(url) {
  const u = String(url || "").trim();

  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) return "";

  return u;
}

function cleanAnswerWord(word) {
  return String(word || "")
    .replace(/[^a-zA-Z]/g, "")
    .toUpperCase();
}

function makeHintFromHeadline(headline) {
  const words = String(headline || "").split(/\s+/).filter(Boolean);

  if (words.length <= 2) {
    return "Solve the headline one word at a time.";
  }

  return `Starts with: ${words[0]} • Ends with: ${words[words.length - 1]}`;
}

function scrambleSentence(sentence) {
  return String(sentence || "")
    .split(/\s+/)
    .filter(Boolean)
    .sort(() => Math.random() - 0.5)
    .join(" ");
}

function getStoredHeadlines() {
  const wk = getCurrentWeekKey();
  return store.weeks[wk] || [];
}

const sourceCache = new Map();

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "CivicPuzzleBot/1.0",
      Accept: "text/html,application/rss+xml,application/xml,application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Could not fetch URL (${res.status})`);
  }

  return await res.text();
}

function parseJsonFeed(text) {
  try {
    const json = JSON.parse(text);

    if (!Array.isArray(json)) return [];

    return json
      .map((item) => {
        if (typeof item === "string") {
          return {
            headline: cleanText(item),
            summary: "",
            readMoreUrl: "",
          };
        }

        const headline = cleanText(item.headline || item.title || item.text);

        if (!headline) return null;

        return {
          headline,
          summary: cleanText(item.summary || item.description || item.fact || ""),
          readMoreUrl: cleanText(item.readMoreUrl || item.url || item.link || ""),
          hint: cleanText(item.hint || ""),
        };
      })
      .filter(Boolean);
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
    const description = cleanText(
      $(el).find("summary").first().text() ||
        $(el).find("content").first().text()
    );

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

  if (cached && Date.now() - cached.ts < 10 * 60 * 1000) {
    return cached.items;
  }

  const text = await fetchText(url);

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
    .slice(0, 20);

  sourceCache.set(url, { ts: Date.now(), items });

  return items;
}

// ---------- LIVE DICTIONARY HINT SYSTEM ----------

const STOP_WORDS = new Set([
  "THE",
  "AND",
  "FOR",
  "WITH",
  "FROM",
  "THIS",
  "THAT",
  "HAVE",
  "HAS",
  "WILL",
  "ARE",
  "WAS",
  "WERE",
  "YOU",
  "YOUR",
  "OUR",
  "NEW",
  "NEWS",
  "TODAY",
  "SAYS",
  "SAID",
  "INTO",
  "OVER",
  "AFTER",
  "BEFORE",
  "THEN",
  "ALL",
  "SAME",
  "DAY",
  "CAN",
  "NOT",
  "BUT",
  "OUT",
  "ABOUT",
  "THEIR",
  "THEY",
  "THEM",
  "WHO",
  "WHAT",
  "WHEN",
  "WHERE",
  "WHY",
  "HOW",
  "A",
  "AN",
  "OF",
  "TO",
  "IN",
  "ON",
  "AT",
  "BY",
  "AS",
  "IS",
  "BE",
  "IT",
]);

function fallbackMeaning(word) {
  const local = {
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

  return local[word] || "A key word connected to today’s news story.";
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
    .map((letter, index) => {
      if (index === 0 || index === upper.length - 1) return letter;
      return "_";
    })
    .join(" ");
}

async function fetchLiveDictionaryMeaning(word) {
  const clean = cleanAnswerWord(word).toLowerCase();

  if (!clean || clean.length < 3) return null;

  if (dictionaryCache[clean]) {
    return dictionaryCache[clean];
  }

  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    const meanings = data?.[0]?.meanings || [];

    let selectedMeaning = meanings.find((m) => {
      const definition = m?.definitions?.[0]?.definition || "";
      return definition && !definition.toLowerCase().includes(clean);
    });

    if (!selectedMeaning) {
      selectedMeaning = meanings[0];
    }

    const definition = cleanText(selectedMeaning?.definitions?.[0]?.definition || "");
    const partOfSpeech = cleanText(selectedMeaning?.partOfSpeech || "");

    if (!definition) return null;

    const result = {
      definition,
      partOfSpeech,
      source: "live-dictionary",
      fetchedAt: Date.now(),
    };

    dictionaryCache[clean] = result;
    saveDictionaryCache();

    console.log(`📘 Dictionary success: ${clean} = ${definition}`);

    return result;
  } catch (error) {
    console.log(`📕 Dictionary failed for ${clean}: ${error.message}`);
    return null;
  }
}

async function buildHintForWord(word) {
  const upper = cleanAnswerWord(word);

  if (!upper) return null;

  const live = await fetchLiveDictionaryMeaning(upper);

  const meaning = live?.definition || fallbackMeaning(upper);
  const categoryHint = guessCategory(upper, live?.partOfSpeech || "");

  return {
    word: upper,
    categoryHint,
    startsWith: upper.slice(0, Math.min(2, upper.length)),
    answerLength: upper.length,
    clue: meaning,
    meaning,
    contextHint:
      live?.source === "live-dictionary"
        ? "Live dictionary meaning of this word."
        : "Fallback meaning for this news word.",
    revealPattern: buildRevealPattern(upper),
    source: live?.source || "fallback",
  };
}

async function buildProgressiveHintsForText(text) {
  const words = String(text || "")
    .split(/\s+/)
    .map(cleanAnswerWord)
    .filter((word) => word && word.length >= 3)
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word, index, arr) => arr.indexOf(word) === index)
    .slice(0, 8);

  const hints = [];

  for (const word of words) {
    const hint = await buildHintForWord(word);
    if (hint) hints.push(hint);
  }

  return hints;
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
    if (direction === "across") {
      grid[row][col + i] = word[i];
    } else {
      grid[row + i][col] = word[i];
    }
  }
}

async function buildAutoCrossword({ id, title, sourceType, text, readMoreUrl }) {
  const rows = 12;
  const cols = 12;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(null));
  const words = getCandidateWords(text);

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

  for (const word of words) {
    const slot = slots.find(
      (s) => !s.used && canPlaceWord(grid, word, s.row, s.col, s.direction)
    );

    if (!slot) continue;

    placeWord(grid, word, slot.row, slot.col, slot.direction);
    slot.used = true;

    const hint = await buildHintForWord(word);

    entries.push({
      num,
      row: slot.row,
      col: slot.col,
      direction: slot.direction,
      answer: word,
      clue: hint?.meaning || fallbackMeaning(word),
      progressiveHints: hint,
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
    subtitle:
      sourceType === "headline"
        ? "Built from today’s headline"
        : "Built from today’s fact",
    sourceType,
    revealText: text,
    readMoreUrl,
    size: { rows, cols },
    blocks,
    solution,
    entries,
    across: entries.filter((e) => e.direction === "across"),
    down: entries.filter((e) => e.direction === "down"),
  };
}

async function buildCrosswords() {
  const sourceUrl = normalizeUrl(appConfig.feedUrl || "");
  let items = [];

  if (sourceUrl) {
    items = await getNewsItemsFromUrl(sourceUrl);
  } else {
    const headlines = getStoredHeadlines().map((h) => ({
      headline: h.headline,
      summary: "",
      readMoreUrl: h.readMoreUrl || "",
    }));

    const facts = (store.facts || []).map((f) => ({
      headline: f.text,
      summary: f.text,
      readMoreUrl: f.readMoreUrl || "",
      isFact: true,
    }));

    items = [...headlines, ...facts];
  }

  const crosswords = [];

  for (let index = 0; index < items.length; index++) {
    const item = items[index];

    const crossword = await buildAutoCrossword({
      id: `${item.isFact ? "fact" : "headline"}-${index}`,
      title: item.isFact
        ? `News Fact Crossword #${index + 1}`
        : `Headline Crossword #${index + 1}`,
      sourceType: item.isFact ? "fact" : "headline",
      text: item.summary || item.headline,
      readMoreUrl: item.readMoreUrl || "",
    });

    if (crossword.entries.length > 0) {
      crosswords.push(crossword);
    }
  }

  return crosswords;
}

// ---------- ROUTES ----------

app.get("/api/config", (req, res) => {
  res.json({
    feedUrlEnabled: Boolean(appConfig.feedUrl),
    dictionaryHintsEnabled: true,
    aiHintsEnabled: false,
  });
});

app.get("/api/test-dictionary/:word", async (req, res) => {
  const word = cleanAnswerWord(req.params.word);
  const hint = await buildHintForWord(word);
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

  if (!cleanUrl) {
    return res.status(400).send("Invalid URL");
  }

  appConfig.feedUrl = cleanUrl;
  saveConfig();

  sourceCache.clear();

  res.json({ ok: true, feedUrl: appConfig.feedUrl });
});

app.get("/api/puzzles", async (req, res) => {
  try {
    const city = String(req.query.city || "Ballarat").trim();
    const sourceUrl = normalizeUrl(appConfig.feedUrl || "");
    const items = sourceUrl ? await getNewsItemsFromUrl(sourceUrl) : getStoredHeadlines();

    const puzzles = [];

    for (const h of items) {
      const headline = cleanText(h.headline);

      puzzles.push({
        puzzle: scrambleSentence(headline),
        answer: headline,
        readMoreUrl: h.readMoreUrl || "",
        hint: h.hint || makeHintFromHeadline(headline),
        city,
        progressiveHints: await buildProgressiveHintsForText(headline),
      });
    }

    res.json(puzzles);
  } catch (error) {
    console.log("Puzzle generation failed:", error.message);
    res.status(500).json({ error: "Failed to generate puzzles" });
  }
});

app.get("/api/facts", async (req, res) => {
  try {
    const sourceUrl = normalizeUrl(appConfig.feedUrl || "");

    if (sourceUrl) {
      const items = await getNewsItemsFromUrl(sourceUrl);
      const facts = [];

      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        const text = item.summary || item.headline;

        facts.push({
          text,
          readMoreUrl: item.readMoreUrl,
          hint: `Fact challenge #${index + 1}`,
          progressiveHints: await buildProgressiveHintsForText(text),
        });
      }

      return res.json(facts);
    }

    res.json(store.facts || []);
  } catch (error) {
    console.log("Facts failed:", error.message);
    res.status(500).json({ error: "Failed to load facts" });
  }
});

app.get("/api/crosswords", async (req, res) => {
  try {
    const crosswords = await buildCrosswords();
    res.json([...(crosswords || []), ...(store.crosswords || [])]);
  } catch (error) {
    console.log("Crossword generation failed:", error.message);
    res.status(500).json({ error: "Failed to generate crosswords" });
  }
});

app.post("/api/headlines", (req, res) => {
  if (!requireAdmin(req)) return res.status(401).send("Unauthorized");

  const { headline, readMoreUrl = "", hint } = req.body || {};

  if (!headline) {
    return res.status(400).send("Headline is required");
  }

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

    saveJsonSafe(DATA_FILE, store);
  }

  res.json({ ok: true, week: wk, count: store.weeks[wk].length });
});

app.post("/api/facts", (req, res) => {
  if (!requireAdmin(req)) return res.status(401).send("Unauthorized");

  const { text, readMoreUrl = "", hint } = req.body || {};

  if (!text) {
    return res.status(400).send("Fact text is required");
  }

  const clean = cleanText(text);
  const exists = store.facts.some((f) => f.text === clean);

  if (!exists) {
    store.facts.push({
      text: clean,
      readMoreUrl: normalizeUrl(readMoreUrl),
      hint: hint || `Think: ${clean.slice(0, 18)}...`,
    });

    saveJsonSafe(DATA_FILE, store);
  }

  res.json({ ok: true, count: store.facts.length });
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

app.listen(port, () => {
  console.log(`✅ Civic Puzzle backend running on port ${port}`);
  console.log("📘 Dictionary hints enabled: true");
  console.log("🧠 AI hints enabled: false");
});