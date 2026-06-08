import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import {
  loadProgress,
  getLevelProgress,
  getDailyRewardStatus,
  claimDailyReward,
  getAvailableAchievements,
  claimAchievementReward,
} from "../utils/gameProgress";
import AdRectangle from "../components/AdRectangle";

function getTodayLabel() {
  const now = new Date();
  return now.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function HomeScreen({ navigation }) {
  const todayLabel = useMemo(() => getTodayLabel(), []);

  const [progress, setProgress] = useState({
    coins: 340,
    streak: 0,
    lives: 5,
    level: 1,
    xp: 0,
    todayCompleted: 0,
    dailyRewardStreak: 0,
    badges: [],
    claimedAchievements: [],
  });

  const [dailyStatus, setDailyStatus] = useState(null);
  const [achievements, setAchievements] = useState([]);

  const refreshProgress = async () => {
    const p = await loadProgress();
    setProgress(p);
    setDailyStatus(getDailyRewardStatus(p));
    setAchievements(getAvailableAchievements(p));
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", refreshProgress);
    refreshProgress();
    return unsubscribe;
  }, [navigation]);

  const levelProgress = getLevelProgress(progress.xp);

  const handleClaimDailyReward = async () => {
    const result = await claimDailyReward();
    setProgress(result.progress);
    setDailyStatus(getDailyRewardStatus(result.progress));
    setAchievements(getAvailableAchievements(result.progress));

    Alert.alert(
      result.ok ? "Daily Reward Claimed 🎁" : "Already Claimed",
      result.message
    );
  };

  const handleClaimAchievement = async (achievementId) => {
    const result = await claimAchievementReward(achievementId);
    setProgress(result.progress);
    setDailyStatus(getDailyRewardStatus(result.progress));
    setAchievements(getAvailableAchievements(result.progress));

    Alert.alert(
      result.ok ? "Achievement Claimed 🏆" : "Achievement",
      result.message
    );
  };

  const unlockedAchievements = achievements.filter((a) => a.unlocked);
  const claimableAchievements = achievements.filter((a) => a.unlocked && !a.claimed);

  return (
    <ImageBackground
      source={require("../assets/news-bg.jpg")}
      resizeMode="cover"
      style={styles.bg}
    >
      <View style={styles.overlay} />

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.dateText}>{todayLabel}</Text>

          <Text style={styles.heroTitle}>Civic Puzzle</Text>

          <Text style={styles.heroSub}>
            Reveal today’s headline through daily word puzzles, streaks, XP, and rewards.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>🔥 {progress.streak}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>❤️ {progress.lives}</Text>
              <Text style={styles.statLabel}>Lives</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statValue}>🪙 {progress.coins}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
          </View>

          <View style={styles.levelCard}>
            <View style={styles.levelTop}>
              <Text style={styles.levelTitle}>Level {progress.level}</Text>
              <Text style={styles.levelXP}>{progress.xp} XP</Text>
            </View>

            <View style={styles.levelBar}>
              <View style={[styles.levelFill, { width: `${levelProgress * 100}%` }]} />
            </View>

            <Text style={styles.levelSub}>
              Today completed: {progress.todayCompleted}
            </Text>
          </View>

          <View style={styles.dailyCard}>
            <Text style={styles.dailyBadge}>🎁 Daily Reward</Text>

            {dailyStatus?.available ? (
              <>
                <Text style={styles.dailyTitle}>
                  Day {dailyStatus.currentDay} reward is ready
                </Text>
                <Text style={styles.dailySub}>
                  Claim {dailyStatus.reward?.coins} coins + {dailyStatus.reward?.xp} XP today.
                </Text>

                <TouchableOpacity style={styles.claimBtn} onPress={handleClaimDailyReward}>
                  <Text style={styles.claimBtnText}>Claim Daily Reward</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.dailyTitle}>Reward claimed today ✅</Text>
                <Text style={styles.dailySub}>
                  Come back tomorrow to continue your reward streak.
                </Text>
              </>
            )}
          </View>

          <View style={styles.widgetCard}>
            <View style={styles.widgetHead}>
              <Text style={styles.widgetBadge}>🔥 Daily Civic</Text>
              <Text style={styles.widgetProgress}>Today’s challenge</Text>
            </View>

            <Text style={styles.widgetPrompt}>
              Reveal what you should know today.
            </Text>

            <Text style={styles.widgetSub}>
              Solve the shuffled words to unlock the headline making news.
            </Text>

            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => navigation.navigate("LevelSelector")}
              activeOpacity={0.9}
            >
              <Text style={styles.startBtnText}>Reveal Today’s Headline</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.achievementCard}>
            <View style={styles.achievementTop}>
              <Text style={styles.achievementTitle}>🏆 Achievements</Text>
              <Text style={styles.achievementCount}>
                {unlockedAchievements.length}/{achievements.length}
              </Text>
            </View>

            {claimableAchievements.length > 0 ? (
              <>
                <Text style={styles.achievementSub}>
                  You have rewards ready to claim.
                </Text>

                {claimableAchievements.slice(0, 3).map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.achievementItem}
                    onPress={() => handleClaimAchievement(item.id)}
                  >
                    <View>
                      <Text style={styles.achievementName}>{item.title}</Text>
                      <Text style={styles.achievementReward}>
                        +{item.rewardCoins} coins • +{item.rewardXp} XP
                      </Text>
                    </View>
                    <Text style={styles.claimMini}>Claim</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text style={styles.achievementSub}>
                Keep playing to unlock more rewards.
              </Text>
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("LevelSelector")}
            >
              <Text style={styles.actionTitle}>Play Now</Text>
              <Text style={styles.actionSub}>
                Stay updated with the news making headlines
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("Leaderboard")}
            >
              <Text style={styles.actionTitle}>Leaderboard</Text>
              <Text style={styles.actionSub}>Track top players and local scores</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("Settings")}
            >
              <Text style={styles.actionTitle}>Settings</Text>
              <Text style={styles.actionSub}>Choose city, player name, and feed URL</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <AdRectangle />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#09101d" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(6,10,18,0.55)",
  },
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
  },
  dateText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "900",
    marginBottom: 8,
  },
  heroSub: {
    color: "#c6d4e7",
    fontSize: 18,
    lineHeight: 25,
    marginBottom: 22,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(12,18,30,0.9)",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(184,242,123,0.12)",
  },
  statValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  statLabel: {
    color: "#aebcd0",
    fontSize: 13,
    fontWeight: "700",
  },
  levelCard: {
    backgroundColor: "rgba(12,18,30,0.9)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(127,90,240,0.16)",
  },
  levelTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  levelTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
  },
  levelXP: {
    color: "#d8ffb0",
    fontSize: 15,
    fontWeight: "800",
  },
  levelBar: {
    height: 10,
    backgroundColor: "#1e293b",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 8,
  },
  levelFill: {
    height: "100%",
    backgroundColor: "#a8eb63",
    borderRadius: 999,
  },
  levelSub: {
    color: "#9eb0c8",
    fontSize: 13,
  },
  dailyCard: {
    backgroundColor: "rgba(127,90,240,0.18)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(127,90,240,0.4)",
  },
  dailyBadge: {
    color: "#d8ffb0",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  dailyTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  dailySub: {
    color: "#c7d2e1",
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 14,
  },
  claimBtn: {
    backgroundColor: "#a8eb63",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },
  claimBtnText: {
    color: "#071018",
    fontSize: 16,
    fontWeight: "900",
  },
  widgetCard: {
    backgroundColor: "rgba(8,12,18,0.9)",
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(184,242,123,0.14)",
    marginBottom: 18,
  },
  widgetHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  widgetBadge: {
    color: "#d8ffb0",
    fontSize: 15,
    fontWeight: "900",
  },
  widgetProgress: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  widgetPrompt: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 38,
    fontWeight: "900",
    marginBottom: 10,
  },
  widgetSub: {
    color: "#c3cfdd",
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 20,
  },
  startBtn: {
    backgroundColor: "#a8eb63",
    borderRadius: 22,
    paddingVertical: 18,
    alignItems: "center",
  },
  startBtnText: {
    color: "#071018",
    fontSize: 18,
    fontWeight: "900",
  },
  achievementCard: {
    backgroundColor: "rgba(10,18,30,0.9)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  achievementTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  achievementTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
  },
  achievementCount: {
    color: "#a8eb63",
    fontSize: 15,
    fontWeight: "900",
  },
  achievementSub: {
    color: "#b5c3d6",
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 10,
  },
  achievementItem: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 14,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  achievementName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
  achievementReward: {
    color: "#c7d2e1",
    fontSize: 13,
    marginTop: 3,
    fontWeight: "700",
  },
  claimMini: {
    color: "#a8eb63",
    fontSize: 14,
    fontWeight: "900",
  },
  actions: { gap: 12 },
  actionCard: {
    backgroundColor: "rgba(10,18,30,0.88)",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  actionTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 6,
  },
  actionSub: {
    color: "#b5c3d6",
    fontSize: 15,
    lineHeight: 21,
  },
});