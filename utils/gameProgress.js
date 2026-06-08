import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "civicPuzzle.progress.v3";

export const DAILY_REWARDS = [
  { day: 1, coins: 25, xp: 5, label: "Day 1 Reward" },
  { day: 2, coins: 40, xp: 10, label: "Day 2 Reward" },
  { day: 3, coins: 60, xp: 15, label: "Day 3 Reward" },
  { day: 4, coins: 80, xp: 20, label: "Day 4 Reward" },
  { day: 5, coins: 100, xp: 25, label: "Day 5 Reward" },
  { day: 6, coins: 150, xp: 30, label: "Day 6 Reward" },
  { day: 7, coins: 250, xp: 50, label: "7 Day Bonus" },
];

export const ACHIEVEMENTS = [
  { id: "first_solve", title: "First Solve", rewardCoins: 50, rewardXp: 20 },
  { id: "ten_solver", title: "10 Puzzle Solver", rewardCoins: 100, rewardXp: 50 },
  { id: "fifty_master", title: "50 Puzzle Master", rewardCoins: 300, rewardXp: 100 },
  { id: "three_day_streak", title: "3 Day Streak", rewardCoins: 75, rewardXp: 30 },
  { id: "seven_day_streak", title: "7 Day Streak", rewardCoins: 200, rewardXp: 80 },
  { id: "dictionary_master", title: "Dictionary Master", rewardCoins: 150, rewardXp: 60 },
  { id: "xp_club", title: "500 XP Club", rewardCoins: 200, rewardXp: 100 },
];

export const DEFAULT_PROGRESS = {
  coins: 340,
  xp: 0,
  level: 1,

  streak: 0,
  bestStreak: 0,

  dailyRewardStreak: 0,
  lastDailyRewardDate: null,

  lives: 5,
  maxLives: 5,

  totalSolved: 0,
  totalWrong: 0,
  totalHintsUsed: 0,

  lastPlayedDate: null,
  lastStreakDate: null,
  todayCompleted: 0,

  badges: [],
  claimedAchievements: [],
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
  if (next.totalHintsUsed >= 10) next = addBadge(next, "Dictionary Master");
  if (next.xp >= 500) next = addBadge(next, "500 XP Club");

  return next;
}

export function getDailyRewardStatus(progress) {
  const today = getTodayKey();

  if (progress.lastDailyRewardDate === today) {
    return {
      available: false,
      alreadyClaimed: true,
      currentDay: progress.dailyRewardStreak || 1,
      reward: null,
    };
  }

  const continues = isYesterday(progress.lastDailyRewardDate);
  const nextStreak = continues ? (progress.dailyRewardStreak || 0) + 1 : 1;
  const rewardIndex = ((nextStreak - 1) % DAILY_REWARDS.length);
  const reward = DAILY_REWARDS[rewardIndex];

  return {
    available: true,
    alreadyClaimed: false,
    currentDay: nextStreak,
    reward,
  };
}

export async function claimDailyReward() {
  const current = await loadProgress();
  const status = getDailyRewardStatus(current);

  if (!status.available || !status.reward) {
    return {
      ok: false,
      progress: current,
      message: "Daily reward already claimed.",
      reward: null,
    };
  }

  const today = getTodayKey();
  const reward = status.reward;
  const newXp = (current.xp || 0) + reward.xp;

  let next = {
    ...current,
    coins: (current.coins || 0) + reward.coins,
    xp: newXp,
    level: calculateLevel(newXp),
    dailyRewardStreak: status.currentDay,
    lastDailyRewardDate: today,
  };

  if (status.currentDay >= 7) {
    next = addBadge(next, "7 Day Reward Claim");
  }

  next = applyMilestoneBadges(next);

  await saveProgress(next);

  return {
    ok: true,
    progress: next,
    reward,
    message: `Claimed ${reward.coins} coins and ${reward.xp} XP.`,
  };
}

export function getAvailableAchievements(progress) {
  const claimed = Array.isArray(progress.claimedAchievements)
    ? progress.claimedAchievements
    : [];

  const checks = [
    {
      id: "first_solve",
      unlocked: (progress.totalSolved || 0) >= 1,
    },
    {
      id: "ten_solver",
      unlocked: (progress.totalSolved || 0) >= 10,
    },
    {
      id: "fifty_master",
      unlocked: (progress.totalSolved || 0) >= 50,
    },
    {
      id: "three_day_streak",
      unlocked: (progress.streak || 0) >= 3,
    },
    {
      id: "seven_day_streak",
      unlocked: (progress.streak || 0) >= 7,
    },
    {
      id: "dictionary_master",
      unlocked: (progress.totalHintsUsed || 0) >= 10,
    },
    {
      id: "xp_club",
      unlocked: (progress.xp || 0) >= 500,
    },
  ];

  return ACHIEVEMENTS.map((achievement) => {
    const check = checks.find((c) => c.id === achievement.id);

    return {
      ...achievement,
      unlocked: Boolean(check?.unlocked),
      claimed: claimed.includes(achievement.id),
    };
  });
}

export async function claimAchievementReward(achievementId) {
  const current = await loadProgress();
  const available = getAvailableAchievements(current);
  const achievement = available.find((a) => a.id === achievementId);

  if (!achievement) {
    return {
      ok: false,
      progress: current,
      message: "Achievement not found.",
    };
  }

  if (!achievement.unlocked) {
    return {
      ok: false,
      progress: current,
      message: "Achievement not unlocked yet.",
    };
  }

  if (achievement.claimed) {
    return {
      ok: false,
      progress: current,
      message: "Achievement reward already claimed.",
    };
  }

  const newXp = (current.xp || 0) + achievement.rewardXp;

  let next = {
    ...current,
    coins: (current.coins || 0) + achievement.rewardCoins,
    xp: newXp,
    level: calculateLevel(newXp),
    claimedAchievements: [
      ...(Array.isArray(current.claimedAchievements) ? current.claimedAchievements : []),
      achievement.id,
    ],
  };

  next = addBadge(next, achievement.title);
  next = applyMilestoneBadges(next);

  await saveProgress(next);

  return {
    ok: true,
    progress: next,
    achievement,
    message: `Claimed ${achievement.rewardCoins} coins and ${achievement.rewardXp} XP.`,
  };
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

  let next = {
    ...current,
    coins: Math.max(0, (current.coins || 0) - amount),
    totalHintsUsed: (current.totalHintsUsed || 0) + 1,
  };

  next = applyMilestoneBadges(next);

  await saveProgress(next);

  return {
    ok: true,
    progress: next,
  };
}

export async function addCoins(amount = 50) {
  const current = await loadProgress();

  const next = {
    ...current,
    coins: (current.coins || 0) + amount,
  };

  await saveProgress(next);
  return next;
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