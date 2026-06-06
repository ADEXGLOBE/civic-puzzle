// screens/LeaderboardScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing, radius } from "../theme";
import { API_BASE_URL } from "../config";
import { loadSettings } from "./SettingsScreen";

export default function LeaderboardScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [city, setCity] = useState("Ballarat");

  const load = async () => {
    setLoading(true);

    try {
      const s = await loadSettings();
      const selectedCity = s.city || "Ballarat";
      setCity(selectedCity);

      const qs = new URLSearchParams();
      qs.set("city", selectedCity);

      const res = await fetch(`${API_BASE_URL}/api/leaderboard?${qs.toString()}`);
      const data = await res.json();

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Error", "Could not load leaderboard. Check API URL + server.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const getRankEmoji = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  const getModeLabel = (mode) => {
    if (mode === "facts") return "Quick Facts";
    if (mode === "crossword") return "Crossword";
    return "News Puzzle";
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
          activeOpacity={0.9}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🏆 Leaderboard</Text>
          <Text style={styles.subtitle}>{city} rankings</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.9}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Compete with local players</Text>
        <Text style={styles.infoText}>
          Solve news puzzles, quick facts and crosswords to climb the leaderboard.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Loading rankings…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, idx) => `${item.playerName}-${item.score}-${item.ts || idx}`}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={[styles.row, index < 3 && styles.topRow]}>
              <Text style={styles.rank}>{getRankEmoji(index)}</Text>

              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.playerName || "Player"}</Text>
                <Text style={styles.meta}>
                  {getModeLabel(item.mode)} •{" "}
                  {item.ts ? new Date(item.ts).toLocaleString() : "Recently"}
                </Text>
              </View>

              <View style={styles.scoreBox}>
                <Text style={styles.score}>{item.score || 0}</Text>
                <Text style={styles.scoreLabel}>pts</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No scores yet</Text>
              <Text style={styles.emptyText}>
                Play and complete a puzzle to become the first ranked player in {city}.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#020617",
    padding: spacing.lg,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },

  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },

  backText: {
    color: "#ffffff",
    fontSize: 34,
    lineHeight: 34,
    fontWeight: "900",
  },

  title: {
    color: "white",
    fontSize: 24,
    fontWeight: "900",
  },

  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },

  refreshBtn: {
    backgroundColor: "#a8eb63",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  refreshText: {
    color: "#071018",
    fontWeight: "900",
    fontSize: 13,
  },

  infoCard: {
    backgroundColor: "rgba(168,235,99,0.08)",
    borderWidth: 1,
    borderColor: "rgba(168,235,99,0.18)",
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },

  infoTitle: {
    color: "#d8ffb0",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 6,
  },

  infoText: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  muted: {
    color: "#94a3b8",
    marginTop: spacing.sm,
    fontWeight: "700",
  },

  list: {
    paddingBottom: 32,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b1220",
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
  },

  topRow: {
    borderColor: "rgba(168,235,99,0.28)",
    backgroundColor: "rgba(17,24,39,0.96)",
  },

  rank: {
    color: "#38bdf8",
    fontWeight: "900",
    width: 54,
    fontSize: 18,
  },

  name: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
  },

  meta: {
    color: "#94a3b8",
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
  },

  scoreBox: {
    alignItems: "center",
    minWidth: 54,
  },

  score: {
    color: "#22c55e",
    fontWeight: "900",
    fontSize: 20,
  },

  scoreLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1,
  },

  emptyCard: {
    backgroundColor: "#0b1220",
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
    alignItems: "center",
    marginTop: 24,
  },

  emptyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },

  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },
});