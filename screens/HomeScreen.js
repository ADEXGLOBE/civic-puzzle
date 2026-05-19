import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { loadProgress, getLevelProgress } from "../utils/gameProgress";
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
  });

  useEffect(() => {
    const load = async () => {
      const p = await loadProgress();
      setProgress(p);
    };

    const unsubscribe = navigation.addListener("focus", load);
    load();
    return unsubscribe;
  }, [navigation]);

  const levelProgress = getLevelProgress(progress.xp);

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