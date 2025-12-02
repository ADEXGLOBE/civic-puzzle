// screens/AboutScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme';

export default function AboutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>About Civic Puzzle</Text>
      <Text style={styles.body}>
        Civic Puzzle turns headlines into engaging word puzzles that reveal the story as you play.
        Built for councils, schools, and communities to boost civic awareness and participation.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '800', marginBottom: spacing.md, color: '#111' },
  body: { color: '#374151', lineHeight: 22 },
});
