import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  SafeAreaView,
  ScrollView,
  Linking,
} from "react-native";

const CELL = 30;

export default function CrosswordScreen({ route, navigation }) {
  const { crosswordData } = route.params || {};
  const data = crosswordData;

  const initialGrid = useMemo(() => {
    if (!data?.size) return [];
    const { rows, cols } = data.size;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(""));

    (data.blocks || []).forEach(([r, c]) => {
      if (grid[r]) grid[r][c] = "#";
    });

    return grid;
  }, [data]);

  const [grid, setGrid] = useState(initialGrid);
  const [selected, setSelected] = useState({ r: 0, c: 0 });
  const [direction, setDirection] = useState("across");
  const [completed, setCompleted] = useState(false);
  const [selectedHint, setSelectedHint] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);

  const clues = direction === "across" ? data?.across || [] : data?.down || [];

  const inBounds = (r, c) =>
    r >= 0 &&
    c >= 0 &&
    r < grid.length &&
    c < grid[0]?.length &&
    grid[r][c] !== "#";

  const selectCell = (r, c) => {
    if (!inBounds(r, c)) return;
    setSelected({ r, c });
  };

  const moveNext = () => {
    const { r, c } = selected;
    if (direction === "across" && inBounds(r, c + 1)) setSelected({ r, c: c + 1 });
    else if (direction === "down" && inBounds(r + 1, c)) setSelected({ r: r + 1, c });
  };

  const setLetter = (letter) => {
    const { r, c } = selected;
    if (!inBounds(r, c)) return;

    const next = grid.map((row) => row.slice());
    next[r][c] = letter;
    setGrid(next);
    moveNext();
  };

  const backspace = () => {
    const { r, c } = selected;
    if (!inBounds(r, c)) return;

    const next = grid.map((row) => row.slice());
    next[r][c] = "";
    setGrid(next);
  };

  const getSelectedHintText = () => {
    const h = selectedHint?.progressiveHints;
    if (!h) return null;

    if (hintLevel === 1) return `Category: ${h.categoryHint}`;
    if (hintLevel === 2) return h.contextHint || "Connected to today’s news context";
    if (hintLevel === 3) return `Starts with: ${h.startsWith}`;
    if (hintLevel === 4) return `Length: ${h.answerLength} letters`;
    if (hintLevel >= 5) return `Pattern: ${h.revealPattern || ""}`;

    return "Tap Unlock Hint to reveal help.";
  };

  const unlockHint = () => {
    if (!selectedHint) {
      Alert.alert("Select a clue", "Tap a clue card first.");
      return;
    }
    setHintLevel((prev) => Math.min(prev + 1, 5));
  };

  const checkCrossword = () => {
    if (!data?.solution) {
      Alert.alert("No solution", "This crossword has no solution attached.");
      return;
    }

    let wrong = 0;
    let empty = 0;

    for (let r = 0; r < data.solution.length; r++) {
      for (let c = 0; c < data.solution[r].length; c++) {
        const solutionCell = data.solution[r][c];
        if (solutionCell === "#") continue;

        const userCell = grid[r][c];

        if (!userCell) empty += 1;
        else if (userCell !== solutionCell) wrong += 1;
      }
    }

    if (empty > 0) {
      Alert.alert("Almost there", `You still have ${empty} empty boxes.`);
      return;
    }

    if (wrong > 0) {
      Alert.alert("Not quite", `${wrong} letters need another look.`);
      return;
    }

    setCompleted(true);
  };

  const openStory = async () => {
    const url = data?.readMoreUrl;

    if (!url) {
      Alert.alert("No story link", "No news link attached to this crossword yet.");
      return;
    }

    const ok = await Linking.canOpenURL(url);
    if (ok) Linking.openURL(url);
    else Alert.alert("Invalid link", "This news link could not be opened.");
  };

  if (!data || grid.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>No crossword data found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (completed) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.hero}>🎉</Text>

          <View style={styles.revealCard}>
            <Text style={styles.badge}>Crossword unlocked</Text>
            <Text style={styles.revealTitle}>Here’s what you should know today</Text>

            <View style={styles.headlineBox}>
              <Text style={styles.revealText}>{data.revealText}</Text>
            </View>

            {data.readMoreUrl ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={openStory}>
                <Text style={styles.primaryBtnText}>Read Full Story</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryBtnText}>Back to Challenges</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>{data.title}</Text>
            <Text style={styles.subtitle}>{data.subtitle}</Text>
          </View>
        </View>

        <Text style={styles.hero}>🧩</Text>

        <View style={styles.card}>
          <Text style={styles.badge}>
            {data.sourceType === "headline" ? "Headline Crossword" : "News Fact Crossword"}
          </Text>

          <Text style={styles.prompt}>Solve the grid to reveal what you should know today.</Text>

          <View style={styles.gridWrap}>
            <View style={[styles.grid, { width: data.size.cols * CELL, height: data.size.rows * CELL }]}>
              {grid.map((row, r) => (
                <View key={r} style={{ flexDirection: "row" }}>
                  {row.map((cell, c) => {
                    const blocked = cell === "#";
                    const isSelected = selected.r === r && selected.c === c;

                    return (
                      <TouchableOpacity
                        key={`${r}-${c}`}
                        style={[
                          styles.cell,
                          blocked && styles.block,
                          isSelected && styles.selectedCell,
                        ]}
                        onPress={() => selectCell(r, c)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.cellText}>{blocked ? "" : cell}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, direction === "across" && styles.modeBtnActive]}
            onPress={() => {
              setDirection("across");
              setSelectedHint(null);
              setHintLevel(0);
            }}
          >
            <Text style={[styles.modeBtnText, direction === "across" && styles.modeBtnTextActive]}>
              Across
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, direction === "down" && styles.modeBtnActive]}
            onPress={() => {
              setDirection("down");
              setSelectedHint(null);
              setHintLevel(0);
            }}
          >
            <Text style={[styles.modeBtnText, direction === "down" && styles.modeBtnTextActive]}>
              Down
            </Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={clues}
          keyExtractor={(item) => `${item.direction}-${item.num}`}
          style={{ marginBottom: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.clueCard,
                selectedHint?.num === item.num && selectedHint?.direction === item.direction && styles.clueCardActive,
              ]}
              activeOpacity={0.9}
              onPress={() => {
                setSelectedHint(item);
                setHintLevel(0);
              }}
            >
              <Text style={styles.clueNum}>{item.num}</Text>
              <Text style={styles.clueText}>{item.clue}</Text>
            </TouchableOpacity>
          )}
        />

        {selectedHint ? (
          <View style={styles.hintPanel}>
            <Text style={styles.hintPanelTitle}>Intelligent Hint</Text>
            <Text style={styles.hintPanelText}>{getSelectedHintText()}</Text>

            <TouchableOpacity style={styles.hintUnlockBtn} onPress={unlockHint}>
              <Text style={styles.hintUnlockText}>Unlock Next Hint</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.keyboard}>
          {"QWERTYUIOPASDFGHJKLZXCVBNM".split("").map((letter) => (
            <TouchableOpacity key={letter} style={styles.key} onPress={() => setLetter(letter)}>
              <Text style={styles.keyText}>{letter}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={backspace}>
            <Text style={styles.secondaryBtnText}>Backspace</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.primaryBtn} onPress={checkCrossword}>
            <Text style={styles.primaryBtnText}>Check Crossword</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1020" },
  container: { padding: 20, paddingBottom: 34 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#fff", fontSize: 18, fontWeight: "900" },
  top: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center", marginRight: 10 },
  back: { color: "#fff", fontSize: 34, lineHeight: 34 },
  title: { color: "#fff", fontSize: 24, fontWeight: "900" },
  subtitle: { color: "#9fb0c7", fontSize: 14, marginTop: 2 },
  hero: { fontSize: 62, textAlign: "center", marginVertical: 8 },
  card: { backgroundColor: "rgba(17,24,39,0.96)", borderRadius: 30, padding: 18, marginBottom: 18, borderWidth: 1, borderColor: "rgba(184,242,123,0.14)" },
  badge: { color: "#d8ffb0", fontSize: 15, fontWeight: "900", marginBottom: 8 },
  prompt: { color: "#fff", fontSize: 24, lineHeight: 32, fontWeight: "900", marginBottom: 16 },
  gridWrap: { alignItems: "center" },
  grid: { backgroundColor: "#101827", borderRadius: 14, overflow: "hidden" },
  cell: { width: CELL, height: CELL, borderWidth: 1, borderColor: "rgba(184,242,123,0.22)", alignItems: "center", justifyContent: "center", backgroundColor: "#111827" },
  block: { backgroundColor: "#050814" },
  selectedCell: { backgroundColor: "rgba(168,235,99,0.3)", borderColor: "#a8eb63", borderWidth: 2 },
  cellText: { color: "#fff", fontSize: 16, fontWeight: "900" },
  modeRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  modeBtn: { flex: 1, backgroundColor: "#1f2937", paddingVertical: 14, borderRadius: 16, alignItems: "center" },
  modeBtnActive: { backgroundColor: "#7f5af0" },
  modeBtnText: { color: "#d0d8e6", fontWeight: "900" },
  modeBtnTextActive: { color: "#fff" },
  clueCard: { backgroundColor: "#1a2232", borderRadius: 16, padding: 14, marginRight: 10, width: 220 },
  clueCardActive: { borderWidth: 1, borderColor: "#a8eb63" },
  clueNum: { color: "#a8eb63", fontSize: 16, fontWeight: "900", marginBottom: 4 },
  clueText: { color: "#fff", fontSize: 14, lineHeight: 20, fontWeight: "700" },
  hintPanel: { backgroundColor: "rgba(168,235,99,0.08)", borderWidth: 1, borderColor: "rgba(168,235,99,0.2)", borderRadius: 20, padding: 16, marginBottom: 18 },
  hintPanelTitle: { color: "#a8eb63", fontSize: 14, fontWeight: "900", marginBottom: 8, textTransform: "uppercase" },
  hintPanelText: { color: "#fff", fontSize: 15, marginBottom: 12, fontWeight: "700", lineHeight: 21 },
  hintUnlockBtn: { backgroundColor: "#2b3140", borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  hintUnlockText: { color: "#e2e7ee", fontWeight: "900" },
  keyboard: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 16 },
  key: { minWidth: 34, height: 42, paddingHorizontal: 8, borderRadius: 12, backgroundColor: "#a8eb63", alignItems: "center", justifyContent: "center" },
  keyText: { color: "#071018", fontSize: 16, fontWeight: "900" },
  actionRow: { gap: 12 },
  primaryBtn: { backgroundColor: "#84cc16", paddingVertical: 18, borderRadius: 20, alignItems: "center" },
  primaryBtnText: { color: "#071018", fontSize: 17, fontWeight: "900" },
  secondaryBtn: { backgroundColor: "#2b3140", paddingVertical: 16, borderRadius: 18, alignItems: "center" },
  secondaryBtnText: { color: "#e2e7ee", fontSize: 16, fontWeight: "900" },
  revealCard: { backgroundColor: "rgba(8,12,18,0.96)", borderRadius: 34, padding: 24, borderWidth: 1, borderColor: "rgba(184,242,123,0.2)" },
  revealTitle: { color: "#fff", fontSize: 30, lineHeight: 38, fontWeight: "900", marginBottom: 18 },
  headlineBox: { backgroundColor: "rgba(168,235,99,0.1)", borderRadius: 24, borderWidth: 1, borderColor: "rgba(168,235,99,0.24)", padding: 18, marginBottom: 18 },
  revealText: { color: "#fff", fontSize: 24, lineHeight: 32, fontWeight: "900" },
});