require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const cheerio = require("cheerio");

let OpenAI = null;
let openai = null;

try {
  OpenAI = require("openai");
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch {
  console.log("OpenAI SDK not installed. Intelligent AI hints will use fallback mode.");
}

const app = express();
const port = Number(process.env.PORT || 5000);

const DATA_FILE = path.join(__dirname, "headlines.json");
const LEADERBOARD_FILE = path.join(__dirname, "leaderboard.json");
const CONFIG_FILE = path.join(__dirname, "config.json");
const HINT_CACHE_FILE = path.join(__dirname, "hintCache.json");

const ADMIN_TOKEN = (process.env.ADMIN_TOKEN || "").trim();

const AI_HINTS_ENABLED =
  String(process.env.AI_HINTS_ENABLED || "false").toLowerCase() === "true";

const OPENAI_HINT_MODEL = process.env.OPENAI_HINT_MODEL || "gpt-5.5";

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
let hintCache = loadJsonSafe(HINT_CACHE_FILE, {});

function saveConfig() {
  saveJsonSafe(CONFIG_FILE, appConfig);
}

function saveHintCache() {
  saveJsonSafe(HINT_CACHE_FILE, hintCache);
}

function requireAdmin(req) {
  const auth = req.headers["authorization"] || "";
  if (!ADMIN_TOKEN) return auth === "Bearer puzzleMaster123";
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

function makeHintFromHeadline(headline) {
  const words = String(headline || "").split(/\s+/).filter(Boolean);
  if (words.length <= 2) return "Solve the headline one word at a time.";
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

  if (!res.ok) throw new Error(`Could not fetch URL (${res.status})`);
  return await res.text();
}

function parseJsonFeed(text) {
  try {
    const json = JSON.parse(text);
    if (!Array.isArray(json)) return [];

    return json
      .map((item) => {
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
      $(el).find("summary").first().text() || $(el).find("content").first().text()
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
  if (cached && Date.now() - cached.ts < 10 * 60 * 1000) return cached.items;

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

// ---------- Intelligent Hints ----------

function cleanAnswerWord(word) {
  return String(word || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
}

function guessCategory(word) {
  const transport = ["SHIP", "ROAD", "TRAIN", "AIRPORT", "BUS", "CAR", "PORT", "PLANE", "TRUCK", "RAIL"];
  const finance = ["BANK", "MARKET", "MONEY", "PRICE", "PRICES", "ECONOMY", "OIL", "GAS", "TRADE", "STOCK"];
  const politics = ["VOTE", "GOVERNMENT", "COURT", "LAW", "PRESIDENT", "MINISTER", "SENATE", "ELECTION"];
  const health = ["HEALTH", "HOSPITAL", "DOCTOR", "CARE", "MEDICAL", "VIRUS", "CLINIC"];
  const emergency = ["FIRE", "FLOOD", "POLICE", "STORM", "CRISIS", "ATTACK", "RESCUE"];
  const sport = ["TEAM", "MATCH", "GOAL", "PLAYER", "LEAGUE", "FOOTBALL", "TENNIS"];
  const tech = ["AI", "TECH", "APP", "DATA", "CYBER", "ROBOT", "DIGITAL"];

  if (transport.includes(word)) return "Transportation";
  if (finance.includes(word)) return "Finance / Economy";
  if (politics.includes(word)) return "Politics / Government";
  if (health.includes(word)) return "Health";
  if (emergency.includes(word)) return "Emergency / Public Safety";
  if (sport.includes(word)) return "Sports";
  if (tech.includes(word)) return "Technology";
  return "News";
}

function localSemanticClue(word) {
  const dictionary = {
    SHIP: "Something that moves on water",
    BOAT: "Small vessel used on water",
    BANK: "Place where money is kept",
    ROAD: "A path vehicles travel on",
    CITY: "Large populated area",
    COURT: "Place where legal cases are heard",
    POLICE: "Law enforcement group",
    SCHOOL: "Place for learning",
    MARKET: "Place where goods are traded",
    HEALTH: "State of physical wellbeing",
    WATER: "Liquid essential for life",
    POWER: "Energy used to run things",
    TRAIN: "Vehicle that runs on rails",
    AIRPORT: "Place where planes land",
    FARM: "Land used to grow food",
    OIL: "Fuel-related natural resource",
    GAS: "Fuel used for energy",
    VOTE: "Choice made in an election",
    FLOOD: "Too much water covering land",
    FIRE: "Flames and heat",
    TEAM: "Group working or playing together",
    APP: "Software used on a device",
    DATA: "Information used by computers",
  };

  return dictionary[word] || "A key word from today’s news";
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
  }
  return null;
}

function fallbackHintPackage(word, context = "") {
  const upper = cleanAnswerWord(word);
  const startsWith = upper.slice(0, Math.min(2, upper.length));
  const categoryHint = guessCategory(upper);
  const clue = localSemanticClue(upper);

  return {
    word: upper,
    categoryHint,
    startsWith,
    answerLength: upper.length,
    clue,
    contextHint: context ? "This word appears in today’s news context" : "This word is linked to the puzzle context",
    revealPattern: buildRevealPattern(upper, 1),
  };
}

function buildRevealPattern(word, count = 1) {
  const upper = cleanAnswerWord(word);
  if (!upper) return "";

  const shown = new Set([0]);
  if (count >= 2 && upper.length > 2) shown.add(Math.floor(upper.length / 2));
  if (count >= 3 && upper.length > 3) shown.add(upper.length - 1);

  return upper
    .split("")
    .map((ch, i) => (shown.has(i) ? ch : "_"))
    .join(" ");
}

async function generateIntelligentHintPackage(word, context = "") {
  const upper = cleanAnswerWord(word);
  if (!upper) return fallbackHintPackage(word, context);

  const contextShort = cleanText(context).slice(0, 240);
  const cacheKey = `${upper}:${contextShort}`;

  if (hintCache[cacheKey]) return hintCache[cacheKey];

  if (!AI_HINTS_ENABLED || !openai) {
    const fallback = fallbackHintPackage(upper, contextShort);
    hintCache[cacheKey] = fallback;
    saveHintCache();
    return fallback;
  }

  try {
    const response = await openai.responses.create({
      model: OPENAI_HINT_MODEL,
      instructions:
        "You create short, fair puzzle hints for news-word games. Do not reveal the answer directly in the clue. Return valid JSON only with keys: categoryHint, clue, contextHint. categoryHint must be 1-3 words. clue must be under 10 words. contextHint must be under 12 words.",
      input: `Answer: ${upper}\nNews context: ${contextShort}`,
    });

    const parsed = safeJsonParse(response.output_text);
    const fallback = fallbackHintPackage(upper, contextShort);

    const result = {
      word: upper,
      categoryHint: cleanText(parsed?.categoryHint || fallback.categoryHint),
      startsWith: upper.slice(0, Math.min(2, upper.length)),
      answerLength: upper.length,
      clue: cleanText(parsed?.clue || fallback.clue),
      contextHint: cleanText(parsed?.contextHint || fallback.contextHint),
      revealPattern: buildRevealPattern(upper, 1),
    };

    if (result.clue.toUpperCase().includes(upper)) {
      result.clue = fallback.clue;
    }

    hintCache[cacheKey] = result;
    saveHintCache();
    return result;
  } catch (e) {
    console.log("AI hint failed:", e.message);
    const fallback = fallbackHintPackage(upper, contextShort);
    hintCache[cacheKey] = fallback;
    saveHintCache();
    return fallback;
  }
}

async function buildProgressiveHintsForText(text) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);

  const packages = [];

  for (const word of words) {
    const clean = cleanAnswerWord(word);
    if (!clean) continue;
    packages.push(await generateIntelligentHintPackage(clean, text));
  }

  return packages;
}

// ---------- Crossword generation ----------

function getCandidateWords(text) {
  const stopWords = new Set([
    "THE", "AND", "FOR", "WITH", "FROM", "THIS", "THAT", "HAVE", "HAS",
    "WILL", "ARE", "WAS", "WERE", "YOU", "YOUR", "OUR", "NEW", "NEWS",
    "TODAY", "SAYS", "SAID", "INTO", "OVER", "AFTER", "BEFORE", "A", "AN",
    "OF", "TO", "IN", "ON", "AT", "BY", "AS", "IS", "BE", "IT",
  ]);

  return String(text || "")
    .split(/\s+/)
    .map(cleanAnswerWord)
    .filter((w) => w.length >= 3 && w.length <= 10 && !stopWords.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i)
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
    const slot = slots.find((s) => !s.used && canPlaceWord(grid, word, s.row, s.col, s.direction));
    if (!slot) continue;

    placeWord(grid, word, slot.row, slot.col, slot.direction);
    slot.used = true;

    const hints = await generateIntelligentHintPackage(word, text);

    entries.push({
      num,
      row: slot.row,
      col: slot.col,
      direction: slot.direction,
      answer: word,
      clue: hints.clue,
      progressiveHints: {
        categoryHint: hints.categoryHint,
        startsWith: hints.startsWith,
        answerLength: hints.answerLength,
        contextHint: hints.contextHint,
        revealPattern: hints.revealPattern,
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
    subtitle: sourceType === "headline" ? "Built from today’s headline" : "Built from today’s fact",
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
    const cw = await buildAutoCrossword({
      id: `${item.isFact ? "fact" : "headline"}-${index}`,
      title: item.isFact ? `News Fact Crossword #${index + 1}` : `Headline Crossword #${index + 1}`,
      sourceType: item.isFact ? "fact" : "headline",
      text: item.summary || item.headline,
      readMoreUrl: item.readMoreUrl || "",
    });

    if (cw.entries.length > 0) crosswords.push(cw);
  }

  return crosswords;
}

// ---------- Config Routes ----------

app.get("/api/config", (req, res) => {
  res.json({ feedUrlEnabled: Boolean(appConfig.feedUrl), aiHintsEnabled: AI_HINTS_ENABLED });
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

  res.json({ ok: true, feedUrl: appConfig.feedUrl });
});

// ---------- Puzzle Routes ----------

app.get("/api/puzzles", async (req, res) => {
  try {
    const city = String(req.query.city || "Ballarat").trim();
    const sourceUrl = normalizeUrl(appConfig.feedUrl || "");
    const items = sourceUrl ? await getNewsItemsFromUrl(sourceUrl) : getStoredHeadlines();

    const puzzles = [];

    for (const h of items) {
      puzzles.push({
        puzzle: scrambleSentence(h.headline),
        answer: h.headline,
        readMoreUrl: h.readMoreUrl || "",
        hint: h.hint || makeHintFromHeadline(h.headline),
        city,
        progressiveHints: await buildProgressiveHintsForText(h.headline),
      });
    }

    res.json(puzzles);
  } catch (e) {
    console.log("Puzzle generation failed:", e.message);
    res.status(500).json({ error: "Failed to generate puzzles" });
  }
});

app.get("/api/facts", async (req, res) => {
  try {
    const sourceUrl = normalizeUrl(appConfig.feedUrl || "");

    if (sourceUrl) {
      const items = await getNewsItemsFromUrl(sourceUrl);
      return res.json(
        items.map((item, index) => ({
          text: item.summary || item.headline,
          readMoreUrl: item.readMoreUrl,
          hint: `Fact challenge #${index + 1}`,
        }))
      );
    }

    res.json(store.facts || []);
  } catch {
    res.status(500).json({ error: "Failed to load facts" });
  }
});

app.get("/api/crosswords", async (req, res) => {
  try {
    const crosswords = await buildCrosswords();
    res.json([...(crosswords || []), ...(store.crosswords || [])]);
  } catch (e) {
    console.log("Crossword generation failed:", e.message);
    res.status(500).json({ error: "Failed to generate crosswords" });
  }
});

// ---------- Manual Uploads ----------

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
    saveJsonSafe(DATA_FILE, store);
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
    saveJsonSafe(DATA_FILE, store);
  }

  res.json({ ok: true, count: store.facts.length });
});

// ---------- Leaderboard ----------

app.get("/api/leaderboard", (req, res) => {
  const city = String(req.query.city || "Ballarat").trim();
  const rows = (leaderboard.cities[city] || [])
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 30);

  res.json(rows);
});

app.post("/api/leaderboard", (req, res) => {
  const { city = "Ballarat", playerName = "Player", score = 0, mode = "news" } = req.body || {};

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
  console.log(`🧠 AI hints enabled: ${AI_HINTS_ENABLED && Boolean(openai)}`);
});