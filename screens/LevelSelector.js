import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { API_BASE_URL } from "../config";
import { loadSettings } from "./SettingsScreen";
import AdRectangle from "../components/AdRectangle";

const REQUEST_TIMEOUT_MS = 20000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });

    if (!res.ok) {
      throw new Error(`Request failed with status ${res.status}`);
    }

    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } finally {
    clearTimeout(timeout);
  }
}

export default function LevelSelector({ navigation }) {
  const [mode, setMode] = useState("news");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("Ballarat");
  const [radius, setRadius] = useState("local");
  const [locationMode, setLocationMode] = useState("manual");

  const modes = [
    { key: "news", label: "News Puzzle", emoji: "📰" },
    { key: "facts", label: "Quick Facts", emoji: "💡" },
    { key: "crossword", label: "Crossword", emoji: "🧩" },
  ];

  const fetchData = async (whichMode) => {
    setLoading(true);

    try {
      const s = await loadSettings();

      const selectedCity = s.city || "Ballarat";
      const selectedRadius = s.newsRadius || "local";
      const selectedLocationMode = s.locationMode || "manual";

      setCity(selectedCity);
      setRadius(selectedRadius);
      setLocationMode(selectedLocationMode);

      const qs = new URLSearchParams();
      qs.set("city", selectedCity);
      qs.set("radius", selectedRadius);
      qs.set("locationMode", selectedLocationMode);

      if (whichMode === "crossword") {
        const data = await fetchWithTimeout(
          `${API_BASE_URL}/api/crosswords?${qs.toString()}`
        );
        setItems(data);
        return;
      }

      const endpoint = whichMode === "facts" ? "facts" : "puzzles";

      const data = await fetchWithTimeout(
        `${API_BASE_URL}/api/${endpoint}?${qs.toString()}`
      );

      setItems(data);
    } catch (e) {
      console.log("LevelSelector fetch error:", e);
      Alert.alert("Error", "Could not load local puzzles. Check API URL + server.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => fetchData(mode));
    fetchData(mode);
    return unsubscribe;
  }, [mode, navigation]);

  const openChallenge = (item) => {
    if (mode === "crossword") {
      navigation.navigate("CrosswordScreen", { crosswordData: item });
    } else {
      navigation.navigate("GameScreen", {
        puzzleData: item,
        mode,
        city,
        radius,
        locationMode,
      });
    }
  };

  const getCardTitle = (index) => {
    if (mode === "news") return `${city} Headline #${index + 1}`;
    if (mode === "facts") return `${city} Quick Fact #${index + 1}`;
    return `${city} Crossword #${index + 1}`;
  };

  const getCardDescription = () => {
    if (mode === "news") {
      return `Solve each word to unlock a headline selected for ${city}.`;
    }

    if (mode === "facts") {
      return `Turn local information into quick word challenges for ${city}.`;
    }

    return `Solve crossword clues built from ${city}-focused content.`;
  };

  const getCardBadge = () => {
    if (mode === "news") return "📍 Local Civic";
    if (mode === "facts") return "💡 Local Facts";
    return "🧩 Local Crossword";
  };

  const getButtonText = () => {
    if (mode === "news") return "Reveal Local Headline";
    if (mode === "facts") return "Start Local Fact";
    return "Start Local Crossword";
  };

  const getModePrompt = () => {
    const sourceText =
      locationMode === "auto"
        ? "using your detected location"
        : "using your selected city";

    if (mode === "news") {
      return `Stay updated with ${city} news ${sourceText}.`;
    }

    if (mode === "facts") {
      return `Play quick knowledge challenges linked to ${city}.`;
    }

    return `Choose a crossword built from ${city}-focused headlines and facts.`;
  };

  const getRadiusLabel = () => {
    if (radius === "local") return "Local";
    if (radius === "regional") return "Regional";
    if (radius === "state") return "State";
    if (radius === "national") return "National";
    if (radius === "global") return "Global";
    return "Local";
  };

  const currentMode = modes.find((m) => m.key === mode);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Choose Puzzle</Text>
          <Text style={styles.headerSub}>
            {city} • {getRadiusLabel()} • {locationMode === "auto" ? "Auto location" : "Manual"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => fetchData(mode)}
          activeOpacity={0.9}
        >
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.locationCard}>
        <Text style={styles.locationTitle}>📍 Local News Mode</Text>
        <Text style={styles.locationText}>
          Showing {getRadiusLabel().toLowerCase()} challenges for {city}.
        </Text>

        <TouchableOpacity
          style={styles.locationBtn}
          onPress={() => navigation.navigate("Settings")}
        >
          <Text style={styles.locationBtnText}>Change Location</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.heroCard}>
        <Text style={styles.heroEmoji}>{currentMode?.emoji || "🧩"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{currentMode?.label}</Text>
          <Text style={styles.heroMeta}>
            {loading
              ? "Loading…"
              : `${items.length} ${city} challenge${items.length === 1 ? "" : "s"} ready`}
          </Text>
        </View>
      </View>

      <View style={styles.modeRow}>
        {modes.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.modeBtn, mode === m.key && styles.modeBtnActive]}
            onPress={() => setMode(m.key)}
            activeOpacity={0.9}
          >
            <Text style={styles.modeEmoji}>{m.emoji}</Text>
            <Text style={[styles.modeBtnText, mode === m.key && styles.modeBtnTextActive]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.pagePrompt}>{getModePrompt()}</Text>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#b8f27b" />
          <Text style={styles.loaderText}>Loading local challenge set…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => `${mode}-${city}-${idx}`}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.adWrap}>
              <AdRectangle />
            </View>
          }
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => openChallenge(item)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardBadge}>{getCardBadge()}</Text>
                <Text style={styles.cardIndex}>#{index + 1}</Text>
              </View>

              <Text style={styles.cardTitle}>{getCardTitle(index)}</Text>
              <Text style={styles.cardDescription}>{getCardDescription()}</Text>

              {item?.sponsor ? (
                <View style={styles.sponsorPill}>
                  <Text style={styles.sponsorPillText}>
                    Sponsored by {item.sponsor.name}
                  </Text>
                </View>
              ) : null}

              <View style={styles.cardFooter}>
                <Text style={styles.rewardPreview}>+ XP • + Coins • Streak</Text>

                <TouchableOpacity
                  style={styles.revealBtn}
                  activeOpacity={0.9}
                  onPress={() => openChallenge(item)}
                >
                  <Text style={styles.revealBtnText}>{getButtonText()}</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No local content found yet</Text>
              <Text style={styles.emptyText}>
                Try another city, switch radius, or check the backend feed.
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
    backgroundColor: "#09101d",
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
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

  headerTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "900",
  },

  headerSub: {
    color: "#9fb0c7",
    fontSize: 13,
    marginTop: 2,
    fontWeight: "700",
  },

  refreshBtn: {
    backgroundColor: "#a8eb63",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  refreshText: {
    color: "#071018",
    fontWeight: "900",
    fontSize: 13,
  },

  locationCard: {
    backgroundColor: "rgba(168,235,99,0.08)",
    borderWidth: 1,
    borderColor: "rgba(168,235,99,0.2)",
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },

  locationTitle: {
    color: "#d8ffb0",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 5,
  },

  locationText: {
    color: "#c7d2e1",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },

  locationBtn: {
    backgroundColor: "#1a2434",
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: "center",
  },

  locationBtnText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 14,
  },

  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(127,90,240,0.14)",
    borderWidth: 1,
    borderColor: "rgba(127,90,240,0.28)",
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
  },

  heroEmoji: {
    fontSize: 38,
    marginRight: 14,
  },

  heroTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },

  heroMeta: {
    color: "#c7d2e1",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "800",
  },

  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },

  modeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#1a2434",
  },

  modeBtnActive: {
    backgroundColor: "#7f5af0",
  },

  modeEmoji: {
    marginRight: 7,
    fontSize: 16,
  },

  modeBtnText: {
    color: "#d0d8e6",
    fontSize: 15,
    fontWeight: "800",
  },

  modeBtnTextActive: {
    color: "#ffffff",
  },

  pagePrompt: {
    color: "#c7d2e1",
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 16,
    fontWeight: "700",
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loaderText: {
    color: "#c7d2e2",
    marginTop: 10,
    fontSize: 15,
  },

  list: {
    paddingBottom: 34,
  },

  adWrap: {
    marginBottom: 16,
  },

  card: {
    backgroundColor: "rgba(10,16,26,0.94)",
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(184,242,123,0.14)",
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  cardBadge: {
    color: "#d8ffb0",
    fontSize: 14,
    fontWeight: "900",
  },

  cardIndex: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
  },

  cardTitle: {
    color: "#ffffff",
    fontSize: 25,
    lineHeight: 33,
    fontWeight: "900",
    marginBottom: 10,
  },

  cardDescription: {
    color: "#b9c6d9",
    fontSize: 16,
    lineHeight: 23,
    marginBottom: 18,
    fontWeight: "700",
  },

  sponsorPill: {
    backgroundColor: "rgba(255,216,77,0.12)",
    borderRadius: 16,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,216,77,0.25)",
  },

  sponsorPillText: {
    color: "#ffd84d",
    fontSize: 13,
    fontWeight: "900",
  },

  cardFooter: {
    gap: 12,
  },

  rewardPreview: {
    color: "#9fb0c7",
    fontSize: 13,
    fontWeight: "900",
  },

  revealBtn: {
    backgroundColor: "#a8eb63",
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: "center",
  },

  revealBtnText: {
    color: "#071018",
    fontSize: 17,
    fontWeight: "900",
  },

  emptyCard: {
    backgroundColor: "rgba(10,16,26,0.94)",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(184,242,123,0.14)",
    marginTop: 20,
  },

  emptyTitle: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 18,
    marginBottom: 8,
    textAlign: "center",
  },

  emptyText: {
    color: "#b7c4d5",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
  },
});