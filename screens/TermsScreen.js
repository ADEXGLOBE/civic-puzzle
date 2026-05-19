// screens/TermsScreen.js
import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing, radius, colors } from "../theme";
import Constants from "expo-constants";

export default function TermsScreen() {
  const privacyUrl =
    Constants?.expoConfig?.extra?.privacyPolicyUrl || "https://YOUR_DOMAIN/privacy";

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.card}>
        <Text style={styles.h1}>Terms & Disclaimer</Text>

        <Text style={styles.p}>
          Civic Puzzle is a community engagement and entertainment app. By using this app, you agree to the terms below.
        </Text>

        <Text style={styles.h2}>Non-gambling & Rewards</Text>
        <Text style={styles.p}>
          • Civic Puzzle is NOT a gambling product.{"\n"}
          • No cash-out, wagering, or betting occurs in this app.{"\n"}
          • Any rewards or offers are promotional (e.g., discounts, vouchers, sponsor perks) and may vary by location.
        </Text>

        <Text style={styles.h2}>Content Sources</Text>
        <Text style={styles.p}>
          Puzzles may be generated from headlines or content feeds. We do not guarantee accuracy, completeness, or availability of any external content.
        </Text>

        <Text style={styles.h2}>Ads</Text>
        <Text style={styles.p}>
          This app may display third-party advertisements. Ads help support the app and keep it available.
        </Text>

        <Text style={styles.h2}>Privacy</Text>
        <Text style={styles.p}>
          Please review our Privacy Policy for details about what data we collect and how it’s used.
        </Text>

        <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(privacyUrl)}>
          <Text style={styles.btnText}>Open Privacy Policy</Text>
        </TouchableOpacity>

        <Text style={styles.small}>
          Last updated: {new Date().toLocaleDateString()}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#020617", padding: spacing.lg },
  card: {
    backgroundColor: "#0b1220",
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.15)",
  },
  h1: { color: "white", fontSize: 22, fontWeight: "900", marginBottom: spacing.sm },
  h2: { color: "white", fontSize: 16, fontWeight: "900", marginTop: spacing.lg, marginBottom: 6 },
  p: { color: "#cbd5e1", lineHeight: 20 },
  btn: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
  },
  btnText: { color: "white", fontWeight: "900" },
  small: { color: "#94a3b8", marginTop: spacing.lg, fontSize: 12 },
});
