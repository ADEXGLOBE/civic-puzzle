import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "civicPuzzle.progress.v2";

export const DEFAULT_PROGRESS = {
  coins: 340,
  xp: 0,
  level: 1,

  streak: 0,
  bestStreak: 0,

  lives: 5,
  maxLives: 5,

  totalSolved: 0,
  totalWrong: 0,
  totalHintsUsed: 0,

  lastPlayedDate: null,
  lastStreakDate: null,
  todayCompleted: 0,

  badges: [],
};

export async function loadProgress() {
  try {
    const raw = await AsyncStorage.getItem(KEY);

    if (!raw) return DEFAULT_PROGRESS;

    const parsed = JSON.parse(raw);

    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      level: calculateLevel(parsed.xp || 0),
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export async function saveProgress(progress) {
  const next = {
    ...DEFAULT_PROGRESS,
    ...progress,
    level: calculateLevel(progress.xp || 0),
  };

  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromKey(dateKey) {
  if (!dateKey) return null;

  const [y, m, d] = String(dateKey).split("-").map(Number);

  if (!y || !m || !d) return null;

  return new Date(y, m - 1, d);
}

export function isYesterday(lastDate) {
  const last = dateFromKey(lastDate);
  if (!last) return false;

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  return (
    last.getFullYear() === yesterday.getFullYear() &&
    last.getMonth() === yesterday.getMonth() &&
    last.getDate() === yesterday.getDate()
  );
}

export function isSameDay(lastDate) {
  const last = dateFromKey(lastDate);
  if (!last) return false;

  const now = new Date();

  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
}

export function calculateLevel(xp) {
  return Math.max(1, Math.floor((xp || 0) / 100) + 1);
}

export function getLevelProgress(xp) {
  const level = calculateLevel(xp || 0);
  const currentLevelBase = (level - 1) * 100;
  const nextLevelBase = level * 100;
  const progress = ((xp || 0) - currentLevelBase) / (nextLevelBase - currentLevelBase);

  return Math.max(0, Math.min(1, progress));
}

function addBadge(progress, badge) {
  if (!badge) return progress;

  const currentBadges = Array.isArray(progress.badges) ? progress.badges : [];

  if (currentBadges.includes(badge)) return progress;

  return {
    ...progress,
    badges: [...currentBadges, badge],
  };
}

function calculateStreak(current) {
  if (!current.lastStreakDate) return 1;
  if (isSameDay(current.lastStreakDate)) return current.streak || 1;
  if (isYesterday(current.lastStreakDate)) return (current.streak || 0) + 1;

  return 1;
}

function applyMilestoneBadges(progress) {
  let next = { ...progress };

  if (next.totalSolved >= 1) next = addBadge(next, "First Solve");
  if (next.totalSolved >= 10) next = addBadge(next, "10 Puzzle Solver");
  if (next.totalSolved >= 50) next = addBadge(next, "50 Puzzle Master");
  if (next.streak >= 3) next = addBadge(next, "3 Day Streak");
  if (next.streak >= 7) next = addBadge(next, "7 Day Streak");
  if (next.streak >= 30) next = addBadge(next, "30 Day Legend");
  if (next.xp >= 500) next = addBadge(next, "500 XP Club");

  return next;
}

export async function rewardCorrectAnswer() {
  const current = await loadProgress();
  const todayKey = getTodayKey();

  const streak = calculateStreak(current);
  const newXp = (current.xp || 0) + 20;
  const newTotalSolved = (current.totalSolved || 0) + 1;

  let next = {
    ...current,

    coins: (current.coins || 0) + 10,
    xp: newXp,
    level: calculateLevel(newXp),

    streak,
    bestStreak: Math.max(current.bestStreak || 0, streak),

    totalSolved: newTotalSolved,

    lastPlayedDate: todayKey,
    lastStreakDate: todayKey,

    todayCompleted: isSameDay(current.lastPlayedDate)
      ? (current.todayCompleted || 0) + 1
      : 1,

    lives: Math.min(current.maxLives || 5, (current.lives || 0) + 1),
  };

  next = applyMilestoneBadges(next);

  await saveProgress(next);
  return next;
}

export async function rewardPuzzleCompletion({ bonusCoins = 15, bonusXp = 30 } = {}) {
  const current = await loadProgress();
  const todayKey = getTodayKey();

  const streak = calculateStreak(current);
  const newXp = (current.xp || 0) + bonusXp;

  let next = {
    ...current,
    coins: (current.coins || 0) + bonusCoins,
    xp: newXp,
    level: calculateLevel(newXp),

    streak,
    bestStreak: Math.max(current.bestStreak || 0, streak),

    totalSolved: (current.totalSolved || 0) + 1,

    lastPlayedDate: todayKey,
    lastStreakDate: todayKey,

    todayCompleted: isSameDay(current.lastPlayedDate)
      ? (current.todayCompleted || 0) + 1
      : 1,
  };

  next = applyMilestoneBadges(next);

  await saveProgress(next);
  return next;
}

export async function penalizeWrongAnswer() {
  const current = await loadProgress();

  const next = {
    ...current,
    lives: Math.max(0, (current.lives || 0) - 1),
    totalWrong: (current.totalWrong || 0) + 1,
  };

  await saveProgress(next);
  return next;
}

export async function spendCoins(amount = 20) {
  const current = await loadProgress();

  if ((current.coins || 0) < amount) {
    return {
      ok: false,
      progress: current,
    };
  }

  const next = {
    ...current,
    coins: Math.max(0, (current.coins || 0) - amount),
    totalHintsUsed: (current.totalHintsUsed || 0) + 1,
  };

  await saveProgress(next);

  return {
    ok: true,
    progress: next,
  };
}

export async function restoreLife() {
  const current = await loadProgress();

  const next = {
    ...current,
    lives: Math.min(current.maxLives || 5, (current.lives || 0) + 1),
  };

  await saveProgress(next);
  return next;
}

export async function resetLivesIfNeeded() {
  const current = await loadProgress();

  const next = {
    ...current,
    level: calculateLevel(current.xp || 0),
    lives: current.lives <= 0 ? current.maxLives || 5 : current.lives,
  };

  await saveProgress(next);
  return next;
}

export async function resetProgressForTesting() {
  await AsyncStorage.removeItem(KEY);
  return DEFAULT_PROGRESS;
}