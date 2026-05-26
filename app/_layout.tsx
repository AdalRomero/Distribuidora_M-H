import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";
import { AuthProvider } from "../src/context/AuthContext";
import { SettingsProvider } from "../src/context/SettingsContext";
import { IntegrityProvider } from "../src/context/IntegrityContext";
import { GlobalHotkeyListener } from "../components/GlobalHotkeyListener";
import { RealtimeProvider } from "../src/provider/RealtimeProvider";

export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <IntegrityProvider>
          <RealtimeProvider>
            <GlobalHotkeyListener />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="(main)" />
              <Stack.Screen name="(dev)" />
            </Stack>
            <StatusBar style="auto" />
          </RealtimeProvider>
        </IntegrityProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
