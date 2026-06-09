import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function setupAndroidChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#a8eb63",
  });

  await Notifications.setNotificationChannelAsync("daily", {
    name: "Daily Reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#a8eb63",
  });

  await Notifications.setNotificationChannelAsync("rewards", {
    name: "Rewards",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#ffd84d",
  });

  await Notifications.setNotificationChannelAsync("streaks", {
    name: "Streaks",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#ff7a7a",
  });
}

export async function registerForPushNotificationsAsync() {
  try {
    await setupAndroidChannels();

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

    return token;
  } catch (error) {
    console.log("Notification registration failed:", error.message);
    return null;
  }
}

export async function scheduleDailyPuzzleReminder() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🧩 Civic Puzzle is ready",
        body: "Your local news puzzle is waiting. Solve it and keep your streak alive.",
        sound: true,
      },
      trigger: {
        channelId: "daily",
        hour: 8,
        minute: 0,
        repeats: true,
      },
    });
  } catch (error) {
    console.log("Daily puzzle reminder failed:", error.message);
  }
}

export async function scheduleDailyRewardReminder() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🎁 Daily reward available",
        body: "Open Civic Puzzle and claim today’s coins and XP.",
        sound: true,
      },
      trigger: {
        channelId: "rewards",
        hour: 10,
        minute: 0,
        repeats: true,
      },
    });
  } catch (error) {
    console.log("Daily reward reminder failed:", error.message);
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
        channelId: "streaks",
        hour: 19,
        minute: 0,
        repeats: true,
      },
    });
  } catch (error) {
    console.log("Evening reminder failed:", error.message);
  }
}

export async function scheduleLocalHeadlineReminder(city = "your area") {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "📍 New local headline puzzle",
        body: `A new Civic Puzzle is ready for ${city}.`,
        sound: true,
      },
      trigger: {
        channelId: "daily",
        hour: 12,
        minute: 30,
        repeats: true,
      },
    });
  } catch (error) {
    console.log("Local headline reminder failed:", error.message);
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
        channelId: "default",
        seconds: 5,
      },
    });
  } catch (error) {
    console.log("Test notification failed:", error.message);
  }
}

export async function clearAllScheduledNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log("Clear notifications failed:", error.message);
  }
}