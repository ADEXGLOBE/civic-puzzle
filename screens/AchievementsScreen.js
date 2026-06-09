import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  loadProgress,
  getAvailableAchievements,
  claimAchievementReward,
  getLevelProgress,
} from "../utils/gameProgress";

export default function AchievementsScreen({ navigation }) {
  const [progress, setProgress] = useState(null);
  const [achievements, setAchievements] = useState([]);

  const load = async () => {
    const p = await loadProgress();
    setProgress(p);
    setAchievements(getAvailableAchievements(p));
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    load();
    return unsubscribe;
  }, [navigation]);

  const claimReward = async (id) => {
    const result = await claimAchievementReward(id);

    setProgress(result.progress);
    setAchievements(getAvailableAchievements(result.progress));

    Alert.alert(
      result.ok ? "Achievement Claimed 🏆" : "Achievement",
      result.message
    );
  };

  const unlocked = achievements.filter((a) => a.unlocked).length;
  const claimable = achievements.filter((a) => a.unlocked && !a.claimed).length;
  const levelProgress = getLevelProgress(progress?.xp || 0);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Achievements</Text>
          <Text style={styles.subtitle}>
            {unlocked}/{achievements.length} unlocked • {claimable} ready to claim
          </Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTop}>
          <Text style={styles.summaryTitle}>Player Progress</Text>
          <Text style={styles.summaryLevel}>Lv {progress?.level || 1}</Text>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${levelProgress * 100}%` }]} />
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.stat}>🪙 {progress?.coins || 0}</Text>
          <Text style={styles.stat}>🔥 {progress?.streak || 0}</Text>
          <Text style={styles.stat}>🧩 {progress?.totalSolved || 0}</Text>
          <Text style={styles.stat}>💡 {progress?.totalHintsUsed || 0}</Text>
        </View>
      </View>

      <FlatList
        data={achievements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const locked = !item.unlocked;
          const claimableItem = item.unlocked && !item.claimed;

          return (
            <View
              style={[
                styles.card,
                item.claimed && styles.cardClaimed,
                locked && styles.cardLocked,
              ]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.icon}>
                  {item.claimed ? "✅" : item.unlocked ? "🏆" : "🔒"}
                </Text>

                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.title}</Text>
                  <Text style={styles.reward}>
                    +{item.rewardCoins} coins • +{item.rewardXp} XP
                  </Text>
                </View>
              </View>

              <Text style={styles.status}>
                {item.claimed
                  ? "Reward claimed"
                  : item.unlocked
                  ? "Unlocked — claim your reward"
                  : "Locked — keep playing to unlock"}
              </Text>

              {claimableItem ? (
                <TouchableOpacity
                  style={styles.claimBtn}
                  onPress={() => claimReward(item.id)}
                >
                  <Text style={styles.claimBtnText}>Claim Reward</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#09101d",
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
  },

  backText: {
    color: "#ffffff",
    fontSize: 34,
    lineHeight: 34,
  },

  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
  },

  subtitle: {
    color: "#9fb0c7",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },

  summaryCard: {
    backgroundColor: "rgba(127,90,240,0.14)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(127,90,240,0.28)",
  },

  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  summaryTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },

  summaryLevel: {
    color: "#a8eb63",
    fontSize: 16,
    fontWeight: "900",
  },

  progressBar: {
    height: 10,
    backgroundColor: "#1f2937",
    borderRadius: 999,
    overflow: "hidden",
    marginBottom: 12,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#a8eb63",
  },

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  stat: {
    color: "#ffffff",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    fontWeight: "900",
  },

  list: {
    paddingBottom: 34,
  },

  card: {
    backgroundColor: "rgba(10,16,26,0.96)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(184,242,123,0.14)",
  },

  cardClaimed: {
    borderColor: "rgba(168,235,99,0.35)",
  },

  cardLocked: {
    opacity: 0.72,
    borderColor: "rgba(148,163,184,0.12)",
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  icon: {
    fontSize: 28,
    marginRight: 12,
  },

  name: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },

  reward: {
    color: "#c7d2e1",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },

  status: {
    color: "#9fb0c7",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },

  claimBtn: {
    backgroundColor: "#a8eb63",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
  },

  claimBtnText: {
    color: "#071018",
    fontSize: 15,
    fontWeight: "900",
  },
});