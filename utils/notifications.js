import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  try {
    if (!Device.isDevice) {
      console.log("Push notifications require a physical device.");
      return null;
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (existing.status !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      console.log("Notification permission not granted.");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    console.log("Expo push token:", token);

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#a8eb63",
      });
    }

    return token;
  } catch (error) {
    console.log("Notification registration failed:", error.message);
    return null;
  }
}

export async function scheduleDailyPuzzleReminder() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🧩 Civic Puzzle is ready",
        body: "Your daily news puzzle is waiting. Solve it and keep your streak alive.",
        sound: true,
      },
      trigger: {
        hour: 8,
        minute: 0,
        repeats: true,
      },
    });
  } catch (error) {
    console.log("Daily reminder failed:", error.message);
  }
}

export async function scheduleEveningStreakReminder() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔥 Keep your Civic Puzzle streak",
        body: "Complete today’s challenge before the day ends.",
        sound: true,
      },
      trigger: {
        hour: 19,
        minute: 0,
        repeats: true,
      },
    });
  } catch (error) {
    console.log("Evening reminder failed:", error.message);
  }
}

export async function sendTestNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "✅ Civic Puzzle test notification",
        body: "Notifications are working correctly.",
        sound: true,
      },
      trigger: {
        seconds: 5,
      },
    });
  } catch (error) {
    console.log("Test notification failed:", error.message);
  }
}