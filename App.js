// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import LevelSelector from './screens/LevelSelector';
import GameScreen from './screens/GameScreen';
import CrosswordScreen from './screens/CrosswordScreen';
import AboutScreen from './screens/AboutScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#0f172a' },
            headerTintColor: '#ffffff',
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: '#020617' }, // dark body behind screens
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Civic Puzzle' }}
          />
          <Stack.Screen
            name="LevelSelector"
            component={LevelSelector}
            options={{ title: 'Choose Puzzle' }}
          />
          <Stack.Screen
            name="GameScreen"
            component={GameScreen}
            options={{ title: 'Play Puzzle' }}
          />
          <Stack.Screen
            name="CrosswordScreen"
            component={CrosswordScreen}
            options={{ title: 'Crossword' }}
          />
          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{ title: 'About Civic Puzzle' }}
          />
          <Stack.Screen
            name="Leaderboard"
            component={LeaderboardScreen}
            options={{ title: 'Leaderboard' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
