const PRODUCTION_API_URL = "https://civic-puzzle.onrender.com";

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || PRODUCTION_API_URL
).replace(/\/$/, "");

export const DEFAULT_SETTINGS = {
  city: "Ballarat",
  playerName: "Player",
  puzzleFeedUrl: "",
  locationMode: "manual",
  newsRadius: "local",
};
