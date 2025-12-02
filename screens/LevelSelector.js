// screens/LevelSelector.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme';
import AdBanner from '../components/AdBanner';

// 🔧 Replace with your IPv4 (NO spaces)
const BASE_URL = 'http://172.18.57.192:5000';

export default function LevelSelector({ navigation }) {
  const [mode, setMode] = useState('news'); // 'news' | 'facts' | 'crossword'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const load = async (whichMode) => {
    setLoading(true);
    setErr('');

    try {
      if (whichMode === 'crossword') {
        const res = await fetch(`${BASE_URL}/api/crosswords`);
        const data = await res.json();
        setItems(Array.isArray(data) && data.length > 0
          ? data
          : [
              {
                id: 'cw-placeholder',
                title: "Today’s Crossword",
                headline: 'Sample grid based on local headlines',
                readMoreUrl: '',
              },
            ]);
      } else {
        const endpoint = whichMode === 'facts' ? 'facts' : 'puzzles';
        const res = await fetch(`${BASE_URL}/api/${endpoint}`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.log('Fetch error:', e);
      setErr('Failed to fetch data from server.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(mode);
  }, [mode]);

  const onPressItem = (item, index) => {
    if (mode === 'crossword') {
      navigation.navigate('CrosswordScreen', {
        crosswordMeta: item,
        index,
      });
    } else {
      navigation.navigate('GameScreen', { puzzleData: item });
    }
  };

  const renderItem = ({ item, index }) => {
    const isCrossword = mode === 'crossword';

    const title = isCrossword
      ? item.title || "Today’s Crossword"
      : mode === 'news'
      ? `Headline ${index + 1}`
      : `Fact ${index + 1}`;

    const sub = isCrossword
      ? item.headline || 'Grid-style puzzle built from headlines.'
      : 'Tap to play and reveal the full story.';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPressItem(item, index)}
      >
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{sub}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <View style={styles.screen}>
        {/* Toggle row */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'news' && styles.toggleActive]}
            onPress={() => setMode('news')}
          >
            <Text
              style={[
                styles.toggleText,
                mode === 'news' && styles.toggleTextActive,
              ]}
            >
              Headlines
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'facts' && styles.toggleActive]}
            onPress={() => setMode('facts')}
          >
            <Text
              style={[
                styles.toggleText,
                mode === 'facts' && styles.toggleTextActive,
              ]}
            >
              Facts Mode
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toggleBtn,
              mode === 'crossword' && styles.toggleActive,
            ]}
            onPress={() => setMode('crossword')}
          >
            <Text
              style={[
                styles.toggleText,
                mode === 'crossword' && styles.toggleTextActive,
              ]}
            >
              Crosswords
            </Text>
          </TouchableOpacity>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>
          {mode === 'news'
            ? '📰 Play today’s Civic Headlines'
            : mode === 'facts'
            ? '⭐ Play Civic Facts Mode'
            : '🧩 Grid Crosswords from Civic Headlines'}
        </Text>
        <Text style={styles.helper}>
          Solve each puzzle to uncover the full headline. Hints are auto-generated
          to help you along.
        </Text>

        {/* List / loader / error */}
        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.muted}>Loading puzzles…</Text>
            </View>
          ) : err ? (
            <View style={styles.center}>
              <Text style={[styles.muted, { color: colors.error }]}>{err}</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.muted}>
                No items yet. Add some via the admin page.
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item, idx) => String(item.id ?? idx)}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: spacing.lg }}
            />
          )}
        </View>

        {/* Banner, lifted above nav bar */}
        <View style={styles.bannerWrap}>
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
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  toggleBtn: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.softBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
  },
  toggleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  toggleText: {
    fontWeight: '700',
    color: colors.charcoal,
    fontSize: 13,
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#e5e7eb',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  helper: {
    fontSize: 13,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  listContainer: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.softBorder,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.charcoal,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
  },
  muted: {
    color: '#9ca3af',
    fontSize: 14,
  },
  bannerWrap: {
    marginTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
});
