import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
// import Constants from "expo-constants";
import {
  RewardedAd,
  RewardedAdEventType,
  TestIds,
} from "react-native-google-mobile-ads";

import {
  loadProgress,
  saveProgress,
  rewardCorrectAnswer,
  penalizeWrongAnswer,
  getLevelProgress,
  spendCoins,
} from "../utils/gameProgress";

const rewardedAdUnitId =
  __DEV__
    ? TestIds.REWARDED
    : Platform.OS === "android"
    ? "ca-app-pub-9113372641628364/7864252572"
    : TestIds.REWARDED;

export default function GameScreen({ route, navigation }) {
  const { puzzleData } = route.params || {};

  const headline = useMemo(() => {
    return (puzzleData?.answer || puzzleData?.headline || puzzleData?.text || "").trim();
  }, [puzzleData]);

  const readMoreUrl = useMemo(() => {
    return (puzzleData?.readMoreUrl || puzzleData?.url || puzzleData?.link || "").trim();
  }, [puzzleData]);

  const words = useMemo(() => {
    return headline
      .split(/\s+/)
      .map((w) => ({ raw: w, clean: cleanWord(w) }))
      .filter((w) => w.clean.length > 0);
  }, [headline]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [slots, setSlots] = useState([]);
  const [tiles, setTiles] = useState([]);
  const [usedIndexes, setUsedIndexes] = useState([]);
  const [solvedWords, setSolvedWords] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [rewardLoading, setRewardLoading] = useState(false);

  const [progressState, setProgressState] = useState({
    coins: 340,
    lives: 5,
    streak: 0,
    xp: 0,
    level: 1,
  });

  const currentWord = words[currentIndex]?.clean?.toUpperCase() || "";
  const fillProgress = words.length ? currentIndex / words.length : 0;
  const levelProgress = getLevelProgress(progressState.xp);

  useEffect(() => {
    const bootstrap = async () => {
      const p = await loadProgress();
      setProgressState(p);
    };
    bootstrap();
  }, []);

  useEffect(() => {
    if (!currentWord) return;

    setSlots(new Array(currentWord.length).fill(""));
    setUsedIndexes([]);
    setFeedback(null);
    setHintLevel(0);

    const letters = currentWord.split("");
    const decoys = generateDecoys(Math.max(2, Math.ceil(currentWord.length / 3)));
    setTiles(shuffle([...letters, ...decoys]));
  }, [currentIndex, currentWord]);

  function getCurrentHint() {
    const hints = puzzleData?.progressiveHints || [];

    const currentHint =
      hints.find((h) => h?.word?.toUpperCase() === currentWord?.toUpperCase()) ||
      hints[currentIndex];

    if (!currentHint) return null;

    const meaning =
      currentHint.meaning ||
      currentHint.clue ||
      "No dictionary meaning available for this word.";

    if (hintLevel === 1) return `Meaning: ${meaning}`;
    if (hintLevel === 2) return `Category: ${currentHint.categoryHint || "News"}`;
    if (hintLevel === 3) return `Starts with: ${currentHint.startsWith || currentWord.slice(0, 2)}`;
    if (hintLevel === 4) return `Length: ${currentHint.answerLength || currentWord.length} letters`;
    if (hintLevel >= 5) return `Pattern: ${currentHint.revealPattern || buildLocalPattern(currentWord)}`;

    return null;
  }

  const watchRewardAdForCoins = () => {
    if (!rewardedAdUnitId) {
      Alert.alert("Ad unavailable", "Rewarded ads are not configured yet.");
      return;
    }

    try {
      setRewardLoading(true);

      const rewarded = RewardedAd.createForAdRequest(rewardedAdUnitId, {
        requestNonPersonalizedAdsOnly: true,
      });

      const unsubscribeLoaded = rewarded.addAdEventListener(
        RewardedAdEventType.LOADED,
        () => {
          rewarded.show();
        }
      );

      const unsubscribeEarned = rewarded.addAdEventListener(
        RewardedAdEventType.EARNED_REWARD,
        async () => {
          const current = await loadProgress();

          const next = {
            ...current,
            coins: (current.coins || 0) + 50,
          };

          await saveProgress(next);
          setProgressState(next);
          setRewardLoading(false);

          Alert.alert("Reward Earned 🎉", "You received 50 coins.");
        }
      );

      rewarded.load();

      setTimeout(() => {
        setRewardLoading(false);
        unsubscribeLoaded();
        unsubscribeEarned();
      }, 30000);
    } catch (error) {
      setRewardLoading(false);
      Alert.alert("Ad unavailable", "Could not load rewarded ad right now.");
    }
  };

  const pickTile = (letter, index) => {
    if (usedIndexes.includes(index)) return;

    const emptyIndex = slots.findIndex((l) => l === "");
    if (emptyIndex === -1) return;

    const next = [...slots];
    next[emptyIndex] = letter;

    setSlots(next);
    setUsedIndexes([...usedIndexes, index]);
    setFeedback(null);
  };

  const removeLast = () => {
    const last = [...slots].reverse().findIndex((l) => l !== "");
    if (last === -1) return;

    const realIndex = slots.length - 1 - last;
    const letter = slots[realIndex];

    const next = [...slots];
    next[realIndex] = "";

    const used = [...usedIndexes];
    for (let i = used.length - 1; i >= 0; i--) {
      if (tiles[used[i]] === letter) {
        used.splice(i, 1);
        break;
      }
    }

    setSlots(next);
    setUsedIndexes(used);
    setFeedback(null);
  };

  const clearAll = () => {
    setSlots(new Array(currentWord.length).fill(""));
    setUsedIndexes([]);
    setFeedback(null);
  };

  const shuffleTiles = () => {
    setTiles(shuffle(tiles));
    setSlots(new Array(currentWord.length).fill(""));
    setUsedIndexes([]);
    setFeedback(null);
  };

  const useHint = async () => {
    if (hintLevel >= 5) {
      Alert.alert("All hints used", "You have already unlocked all hints for this word.");
      return;
    }

    const result = await spendCoins(20);

    if (!result.ok) {
      Alert.alert(
        "Not enough coins",
        "You need 20 coins to use a hint. Watch an ad to earn 50 coins."
      );
      return;
    }

    const nextHintLevel = Math.min(hintLevel + 1, 5);

    setProgressState(result.progress);
    setHintLevel(nextHintLevel);
    setFeedback(`Hint ${nextHintLevel} unlocked`);
  };

  const checkWord = async () => {
    const attempt = slots.join("");

    if (attempt.length !== currentWord.length) {
      Alert.alert("Incomplete", "Fill all letter boxes first.");
      return;
    }

    if (attempt !== currentWord) {
      const updated = await penalizeWrongAnswer();
      setProgressState(updated);
      setFeedback("Wrong answer");

      if (updated.lives <= 0) {
        Alert.alert("Out of lives", "Watch an ad for coins or return to challenges.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert("Not quite", `Try again. Lives left: ${updated.lives}`);
      }

      return;
    }

    const solvedRaw = words[currentIndex].raw;
    const nextSolved = [...solvedWords, solvedRaw];
    setSolvedWords(nextSolved);

    if (currentIndex < words.length - 1) {
      setFeedback("Correct 🎉");
      setCurrentIndex(currentIndex + 1);
      return;
    }

    const updated = await rewardCorrectAnswer();
    setProgressState(updated);
    setCompleted(true);
    setFeedback("Headline unlocked 🎉");
  };

  const openReadMore = async () => {
    if (!readMoreUrl) {
      Alert.alert("No story link", "This headline does not have a connected news link yet.");
      return;
    }

    const supported = await Linking.canOpenURL(readMoreUrl);
    if (supported) await Linking.openURL(readMoreUrl);
    else Alert.alert("Invalid link", "This news link could not be opened.");
  };

  if (!headline || words.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>No headline puzzle found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentDisplayNumber = Math.min(currentIndex + 1, words.length);
  const revealedText = solvedWords.length
    ? solvedWords.join(" ")
    : "Solve each word to reveal the headline.";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.top}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.back}>‹</Text>
          </TouchableOpacity>

          <View style={styles.topCenter}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${fillProgress * 100}%` }]} />
            </View>
            <View style={styles.levelBar}>
              <View style={[styles.levelFill, { width: `${levelProgress * 100}%` }]} />
            </View>
          </View>

          <View style={styles.coinBadge}>
            <Text style={styles.coinText}>🪙 {progressState.coins}</Text>
          </View>
        </View>

        <View style={styles.miniStats}>
          <View style={styles.miniPill}><Text style={styles.miniPillText}>🔥 {progressState.streak}</Text></View>
          <View style={styles.miniPill}><Text style={styles.miniPillText}>❤️ {progressState.lives}</Text></View>
          <View style={styles.miniPill}><Text style={styles.miniPillText}>Lv {progressState.level}</Text></View>
          <View style={styles.miniPill}>
            <Text style={styles.miniPillText}>{completed ? words.length : currentDisplayNumber}/{words.length}</Text>
          </View>
        </View>

        <Text style={styles.hero}>{completed ? "🎉" : "🧩"}</Text>

        {!completed ? (
          <>
            <View style={styles.card}>
              <Text style={styles.badge}>Reveal today’s headline</Text>
              <Text style={styles.prompt}>Stay updated with the news making headlines.</Text>
              <Text style={styles.revealedText}>{revealedText}</Text>

              <Text style={styles.wordLabel}>Word {currentDisplayNumber}</Text>

              <View style={styles.slots}>
                {slots.map((l, i) => (
                  <TouchableOpacity key={i} style={styles.box} onPress={removeLast} activeOpacity={0.9}>
                    <Text style={styles.boxText}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.helper}>Fill the word using the shuffled letters below.</Text>

              {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

              {getCurrentHint() ? (
                <View style={styles.hintCard}>
                  <Text style={styles.hintCardLabel}>Hint {hintLevel}</Text>
                  <Text style={styles.hintCardText}>{getCurrentHint()}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.tiles}>
              {tiles.map((t, i) => {
                const used = usedIndexes.includes(i);
                return (
                  <TouchableOpacity
                    key={`${t}-${i}`}
                    style={[styles.tile, used && styles.tileUsed]}
                    onPress={() => pickTile(t, i)}
                    disabled={used}
                    activeOpacity={0.92}
                  >
                    <Text style={[styles.tileText, used && styles.tileTextUsed]}>{t}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.btn} onPress={removeLast}><Text style={styles.btnText}>Back</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={clearAll}><Text style={styles.btnText}>Clear</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btn} onPress={shuffleTiles}><Text style={styles.btnText}>Shuffle</Text></TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.hintBtn} onPress={useHint}>
              <Text style={styles.hintBtnText}>Use Dictionary Hint (-20 coins)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.rewardAdBtn} onPress={watchRewardAdForCoins}>
              <Text style={styles.rewardAdBtnText}>
                {rewardLoading ? "Loading Ad..." : "Watch Ad → Get 50 Coins"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submit} onPress={checkWord}>
              <Text style={styles.submitText}>Check Word</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.revealCard}>
            <Text style={styles.revealBadge}>Headline unlocked</Text>
            <Text style={styles.revealTitle}>Here’s what you should know today</Text>

            <View style={styles.headlineBox}>
              <Text style={styles.fullHeadline}>{headline}</Text>
            </View>

            <View style={styles.rewardRow}>
              <View style={styles.rewardPill}><Text style={styles.rewardText}>+10 coins</Text></View>
              <View style={styles.rewardPill}><Text style={styles.rewardText}>+20 XP</Text></View>
              <View style={styles.rewardPill}><Text style={styles.rewardText}>🔥 {progressState.streak}</Text></View>
            </View>

            <TouchableOpacity style={styles.rewardAdBtn} onPress={watchRewardAdForCoins}>
              <Text style={styles.rewardAdBtnText}>
                {rewardLoading ? "Loading Ad..." : "Watch Ad → Bonus 50 Coins"}
              </Text>
            </TouchableOpacity>

            {readMoreUrl ? (
              <TouchableOpacity style={styles.readBtn} onPress={openReadMore}>
                <Text style={styles.readBtnText}>Read Full Story</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.noLinkBox}>
                <Text style={styles.noLinkText}>No news link attached to this headline yet.</Text>
              </View>
            )}

            <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.doneBtnText}>Back to Challenges</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function cleanWord(w) {
  return String(w || "").replace(/[^a-zA-Z0-9]/g, "");
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function generateDecoys(n) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return Array.from({ length: n }).map(() => alphabet[Math.floor(Math.random() * alphabet.length)]);
}

function buildLocalPattern(word) {
  const clean = String(word || "").toUpperCase();

  if (!clean) return "";

  if (clean.length <= 2) {
    return clean[0] + "_".repeat(Math.max(0, clean.length - 1));
  }

  return clean
    .split("")
    .map((letter, index) => {
      if (index === 0 || index === clean.length - 1) return letter;
      return "_";
    })
    .join(" ");
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0b1020" },
  container: { padding: 20, paddingBottom: 34 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  top: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  backBtn: { width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  back: { color: "#fff", fontSize: 34, lineHeight: 34 },
  topCenter: { flex: 1, marginHorizontal: 10 },
  progressBar: { height: 8, backgroundColor: "#1f2937", borderRadius: 999, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", backgroundColor: "#b8f27b" },
  levelBar: { height: 6, backgroundColor: "#1f2937", borderRadius: 999, overflow: "hidden" },
  levelFill: { height: "100%", backgroundColor: "#7f5af0" },
  coinBadge: { minWidth: 78, height: 38, borderRadius: 19, backgroundColor: "rgba(255,214,10,0.12)", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  coinText: { color: "#ffd84d", fontSize: 17, fontWeight: "900" },
  miniStats: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  miniPill: { backgroundColor: "#1a2232", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  miniPillText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  hero: { fontSize: 64, textAlign: "center", marginVertical: 8 },
  card: { backgroundColor: "rgba(17,24,39,0.96)", borderRadius: 30, padding: 22, marginBottom: 20, borderWidth: 1, borderColor: "rgba(184,242,123,0.14)" },
  badge: { color: "#d8ffb0", fontSize: 15, fontWeight: "900", marginBottom: 10 },
  prompt: { color: "#fff", fontSize: 26, lineHeight: 34, fontWeight: "900", marginBottom: 14 },
  revealedText: { color: "#c7d2e1", fontSize: 18, lineHeight: 26, fontWeight: "700", marginBottom: 20 },
  wordLabel: { color: "#a8eb63", textAlign: "center", fontSize: 16, fontWeight: "900", marginBottom: 12 },
  slots: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 14 },
  box: { width: 58, height: 68, borderRadius: 16, borderWidth: 2, borderColor: "#a8eb63", backgroundColor: "#111827", alignItems: "center", justifyContent: "center" },
  boxText: { color: "#fff", fontSize: 28, fontWeight: "900" },
  helper: { color: "#9fb0c7", textAlign: "center", fontSize: 14, marginBottom: 8 },
  feedback: { color: "#d8ffb0", textAlign: "center", fontSize: 15, fontWeight: "900", marginTop: 8 },
  hintCard: { backgroundColor: "rgba(168,235,99,0.1)", borderWidth: 1, borderColor: "rgba(168,235,99,0.24)", borderRadius: 20, padding: 14, marginTop: 14 },
  hintCardLabel: { color: "#a8eb63", fontSize: 13, fontWeight: "900", marginBottom: 4, textTransform: "uppercase" },
  hintCardText: { color: "#ffffff", fontSize: 16, lineHeight: 22, fontWeight: "700" },
  tiles: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, marginBottom: 20 },
  tile: { minWidth: 74, height: 64, borderRadius: 20, backgroundColor: "#a8eb63", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  tileUsed: { backgroundColor: "#374151", opacity: 0.42 },
  tileText: { color: "#081018", fontSize: 28, fontWeight: "900" },
  tileTextUsed: { color: "#d1d5db" },
  actions: { flexDirection: "row", gap: 10, marginBottom: 14 },
  btn: { flex: 1, backgroundColor: "#1f2937", paddingVertical: 15, borderRadius: 16, alignItems: "center" },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  hintBtn: { backgroundColor: "#2b3140", paddingVertical: 16, borderRadius: 18, alignItems: "center", marginBottom: 12 },
  hintBtnText: { color: "#dbe2ea", fontSize: 16, fontWeight: "800" },
  rewardAdBtn: { backgroundColor: "#7f5af0", paddingVertical: 16, borderRadius: 18, alignItems: "center", marginBottom: 12 },
  rewardAdBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },
  submit: { backgroundColor: "#84cc16", paddingVertical: 18, borderRadius: 20, alignItems: "center" },
  submitText: { color: "#071018", fontSize: 18, fontWeight: "900" },
  revealCard: { backgroundColor: "rgba(8,12,18,0.96)", borderRadius: 34, padding: 24, borderWidth: 1, borderColor: "rgba(184,242,123,0.2)" },
  revealBadge: { color: "#d8ffb0", fontSize: 15, fontWeight: "900", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 },
  revealTitle: { color: "#ffffff", fontSize: 30, lineHeight: 38, fontWeight: "900", marginBottom: 18 },
  headlineBox: { backgroundColor: "rgba(168,235,99,0.1)", borderRadius: 24, borderWidth: 1, borderColor: "rgba(168,235,99,0.24)", padding: 18, marginBottom: 18 },
  fullHeadline: { color: "#ffffff", fontSize: 25, lineHeight: 34, fontWeight: "900" },
  rewardRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  rewardPill: { backgroundColor: "#1a2232", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  rewardText: { color: "#d8ffb0", fontSize: 14, fontWeight: "900" },
  readBtn: { backgroundColor: "#a8eb63", paddingVertical: 18, borderRadius: 22, alignItems: "center", marginBottom: 12 },
  readBtnText: { color: "#071018", fontSize: 18, fontWeight: "900" },
  noLinkBox: { backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 18, padding: 14, marginBottom: 12 },
  noLinkText: { color: "#c7d2e1", fontSize: 14, textAlign: "center", fontWeight: "700" },
  doneBtn: { backgroundColor: "#2b3140", paddingVertical: 16, borderRadius: 20, alignItems: "center" },
  doneBtnText: { color: "#e2e7ee", fontSize: 16, fontWeight: "900" },
});