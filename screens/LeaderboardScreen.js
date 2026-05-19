// screens/LeaderboardScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../theme';
import { API_BASE_URL } from '../config';
import { loadSettings } from './SettingsScreen';

export default function LeaderboardScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [city, setCity] = useState('Ballarat');

  const load = async () => {
    setLoading(true);
    try {
      const s = await loadSettings();
      setCity(s.city || 'Ballarat');

      const qs = new URLSearchParams();
      qs.set('city', s.city || 'Ballarat');
      const res = await fetch(`${API_BASE_URL}/api/leaderboard?${qs.toString()}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert('Error', 'Could not load leaderboard. Check API URL + server.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>🏆 Leaderboard — {city}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, idx) => `${item.playerName}-${item.score}-${idx}`}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.playerName}</Text>
                <Text style={styles.meta}>{item.mode || 'news'} • {new Date(item.ts).toLocaleString()}</Text>
              </View>
              <Text style={styles.score}>{item.score}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.muted}>No scores yet. Play a puzzle and submit!</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#020617', padding: spacing.lg },
  title: { color: 'white', fontSize: 20, fontWeight: '900', marginBottom: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: '#94a3b8', marginTop: spacing.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0b1220',
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.15)',
  },
  rank: { color: '#38bdf8', fontWeight: '900', width: 50 },
  name: { color: 'white', fontWeight: '900', fontSize: 16 },
  meta: { color: '#94a3b8', marginTop: 2, fontSize: 12 },
  score: { color: '#22c55e', fontWeight: '900', fontSize: 18 },
});
