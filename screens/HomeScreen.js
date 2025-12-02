// screens/HomeScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from 'react-native';
import { colors, spacing, radius } from '../theme';

export default function HomeScreen({ navigation }) {
  return (
    <ImageBackground source={require('../assets/news-bg.jpg')} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay}>
        <Text style={styles.title}>🧠 Civic Puzzle</Text>
        <Text style={styles.subtitle}>Play your news. Discover and engage your community.</Text>

        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('LevelSelector')}>
          <Text style={styles.btnText}>Play Now</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={() => navigation.navigate('About')}>
          <Text style={styles.btnText}>About</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', padding: spacing.lg },
  title: { fontSize: 38, color: '#fff', fontWeight: '800', marginBottom: spacing.sm },
  subtitle: { color: '#fff', textAlign: 'center', marginBottom: spacing.xl },
  btn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: radius.lg, width: '70%', alignItems: 'center', marginBottom: spacing.md },
  btnText: { color: 'white', fontSize: 18, fontWeight: '800' },
  secondary: { backgroundColor: colors.success },
});
