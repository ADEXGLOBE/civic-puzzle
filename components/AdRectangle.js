import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Constants from "expo-constants";
import { getMobileAds } from "../utils/mobileAds";

const mobileAds = getMobileAds();

export default function AdRectangle() {
  if (mobileAds) {
    const { BannerAd, BannerAdSize, TestIds } = mobileAds;
    const unitId = __DEV__
      ? TestIds.BANNER
      : Platform.OS === "android"
      ? Constants.expoConfig?.extra?.admob?.androidBannerId
      : Constants.expoConfig?.extra?.admob?.iosBannerId;

    if (unitId) {
      return (
        <View style={styles.container}>
          <Text style={styles.label}>Sponsored</Text>
          <BannerAd
            unitId={unitId}
            size={BannerAdSize.MEDIUM_RECTANGLE}
            requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          />
        </View>
      );
    }
  }

  return (
    <View style={styles.fallback}>
      <Text style={styles.label}>Sponsored</Text>
      <Text style={styles.title}>LAXA Technology</Text>
      <Text style={styles.subtitle}>Civic technology that turns news into participation.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", marginVertical: 12 },
  fallback: {
    minHeight: 110,
    borderRadius: 20,
    backgroundColor: "rgba(10,18,30,0.9)",
    borderWidth: 1,
    borderColor: "rgba(184,242,123,0.18)",
    padding: 18,
    justifyContent: "center",
    marginVertical: 12,
  },
  label: { color: "#a8eb63", fontSize: 12, fontWeight: "900", marginBottom: 7 },
  title: { color: "#fff", fontSize: 20, fontWeight: "900", marginBottom: 4 },
  subtitle: { color: "#b5c3d6", fontSize: 14, lineHeight: 20 },
});
