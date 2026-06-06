const fs = require("fs");
const path = require("path");

const CACHE_FILE = path.join(__dirname, "dictionaryCache.json");

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

let dictionaryCache = loadJsonSafe(CACHE_FILE, {});

function cleanWord(word = "") {
  return String(word)
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .trim();
}

function cleanDefinition(text = "") {
  return String(text)
    .replace(/\s+/g, " ")
    .replace(/^the\s+/i, "")
    .trim();
}

function startsWithHint(word) {
  const clean = cleanWord(word).toUpperCase();
  if (!clean) return "";
  return clean.length <= 3 ? clean[0] : clean.slice(0, 2);
}

function revealPattern(word) {
  const clean = cleanWord(word).toUpperCase();
  if (!clean) return "";

  if (clean.length <= 2) {
    return `${clean[0]}${"_".repeat(clean.length - 1)}`;
  }

  return clean
    .split("")
    .map((letter, index) => {
      if (index === 0 || index === clean.length - 1) return letter;
      return "_";
    })
    .join(" ");
}

function fallbackMeaning(word, category = "news") {
  const clean = cleanWord(word);

  if (!clean) return "A word connected to this puzzle.";

  if (category === "crossword") {
    return "A word used as an answer in this crossword puzzle.";
  }

  if (category === "facts") {
    return "A key word connected to this quick fact.";
  }

  return "A key word connected to today’s news story.";
}

async function fetchLiveDefinition(word) {
  const clean = cleanWord(word);
  if (!clean || clean.length < 3) return null;

  if (dictionaryCache[clean]) {
    return dictionaryCache[clean];
  }

  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(clean)}`;
    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();

    const firstDefinition =
      data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition ||
      data?.[0]?.meanings?.[1]?.definitions?.[0]?.definition ||
      "";

    const partOfSpeech = data?.[0]?.meanings?.[0]?.partOfSpeech || "";

    if (!firstDefinition) return null;

    const result = {
      meaning: cleanDefinition(firstDefinition),
      partOfSpeech,
      source: "live-dictionary",
      fetchedAt: Date.now(),
    };

    dictionaryCache[clean] = result;
    saveJsonSafe(CACHE_FILE, dictionaryCache);

    return result;
  } catch (error) {
    console.log("Live dictionary lookup failed:", clean, error.message);
    return null;
  }
}

async function buildDictionaryHint(word, category = "news") {
  const clean = cleanWord(word).toUpperCase();
  const live = await fetchLiveDefinition(clean);

  const meaning = live?.meaning || fallbackMeaning(clean, category);

  return {
    word: clean,
    categoryHint: live?.partOfSpeech || category,
    meaning,
    clue: meaning,
    contextHint: `Dictionary meaning for this ${category} word`,
    startsWith: startsWithHint(clean),
    answerLength: clean.length,
    revealPattern: revealPattern(clean),
    source: live?.source || "fallback",
  };
}

async function buildHintsForSentence(sentence = "", category = "news") {
  const words = String(sentence)
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ""))
    .filter((w) => w.length >= 3);

  const uniqueWords = [...new Set(words.map((w) => w.toUpperCase()))];

  const hints = [];

  for (const word of uniqueWords) {
    hints.push(await buildDictionaryHint(word, category));
  }

  return hints;
}

module.exports = {
  buildDictionaryHint,
  buildHintsForSentence,
};