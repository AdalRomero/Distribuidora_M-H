import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { AuthProvider } from "../src/context/AuthContext";
import { SettingsProvider } from "../src/context/SettingsContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(dev)" />
        </Stack>
        <StatusBar style="auto" />
      </SettingsProvider>
    </AuthProvider>
  );
}
