// screens/GameScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { colors, spacing, radius } from '../theme';
import AdBanner from '../components/AdBanner';

const EXTRA_LETTERS = 3; // random noise letters

export default function GameScreen() {
  const route = useRoute();
  const puzzleData = route?.params?.puzzleData;

  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState([]);
  const [shuffledLetters, setShuffledLetters] = useState([]);
  const [userAnswer, setUserAnswer] = useState([]);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(60);
  const [completedSentence, setCompletedSentence] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Parse the real answer into words
  useEffect(() => {
    if (puzzleData?.answer) {
      const wordArray = puzzleData.answer.trim().split(/\s+/);
      setWords(wordArray);
    }
  }, [puzzleData]);

  // Load a new word when index changes
  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length) {
      const word = words[currentIndex];
      const letters = word.split('');
      const withNoise = addNoiseLetters(letters, EXTRA_LETTERS);
      setCurrentWord(letters);
      setShuffledLetters(shuffleArray(withNoise));
      setUserAnswer([]);
    }
  }, [currentIndex, words]);

  // Timer
  useEffect(() => {
    const id = setInterval(() => {
      setTimer(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const shuffleArray = (arr) => [...arr].sort(() => Math.random() - 0.5);

  const addNoiseLetters = (letters, count) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const out = [...letters];
    for (let i = 0; i < count; i++) {
      const rand = alphabet[Math.floor(Math.random() * alphabet.length)];
      out.push(rand);
    }
    return out;
  };

  const handleLetterPress = (letter, index) => {
    const updated = [...shuffledLetters];
    updated.splice(index, 1);
    setShuffledLetters(updated);
    setUserAnswer([...userAnswer, letter]);
  };

  const undoLast = () => {
    if (userAnswer.length === 0) return;
    const last = userAnswer[userAnswer.length - 1];
    setUserAnswer(userAnswer.slice(0, -1));
    setShuffledLetters([...shuffledLetters, last]);
  };

  const checkAnswer = () => {
    const correctWord = currentWord.join('');
    const userWord = userAnswer.join('');

    if (userWord.length !== correctWord.length) {
      return Alert.alert('Almost!', 'Fill all boxes before submitting.');
    }

    if (correctWord === userWord) {
      setScore(score + 10);
      const newSentence = (completedSentence + ' ' + correctWord).trim();
      setCompletedSentence(newSentence);

      if (currentIndex < words.length - 1) {
        Alert.alert('✅ Correct!', 'Tap NEXT to continue.');
      } else {
        setGameComplete(true);
        Alert.alert('🎉 All Done!', `${newSentence}\n\nRead More`, [
          {
            text: 'Read Full Story',
            onPress: () => {
              if (puzzleData?.readMoreUrl) {
                Linking.openURL(puzzleData.readMoreUrl);
              }
            },
          },
        ]);
      }
    } else {
      Alert.alert('❌ Incorrect', 'Try reshuffling or use a hint.');
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowHint(false);
    }
  };

  const renderLetter = ({ item, index }) => (
    <TouchableOpacity
      style={styles.letterBox}
      onPress={() => handleLetterPress(item, index)}
    >
      <Text style={styles.letter}>{item}</Text>
    </TouchableOpacity>
  );

  if (!puzzleData || !puzzleData.answer) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.headline}>No puzzle data available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.timer}>
          ⏱ {timer}s   •   🎯 Score: {score}
        </Text>

        {/* Scrambled letters row */}
        <FlatList
          data={shuffledLetters}
          renderItem={renderLetter}
          keyExtractor={(item, idx) => `${item}-${idx}`}
          horizontal
          style={styles.letterList}
          contentContainerStyle={styles.letterListContainer}
          showsHorizontalScrollIndicator={false}
        />

        {/* Drop zone with fixed letter slots */}
        <View style={styles.answerBox}>
          {currentWord.map((_, idx) => (
            <View key={idx} style={styles.slot}>
              <Text style={styles.answerLetter}>{userAnswer[idx] || ''}</Text>
            </View>
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={undoLast}>
            <Text style={styles.secondaryText}>Undo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setShowHint(h => !h)}
          >
            <Text style={styles.secondaryText}>
              {showHint ? 'Hide Hint' : 'Show Hint'}
            </Text>
          </TouchableOpacity>
        </View>

        {showHint && (
          <Text style={styles.hint}>
            💡 Hint: {puzzleData.hint || 'Think about the headline context.'}
          </Text>
        )}

        <TouchableOpacity style={styles.checkButton} onPress={checkAnswer}>
          <Text style={styles.checkText}>Check</Text>
        </TouchableOpacity>

        {userAnswer.join('') === currentWord.join('') && !gameComplete && (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        )}

        {/* Banner */}
        <View style={{ marginTop: spacing.sm, paddingBottom: spacing.lg }}>
          <AdBanner />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  timer: {
    fontSize: 14,
    color: '#e5e7eb',
    marginBottom: spacing.md,
  },
  letterList: {
    maxHeight: 80,
    marginBottom: spacing.md,
  },
  letterListContainer: {
    alignItems: 'center',
  },
  letterBox: {
    backgroundColor: colors.card,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.softBorder,
  },
  letter: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.charcoal,
  },
  answerBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
    minHeight: 50,
  },
  slot: {
    width: 32,
    height: 42,
    marginHorizontal: 3,
    borderRadius: radius.sm,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: colors.softBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  answerLetter: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e5e7eb',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  secondaryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.softBorder,
    backgroundColor: '#020617',
  },
  secondaryText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    color: '#facc15',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  checkButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.xl,
    alignItems: 'center',
    width: '80%',
    marginBottom: 8,
  },
  checkText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: radius.xl,
    alignItems: 'center',
    width: '80%',
  },
  nextText: {
    color: '#022c22',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headline: {
    fontSize: 18,
    color: '#e5e7eb',
    textAlign: 'center',
  },
});
