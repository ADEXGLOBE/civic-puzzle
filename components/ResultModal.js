// components/ResultModal.js
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { colors, spacing, radius } from '../theme';

export default function ResultModal({ visible, headline, readMoreUrl, onClose, onRestart }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>🎉 Headline Revealed!</Text>
          <Text style={styles.headline}>{headline}</Text>

          <TouchableOpacity
            style={styles.readBtn}
            onPress={() => readMoreUrl && Linking.openURL(readMoreUrl)}
          >
            <Text style={styles.readText}>Read Full Story</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.actionBtn, styles.primary]} onPress={onRestart}>
              <Text style={styles.actionText}>Play Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.secondary]} onPress={onClose}>
              <Text style={styles.actionText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.lg, width: '88%' },
  title: { fontSize: 18, fontWeight: '800', marginBottom: spacing.sm, color: colors.charcoal, textAlign: 'center' },
  headline: { fontSize: 20, fontWeight: '700', color: colors.charcoal, textAlign: 'center', marginBottom: spacing.lg },
  readBtn: { backgroundColor: colors.accentYellow, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginBottom: spacing.md },
  readText: { fontWeight: '800', color: colors.charcoal },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, padding: spacing.md, borderRadius: radius.md, alignItems: 'center', marginHorizontal: spacing.xs },
  primary: { backgroundColor: colors.success },
  secondary: { backgroundColor: colors.primary },
  actionText: { color: 'white', fontWeight: '700' },
});
