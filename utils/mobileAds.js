import Constants from "expo-constants";

export const isExpoGo =
  Constants.appOwnership === "expo" ||
  Constants.executionEnvironment === "storeClient";

export function getMobileAds() {
  if (isExpoGo) return null;

  try {
    return require("react-native-google-mobile-ads");
  } catch (error) {
    console.log("Google Mobile Ads unavailable:", error?.message || error);
    return null;
  }
}
