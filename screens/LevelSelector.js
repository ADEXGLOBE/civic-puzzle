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

export default function LevelSelector({ navigation }) {
  const [mode, setMode] = useState("news");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState("Ballarat");
  const [puzzleFeedUrl, setPuzzleFeedUrl] = useState("");

  const modes = [
    { key: "news", label: "News Puzzle" },
    { key: "facts", label: "Quick Facts" },
    { key: "crossword", label: "Crossword" },
  ];

  const fetchData = async (whichMode) => {
    setLoading(true);

    try {
      const s = await loadSettings();
      setCity(s.city || "Ballarat");
      setPuzzleFeedUrl(s.puzzleFeedUrl || "");

      if (whichMode === "crossword") {
        const qs = new URLSearchParams();
      if (s.puzzleFeedUrl) qs.set("sourceUrl", s.puzzleFeedUrl);

      const res = await fetch(`${API_BASE_URL}/api/crosswords?${qs.toString()}`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
        return;
      }

      const endpoint = whichMode === "facts" ? "facts" : "puzzles";

      const qs = new URLSearchParams();
      qs.set("city", s.city || "Ballarat");

      if (whichMode === "news" && s.puzzleFeedUrl) {
        qs.set("sourceUrl", s.puzzleFeedUrl);
      }

      const res = await fetch(`${API_BASE_URL}/api/${endpoint}?${qs.toString()}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Error", "Could not load puzzles. Check API URL + server.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(mode);
  }, [mode]);

  const openChallenge = (item) => {
    if (mode === "crossword") {
      navigation.navigate("CrosswordScreen", { crosswordData: item });
    } else {
      navigation.navigate("GameScreen", {
        puzzleData: item,
        mode,
        city,
      });
    }
  };

  const getCardTitle = (index) => {
    if (mode === "news") return `Headline Challenge #${index + 1}`;
    if (mode === "facts") return `Quick Fact Challenge #${index + 1}`;
    return `Crossword Challenge #${index + 1}`;
  };

  const getCardDescription = () => {
    if (mode === "news") {
      return "Reveal what you should know today. Solve each word to unlock the headline.";
    }

    if (mode === "facts") {
      return "Test your knowledge with a quick fact puzzle.";
    }

    return "Solve the crossword challenge.";
  };

  const getCardBadge = () => {
    if (mode === "news") return "🔥 Daily Civic";
    if (mode === "facts") return "💡 Quick Facts";
    return "🧩 Crossword";
  };

  const getButtonText = () => {
    if (mode === "news") return "Reveal Headline";
    if (mode === "facts") return "Start Fact Puzzle";
    return "Start Crossword";
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>Choose Puzzle</Text>
          <Text style={styles.headerSub}>
            {city}
            {puzzleFeedUrl ? " • feed enabled" : ""}
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
            <Text
              style={[
                styles.modeBtnText,
                mode === m.key && styles.modeBtnTextActive,
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.pagePrompt}>
        {mode === "news"
          ? "Stay updated with the news making headlines — but reveal it by solving the puzzle first."
          : mode === "facts"
          ? "Play quick knowledge challenges."
          : "Choose a crossword challenge."}
      </Text>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#b8f27b" />
          <Text style={styles.loaderText}>Loading challenge set…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, idx) => `${mode}-${idx}`}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => openChallenge(item)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardBadge}>{getCardBadge()}</Text>
                <Text style={styles.cardIndex}>{index + 1}</Text>
              </View>

              <Text style={styles.cardTitle}>{getCardTitle(index)}</Text>

              <Text style={styles.cardDescription}>{getCardDescription()}</Text>

              <TouchableOpacity
                style={styles.revealBtn}
                activeOpacity={0.9}
                onPress={() => openChallenge(item)}
              >
                <Text style={styles.revealBtnText}>{getButtonText()}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No content found yet. Add content or set a valid feed URL.
            </Text>
          }
        />
      )}
      <AdRectangle />
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
    fontSize: 14,
    marginTop: 2,
  },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  modeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 18,
    backgroundColor: "#1a2434",
  },
  modeBtnActive: {
    backgroundColor: "#7f5af0",
  },
  modeBtnText: {
    color: "#d0d8e6",
    fontSize: 16,
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
    paddingBottom: 30,
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
    fontSize: 26,
    lineHeight: 34,
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
  emptyText: {
    color: "#b7c4d5",
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },
});