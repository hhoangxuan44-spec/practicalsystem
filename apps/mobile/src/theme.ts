// 颜色与网页版一致：蓝墨水强调色，状态色只表示掌握程度。

import { useColorScheme } from "react-native";
import type { Level, ResultCode } from "@ps/core";

const light = {
  bg: "#f2f4f8",
  surface: "#ffffff",
  surface2: "#f6f7fa",
  surface3: "#eceff5",
  ink: "#141b2d",
  ink2: "#4a5370",
  muted: "#767e96",
  rule: "#e1e5ee",
  ruleStrong: "#c8cedb",
  accent: "#2948c7",
  accentInk: "#ffffff",
  accentSoft: "#e8edfc",
  badInk: "#b42828",
  goodInk: "#006300",
  warnBg: "#fdf0d2",
};

const dark: typeof light = {
  bg: "#0e121b",
  surface: "#161b27",
  surface2: "#1b2130",
  surface3: "#232a3b",
  ink: "#e7eaf2",
  ink2: "#b5bccf",
  muted: "#8a91a8",
  rule: "#283043",
  ruleStrong: "#3a4359",
  accent: "#7d95ff",
  accentInk: "#0e121b",
  accentSoft: "#1f2846",
  badInk: "#ff7b6b",
  goodInk: "#2fc22f",
  warnBg: "#3a2f14",
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

export const LEVEL_COLOR: Record<Level, string> = { good: "#0ca30c", warn: "#fab219", bad: "#d03b3b", none: "#a3a9ba" };
export const LEVEL_LABEL: Record<Level, string> = { good: "掌握", warn: "不稳", bad: "薄弱", none: "未测" };
export const LEVEL_GLYPH: Record<Level, string> = { good: "✓", warn: "!", bad: "✕", none: "–" };

export const RESULT_COLOR: Record<ResultCode, string> = {
  ok: "#2a78d6",
  calc: "#eb6834",
  method: "#1baf7a",
  concept: "#eda100",
  partial: "#e87ba4",
  blank: "#a3a9ba",
};
export const RESULT_DISPLAY: ResultCode[] = ["ok", "calc", "method", "concept", "partial", "blank"];
