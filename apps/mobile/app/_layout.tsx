import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConnProvider } from "../src/conn.tsx";
import { usePalette } from "../src/theme.ts";

function Nav() {
  const p = usePalette();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: p.surface },
        headerTintColor: p.ink,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: p.bg },
        headerBackTitle: "返回",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="node/[id]" options={{ title: "题型档案" }} />
      <Stack.Screen name="entry/[id]" options={{ title: "学习记录" }} />
      <Stack.Screen name="settings" options={{ title: "设置" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConnProvider>
        <StatusBar style="auto" />
        <Nav />
      </ConnProvider>
    </SafeAreaProvider>
  );
}
