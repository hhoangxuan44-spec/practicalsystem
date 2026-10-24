import { Tabs } from "expo-router";
import { Text } from "react-native";
import { usePalette } from "../../src/theme.ts";

const ICON: Record<string, string> = { index: "◷", map: "▦", capture: "＋", review: "❐", me: "☰" };

export default function TabsLayout() {
  const p = usePalette();
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: p.surface },
        headerTintColor: p.ink,
        headerTitleStyle: { fontWeight: "700" },
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.rule },
        tabBarActiveTintColor: p.accent,
        tabBarInactiveTintColor: p.muted,
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: route.name === "capture" ? 22 : 18 }}>{ICON[route.name]}</Text>,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "今日" }} />
      <Tabs.Screen name="map" options={{ title: "地图" }} />
      <Tabs.Screen name="capture" options={{ title: "上传" }} />
      <Tabs.Screen name="review" options={{ title: "复习" }} />
      <Tabs.Screen name="me" options={{ title: "诊断" }} />
    </Tabs>
  );
}
