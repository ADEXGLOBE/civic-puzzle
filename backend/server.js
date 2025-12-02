// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 5000;
const DATA_FILE = path.join(__dirname, 'headlines.json');

app.use(cors());
app.use(bodyParser.json());

// 👉 Serve static files (admin.html, etc.) from /public
app.use(express.static(path.join(__dirname, 'public')));


/**
 * Store shape:
 * {
 *   "weeks": { "2025-W48": [ { headline, readMoreUrl, hint } ] },
 *   "facts": [ { text, readMoreUrl, hint } ],
 *   "crosswords": [ { id, title, headline, readMoreUrl, hint } ]
 * }
 */
let store = { weeks: {}, facts: [], crosswords: [] };

if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (Array.isArray(raw)) {
      // old format: simple array of headlines
      const wk = getCurrentWeekKey();
      store.weeks[wk] = raw.filter(Boolean).map(h => ({
        headline: h,
        readMoreUrl: '',
        hint: makeHintFromHeadline(h),
      }));
    } else {
      store = {
        weeks: raw.weeks || {},
        facts: raw.facts || [],
        crosswords: raw.crosswords || [],
      };
    }
  } catch (e) {
    console.error('Failed to parse data file, starting empty:', e);
  }
}

function save() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

// ---- Helpers --------------------------------------------------

function getCurrentWeekKey() {
  const now = new Date();
  const year = now.getFullYear();
  const dt = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, '0')}`;
}

function scrambleSentence(s) {
  return s
    .split(' ')
    .map(w =>
      w
        .split('')
        .sort(() => Math.random() - 0.5)
        .join('')
    )
    .join(' ');
}

function makeHintFromHeadline(text) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  const first = words[0];
  const last = words[words.length - 1];
  return `Starts with “${first}” and ends with “${last}” (${words.length} words).`;
}

function cleanOldWeeks(keep = 5) {
  const keys = Object.keys(store.weeks).sort().reverse(); // newest first
  const keepSet = new Set(keys.slice(0, keep));
  for (const k of Object.keys(store.weeks)) {
    if (!keepSet.has(k)) delete store.weeks[k];
  }
}

// ---- Headlines (Wordle-style) --------------------------------

app.post('/api/headlines', (req, res) => {
  const auth = req.headers['authorization'];
  if (auth !== 'Bearer puzzleMaster123') {
    return res.status(401).send('Unauthorized');
  }

  const { headline, readMoreUrl = '', hint } = req.body || {};
  if (!headline || typeof headline !== 'string') {
    return res.status(400).send('Headline is required');
  }

  const cleanHeadline = headline.trim();
  const wk = getCurrentWeekKey();
  if (!store.weeks[wk]) store.weeks[wk] = [];

  const exists = store.weeks[wk].some(h => h.headline === cleanHeadline);
  if (exists) return res.status(409).send('Duplicate headline for this week');

  store.weeks[wk].push({
    headline: cleanHeadline,
    readMoreUrl: (readMoreUrl || '').trim(),
    hint: hint && hint.trim() ? hint.trim() : makeHintFromHeadline(cleanHeadline),
  });

  cleanOldWeeks();
  save();
  res.send('Headline added');
});

app.get('/api/puzzles', (req, res) => {
  const wk = getCurrentWeekKey();
  const weekHeadlines = store.weeks[wk] || [];
  const puzzles = weekHeadlines.map(h => ({
    puzzle: scrambleSentence(h.headline),
    answer: h.headline,
    readMoreUrl: h.readMoreUrl || '',
    hint: h.hint || makeHintFromHeadline(h.headline),
  }));
  res.json(puzzles);
});

// ---- Facts Mode -----------------------------------------------

app.post('/api/facts', (req, res) => {
  const auth = req.headers['authorization'];
  if (auth !== 'Bearer puzzleMaster123') {
    return res.status(401).send('Unauthorized');
  }

  const { text, readMoreUrl = '', hint } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).send('Fact text is required');
  }

  const cleanText = text.trim();
  const exists = store.facts.some(f => f.text === cleanText);
  if (exists) return res.status(409).send('Duplicate fact');

  store.facts.push({
    text: cleanText,
    readMoreUrl: (readMoreUrl || '').trim(),
    hint: hint && hint.trim() ? hint.trim() : makeHintFromHeadline(cleanText),
  });

  save();
  res.send('Fact added');
});

app.get('/api/facts', (req, res) => {
  const facts = store.facts.map(f => ({
    puzzle: scrambleSentence(f.text),
    answer: f.text,
    readMoreUrl: f.readMoreUrl || '',
    hint: f.hint || makeHintFromHeadline(f.text),
  }));
  res.json(facts);
});

// ---- Crosswords -----------------------------------------------
// For now: simple metadata. Crossword grid/logic stays on frontend.

app.post('/api/crosswords', (req, res) => {
  const auth = req.headers['authorization'];
  if (auth !== 'Bearer puzzleMaster123') {
    return res.status(401).send('Unauthorized');
  }

  const { title, headline, readMoreUrl = '', hint } = req.body || {};
  if (!title || !headline) {
    return res.status(400).send('title and headline are required');
  }

  const id = `cw-${Date.now()}`;
  store.crosswords.push({
    id,
    title: title.trim(),
    headline: headline.trim(),
    readMoreUrl: (readMoreUrl || '').trim(),
    hint: hint && hint.trim() ? hint.trim() : makeHintFromHeadline(headline),
  });

  save();
  res.send('Crossword added');
});

app.get('/api/crosswords', (req, res) => {
  res.json(store.crosswords || []);
});

// ---- Start ----------------------------------------------------

app.listen(port, () => {
  console.log(`✅ Civic Puzzle backend running on http://localhost:${port}`);
});
