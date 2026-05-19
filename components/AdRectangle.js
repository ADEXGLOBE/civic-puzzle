import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function AdRectangle() {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Sponsored</Text>
      <Text style={styles.title}>Ad Space</Text>
      <Text style={styles.sub}>
        This rectangle can later connect to AdMob or sponsor campaigns.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 120,
    borderRadius: 24,
    backgroundColor: "rgba(10,18,30,0.9)",
    borderWidth: 1,
    borderColor: "rgba(184,242,123,0.18)",
    padding: 18,
    justifyContent: "center",
    marginVertical: 14,
  },
  label: {
    color: "#a8eb63",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  sub: {
    color: "#b5c3d6",
    fontSize: 14,
    lineHeight: 20,
  },
});