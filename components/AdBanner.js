// components/AdBanner.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

export default function AdBanner() {
  // Placeholder banner – later we can wire real AdMob in a dev build
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Civic Puzzle · Sponsor space</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.softBorder,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  text: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
});
