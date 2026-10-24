// App 的通用组件。

import { getNode, mathTextToPlain, RESULT_META, type Level, type ResultCode } from "@ps/core";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LEVEL_COLOR, LEVEL_GLYPH, LEVEL_LABEL, RESULT_COLOR, usePalette } from "./theme.ts";

export function Screen({ children }: { children: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom, gap: 14 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return <View style={[{ backgroundColor: p.surface, borderColor: p.rule, borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 }, style]}>{children}</View>;
}

export function H1({ children }: { children: ReactNode }) {
  const p = usePalette();
  return <Text style={{ fontSize: 24, fontWeight: "700", color: p.ink }}>{children}</Text>;
}

export function H2({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: p.ink }}>{children}</Text>
      {right}
    </View>
  );
}

export function T({ children, tone = "ink", size = 14, bold, style, lines }: { children: ReactNode; tone?: "ink" | "ink2" | "muted" | "accent" | "bad"; size?: number; bold?: boolean; style?: object; lines?: number }) {
  const p = usePalette();
  const color = tone === "ink" ? p.ink : tone === "ink2" ? p.ink2 : tone === "muted" ? p.muted : tone === "accent" ? p.accent : p.badInk;
  return (
    <Text numberOfLines={lines} style={[{ color, fontSize: size, lineHeight: size * 1.5, fontWeight: bold ? "700" : "400" }, style]}>
      {children}
    </Text>
  );
}

/** 含 $...$ 公式的文字：App 里转成可读的纯文本 */
export function MathT(props: { text: string; tone?: "ink" | "ink2" | "muted"; size?: number; lines?: number }) {
  return <T tone={props.tone} size={props.size} lines={props.lines}>{mathTextToPlain(props.text ?? "")}</T>;
}

export function Btn({ title, onPress, kind = "default", disabled, small }: { title: string; onPress: () => void; kind?: "default" | "primary" | "danger" | "ghost"; disabled?: boolean; small?: boolean }) {
  const p = usePalette();
  const bg = kind === "primary" ? p.accent : kind === "ghost" ? "transparent" : p.surface;
  const fg = kind === "primary" ? p.accentInk : kind === "danger" ? p.badInk : p.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: bg,
        borderColor: kind === "primary" ? p.accent : kind === "ghost" ? "transparent" : p.ruleStrong,
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: small ? 6 : 11,
        paddingHorizontal: small ? 10 : 16,
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        alignItems: "center",
      })}
    >
      <Text style={{ color: fg, fontWeight: kind === "primary" ? "700" : "500", fontSize: small ? 13 : 15 }}>{title}</Text>
    </Pressable>
  );
}

export function LevelPill({ level, value }: { level: Level; value?: string }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: LEVEL_COLOR[level], alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: level === "warn" ? "#141b2d" : "#fff", fontSize: 10, fontWeight: "800" }}>{LEVEL_GLYPH[level]}</Text>
      </View>
      <Text style={{ color: p.ink2, fontSize: 12 }}>{LEVEL_LABEL[level]}</Text>
      {value ? <Text style={{ color: p.ink, fontSize: 13, fontWeight: "700" }}>{value}</Text> : null}
    </View>
  );
}

export function ResultPill({ result, onPress }: { result: ResultCode; onPress?: () => void }) {
  const p = usePalette();
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderColor: p.ruleStrong, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: RESULT_COLOR[result] }} />
      <Text style={{ color: p.ink2, fontSize: 12 }}>{RESULT_META[result].label}</Text>
    </View>
  );
  return onPress ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`修改判定，当前${RESULT_META[result].label}`}>{body}</Pressable> : body;
}

export function NodeChip({ id }: { id: string }) {
  const p = usePalette();
  const n = getNode(id);
  if (!n) return null;
  return (
    <Pressable onPress={() => router.push(`/node/${id}`)} style={{ borderWidth: 1, borderColor: p.ruleStrong, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
      <Text style={{ color: p.ink2, fontSize: 12 }}>{n.name.replace(/（.*?）/g, "")}</Text>
    </Pressable>
  );
}

export function Badge({ text, tone = "plain" }: { text: string; tone?: "plain" | "accent" | "good" | "bad" | "warn" }) {
  const p = usePalette();
  const bg = tone === "accent" ? p.accentSoft : tone === "good" ? "rgba(12,163,12,0.14)" : tone === "bad" ? "rgba(208,59,59,0.14)" : tone === "warn" ? p.warnBg : p.surface3;
  const fg = tone === "accent" ? p.accent : tone === "good" ? p.goodInk : tone === "bad" ? p.badInk : p.ink2;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, alignSelf: "flex-start" }}>
      <Text style={{ color: fg, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

export function Meter({ value, color }: { value: number | null; color?: string }) {
  const p = usePalette();
  const v = Math.max(0, Math.min(1, value ?? 0));
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: p.surface3, overflow: "hidden" }}>
      <View style={{ width: `${v * 100}%`, height: 6, borderRadius: 3, backgroundColor: color ?? p.accent }} />
    </View>
  );
}

export function Row({ children, gap = 8, wrap, between }: { children: ReactNode; gap?: number; wrap?: boolean; between?: boolean }) {
  return <View style={{ flexDirection: "row", alignItems: "center", gap, flexWrap: wrap ? "wrap" : "nowrap", justifyContent: between ? "space-between" : "flex-start" }}>{children}</View>;
}

export function Loading({ error }: { error?: Error }) {
  const p = usePalette();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: p.bg, padding: 24, gap: 12 }}>
      {error ? <T tone="bad">{error.message}</T> : <ActivityIndicator color={p.accent} />}
    </View>
  );
}

export function Seg<K extends string>({ value, options, onChange }: { value: K; options: [K, string][]; onChange: (k: K) => void }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: "row", backgroundColor: p.surface3, borderRadius: 9, padding: 3, gap: 2, alignSelf: "flex-start", flexWrap: "wrap" }}>
      {options.map(([k, label]) => (
        <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="button" accessibilityState={{ selected: value === k }} style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 7, backgroundColor: value === k ? p.surface : "transparent" }}>
          <Text style={{ color: value === k ? p.ink : p.ink2, fontWeight: value === k ? "700" : "400", fontSize: 13 }}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export const s = StyleSheet.create({
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
});
