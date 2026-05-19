// config.js
import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * API_BASE_URL selection strategy:
 * 1) If EXPO_PUBLIC_API_URL is set (recommended for production builds), use it.
 * 2) In dev:
 *    - Real device: infer the Metro host IP and point to http://<host>:5000
 *    - Android emulator: http://10.0.2.2:5000
 *    - iOS simulator: http://localhost:5000
 */
const envUrl = process.env.EXPO_PUBLIC_API_URL;

function inferMetroHostIp() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.hostUri ||
    Constants.manifest?.hostUri ||
    Constants.manifest?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  // hostUri/debuggerHost typically looks like "192.168.1.10:8081"
  if (typeof hostUri === "string" && hostUri.includes(":")) {
    return hostUri.split(":")[0];
  }
  return null;
}

function devFallback() {
  const inferredHost = inferMetroHostIp();
  if (inferredHost) return `http://${inferredHost}:5000`;

  // Android emulator uses 10.0.2.2 to access your machine's localhost
  if (Platform.OS === "android") return "http://10.0.2.2:5000";
  return "http://localhost:5000";
}

export const API_BASE_URL = envUrl && envUrl.trim() ? envUrl.trim() : devFallback();

export const DEFAULT_SETTINGS = {
  city: "Ballarat",
  playerName: "Player",
  puzzleFeedUrl: "", // optional; passed to backend as sourceUrl for /api/puzzles
};
