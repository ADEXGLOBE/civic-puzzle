import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";
import Constants from "expo-constants";

const adUnitId =
  __DEV__
    ? TestIds.BANNER
    : Platform.OS === "android"
    ? Constants.expoConfig?.extra?.admob?.androidBannerId
    : Constants.expoConfig?.extra?.admob?.iosBannerId;

export default function AdRectangle() {
  try {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Sponsored</Text>

        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.MEDIUM_RECTANGLE}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
        />
      </View>
    );
  } catch (err) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Sponsored</Text>
        <Text style={styles.title}>Ad Space</Text>
        <Text style={styles.sub}>
          AdMob unavailable. Showing fallback sponsor area.
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 12,
  },

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
    marginBottom: 8,
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