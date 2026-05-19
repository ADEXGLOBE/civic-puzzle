// adsConfig.js
import { Platform } from "react-native";

// IMPORTANT:
// - Use TEST IDs in development (__DEV__) to avoid invalid traffic violations.
// - Use REAL AdMob IDs in production builds.
// Replace the REAL_* placeholders with your own AdMob IDs.

const TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111"; // Google test banner

const REAL_ANDROID_BANNER_ID = "ca-app-pub-XXXXXXXXXXXXXXX/ANDROID_BANNER_XXXXXXXX";
const REAL_IOS_BANNER_ID = "ca-app-pub-XXXXXXXXXXXXXXX/IOS_BANNER_XXXXXXXX";

export const BANNER_AD_UNIT_ID = __DEV__
  ? TEST_BANNER_ID
  : Platform.select({
      android: REAL_ANDROID_BANNER_ID,
      ios: REAL_IOS_BANNER_ID,
      default: TEST_BANNER_ID,
    });
