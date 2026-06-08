// screens/SettingsScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
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
  const [puzzleFeedUrl, setPuzzleFeedUrl] = useState(DEFAULT_SETTINGS.puzzleFeedUrl || "");
  const [locationMode, setLocationMode] = useState(DEFAULT_SETTINGS.locationMode || "manual");
  const [newsRadius, setNewsRadius] = useState(DEFAULT_SETTINGS.newsRadius || "local");
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setCity(s.city || DEFAULT_SETTINGS.city);
      setPlayerName(s.playerName || DEFAULT_SETTINGS.playerName);
      setPuzzleFeedUrl(s.puzzleFeedUrl || "");
      setLocationMode(s.locationMode || "manual");
      setNewsRadius(s.newsRadius || "local");
    })();
  }, []);

  const detectMyLocation = async () => {
    try {
      setDetecting(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location access is required for automatic local news."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const places = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (places && places.length > 0) {
        const place = places[0];

        const detectedCity =
          place.city ||
          place.district ||
          place.subregion ||
          place.region ||
          "Melbourne";

        setCity(detectedCity);
        setLocationMode("auto");

        Alert.alert(
          "Location Detected",
          `Your city has been set to ${detectedCity}. Tap Save Settings to apply it.`
        );
      } else {
        Alert.alert("Location Error", "Could not detect your city.");
      }
    } catch (err) {
      console.log(err);
      Alert.alert("Location Error", "Unable to determine your location.");
    } finally {
      setDetecting(false);
    }
  };

  const onSave = async () => {
    const trimmedCity = (city || "").trim() || DEFAULT_SETTINGS.city;
    const trimmedName = (playerName || "").trim() || DEFAULT_SETTINGS.playerName;
    const trimmedUrl = (puzzleFeedUrl || "").trim();

    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      Alert.alert("Invalid URL", "Puzzle Feed URL must start with http:// or https://");
      return;
    }

    await saveSettings({
      city: trimmedCity,
      playerName: trimmedName,
      puzzleFeedUrl: trimmedUrl,
      locationMode,
      newsRadius,
    });

    Alert.alert("Saved", "Your settings have been saved.");
    navigation.goBack();
  };

  const radiusOptions = [
    { key: "local", label: "Local" },
    { key: "regional", label: "Regional" },
    { key: "state", label: "State" },
    { key: "national", label: "National" },
    { key: "global", label: "Global" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.h1}>Settings</Text>
          <Text style={styles.p}>
            Choose your city or use automatic location to load local Civic Puzzle news.
          </Text>

          <Text style={styles.label}>City for Local News</Text>
          <TextInput
            value={city}
            onChangeText={(text) => {
              setCity(text);
              setLocationMode("manual");
            }}
            placeholder="e.g. Ballarat"
            placeholderTextColor="#94a3b8"
            style={styles.input}
          />

          <TouchableOpacity style={styles.detectBtn} onPress={detectMyLocation}>
            <Text style={styles.detectBtnText}>
              {detecting ? "Detecting..." : "📍 Detect My Location"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.modeText}>
            Mode: {locationMode === "auto" ? "Auto location" : "Manual city"}
          </Text>

          <Text style={styles.label}>News Radius</Text>
          <View style={styles.radiusWrap}>
            {radiusOptions.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.radiusBtn,
                  newsRadius === item.key && styles.radiusBtnActive,
                ]}
                onPress={() => setNewsRadius(item.key)}
              >
                <Text
                  style={[
                    styles.radiusBtnText,
                    newsRadius === item.key && styles.radiusBtnTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Player Name</Text>
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
      </ScrollView>
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
  detectBtn: {
    backgroundColor: "#7f5af0",
    padding: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.md,
    alignItems: "center",
  },
  detectBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  modeText: {
    color: "#a8eb63",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 8,
  },
  radiusWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  radiusBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.2)",
  },
  radiusBtnActive: {
    backgroundColor: "#a8eb63",
    borderColor: "#a8eb63",
  },
  radiusBtnText: {
    color: "#cbd5e1",
    fontWeight: "800",
  },
  radiusBtnTextActive: {
    color: "#071018",
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