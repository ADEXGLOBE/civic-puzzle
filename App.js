import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import HomeScreen from "./screens/HomeScreen";
import LevelSelector from "./screens/LevelSelector";
import GameScreen from "./screens/GameScreen";
import CrosswordScreen from "./screens/CrosswordScreen";
import AboutScreen from "./screens/AboutScreen";
import LeaderboardScreen from "./screens/LeaderboardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import TermsScreen from "./screens/TermsScreen";
import AchievementsScreen from "./screens/AchievementsScreen";

import {
  registerForPushNotificationsAsync,
  scheduleDailyPuzzleReminder,
  scheduleEveningStreakReminder,
  scheduleDailyRewardReminder,
} from "./utils/notifications";

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    async function setupNotifications() {
      await registerForPushNotificationsAsync();
      await scheduleDailyPuzzleReminder();
      await scheduleEveningStreakReminder();
      await scheduleDailyRewardReminder();
    }

    setupNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#09101d" },
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="LevelSelector" component={LevelSelector} />
          <Stack.Screen name="GameScreen" component={GameScreen} />
          <Stack.Screen name="CrosswordScreen" component={CrosswordScreen} />
          <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="About" component={AboutScreen} />
          <Stack.Screen name="Terms" component={TermsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}