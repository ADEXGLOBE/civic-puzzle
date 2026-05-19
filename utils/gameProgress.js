import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "civicPuzzle.progress.v1";

export const DEFAULT_PROGRESS = {
  coins: 340,
  xp: 0,
  level: 1,
  streak: 0,
  lives: 5,
  maxLives: 5,
  lastPlayedDate: null,
  lastStreakDate: null,
  todayCompleted: 0,
};

export async function loadProgress() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROGRESS;
    return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export async function saveProgress(progress) {
  await AsyncStorage.setItem(KEY, JSON.stringify(progress));
  return progress;
}

export function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isYesterday(lastDate) {
  if (!lastDate) return false;
  const last = new Date(lastDate);
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
  if (!lastDate) return false;
  const last = new Date(lastDate);
  const now = new Date();

  return (
    last.getFullYear() === now.getFullYear() &&
    last.getMonth() === now.getMonth() &&
    last.getDate() === now.getDate()
  );
}

export function calculateLevel(xp) {
  return Math.max(1, Math.floor(xp / 100) + 1);
}

export function getLevelProgress(xp) {
  const level = calculateLevel(xp);
  const currentLevelBase = (level - 1) * 100;
  const nextLevelBase = level * 100;
  const progress = (xp - currentLevelBase) / (nextLevelBase - currentLevelBase);
  return Math.max(0, Math.min(1, progress));
}

export async function rewardCorrectAnswer() {
  const current = await loadProgress();
  const todayKey = getTodayKey();

  let streak = current.streak;
  if (!current.lastStreakDate) {
    streak = 1;
  } else if (isSameDay(current.lastStreakDate)) {
    streak = current.streak;
  } else if (isYesterday(current.lastStreakDate)) {
    streak = current.streak + 1;
  } else {
    streak = 1;
  }

  const next = {
    ...current,
    coins: current.coins + 10,
    xp: current.xp + 20,
    level: calculateLevel(current.xp + 20),
    streak,
    lastPlayedDate: todayKey,
    lastStreakDate: todayKey,
    todayCompleted: isSameDay(current.lastPlayedDate)
      ? current.todayCompleted + 1
      : 1,
  };

  await saveProgress(next);
  return next;
}

export async function penalizeWrongAnswer() {
  const current = await loadProgress();
  const next = {
    ...current,
    lives: Math.max(0, current.lives - 1),
  };
  await saveProgress(next);
  return next;
}

export async function restoreLife() {
  const current = await loadProgress();
  const next = {
    ...current,
    lives: Math.min(current.maxLives, current.lives + 1),
  };
  await saveProgress(next);
  return next;
}

export async function resetLivesIfNeeded() {
  const current = await loadProgress();
  const next = {
    ...current,
    level: calculateLevel(current.xp),
  };
  await saveProgress(next);
  return next;
}