// screens/SettingsScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors, spacing, radius } from "../theme";
import { DEFAULT_SETTINGS } from "../config";

const KEY = "civicPuzzle.settings.v1";

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(next) {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export default function SettingsScreen({ navigation }) {
  const [city, setCity] = useState(DEFAULT_SETTINGS.city);
  const [playerName, setPlayerName] = useState(DEFAULT_SETTINGS.playerName);
  const [puzzleFeedUrl, setPuzzleFeedUrl] = useState(DEFAULT_SETTINGS.puzzleFeedUrl);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setCity(s.city);
      setPlayerName(s.playerName);
      setPuzzleFeedUrl(s.puzzleFeedUrl);
    })();
  }, []);

  const onSave = async () => {
    const trimmedCity = (city || "").trim() || DEFAULT_SETTINGS.city;
    const trimmedName = (playerName || "").trim() || DEFAULT_SETTINGS.playerName;
    const trimmedUrl = (puzzleFeedUrl || "").trim();

    // light validation
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      Alert.alert("Invalid URL", "Puzzle Feed URL must start with http:// or https://");
      return;
    }

    await saveSettings({
      city: trimmedCity,
      playerName: trimmedName,
      puzzleFeedUrl: trimmedUrl,
    });

    Alert.alert("Saved", "Your settings have been saved.");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.h1}>Settings</Text>
        <Text style={styles.p}>
          Configure your city + optional puzzle feed URL. If you set a feed URL, the app will fetch puzzles from it.
        </Text>

        <Text style={styles.label}>City (Leaderboard + branding)</Text>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="e.g. Ballarat"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.label}>Player Name (Leaderboard)</Text>
        <TextInput
          value={playerName}
          onChangeText={setPlayerName}
          placeholder="e.g. Ebenezer"
          placeholderTextColor="#94a3b8"
          style={styles.input}
        />

        <Text style={styles.label}>Puzzle Feed URL (optional)</Text>
        <TextInput
          value={puzzleFeedUrl}
          onChangeText={setPuzzleFeedUrl}
          placeholder="https://example.com/puzzles.json"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.btn} onPress={onSave}>
          <Text style={styles.btnText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617", padding: spacing.lg },
  card: {
    backgroundColor: "#0b1220",
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
  },
  h1: { color: "white", fontSize: 22, fontWeight: "800", marginBottom: spacing.sm },
  p: { color: "#cbd5e1", marginBottom: spacing.lg, lineHeight: 20 },
  label: { color: "#e2e8f0", fontWeight: "700", marginTop: spacing.md, marginBottom: 6 },
  input: {
    backgroundColor: "#0f172a",
    borderRadius: radius.lg,
    padding: spacing.md,
    color: "white",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
  },
  btn: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
    alignItems: "center",
  },
  btnText: { color: "white", fontSize: 16, fontWeight: "800" },
});
