// 能力地图的着色规则：掌握度 / 记忆保持 / 证据量三种视角。

import type { Level, NodeState } from "@ps/core";
import { LEVEL_COLOR, pct } from "../lib/format.ts";

export type ColorMode = "mastery" | "retention" | "evidence";

export const COLOR_MODES: { key: ColorMode; label: string; hint: string }[] = [
  { key: "mastery", label: "掌握度", hint: "由做题记录算出，越久没练越往中间回落" },
  { key: "retention", label: "记忆保持", hint: "这个题型的记忆卡现在还记得多少" },
  { key: "evidence", label: "证据量", hint: "有多少次做题记录，颜色越深越可信" },
];

/** 证据量用单一蓝色由浅到深 */
const EVIDENCE_RAMP = ["#b7d3f6", "#86b6ef", "#5598e7", "#256abf"];

export interface TileLook {
  color: string;
  level: Level;
  value: string;
  /** 证据太少，用虚线框表示 */
  dashed: boolean;
  /** 没有任何数据，用斜纹表示 */
  empty: boolean;
}

export function tileLook(s: NodeState, mode: ColorMode): TileLook {
  if (mode === "retention") {
    if (s.retention === null) return { color: LEVEL_COLOR.none, level: "none", value: s.cardCount ? "未复习" : "无卡片", dashed: false, empty: true };
    const level: Level = s.retention >= 0.85 ? "good" : s.retention >= 0.7 ? "warn" : "bad";
    return { color: LEVEL_COLOR[level], level, value: `${pct(s.retention)}%`, dashed: false, empty: false };
  }
  if (mode === "evidence") {
    if (s.count === 0) return { color: LEVEL_COLOR.none, level: "none", value: "0 次", dashed: false, empty: true };
    const idx = s.count >= 5 ? 3 : s.count >= 3 ? 2 : s.count === 2 ? 1 : 0;
    return { color: EVIDENCE_RAMP[idx], level: s.level, value: `${s.count} 次`, dashed: false, empty: false };
  }
  if (s.mastery === null) return { color: LEVEL_COLOR.none, level: "none", value: "未测", dashed: false, empty: true };
  return { color: LEVEL_COLOR[s.level], level: s.level, value: pct(s.mastery), dashed: s.confidence === "low", empty: false };
}

export function shortName(name: string): string {
  return name.replace(/（.*?）/g, "").trim();
}

export const EVIDENCE_LEGEND = [
  { label: "1 次", color: EVIDENCE_RAMP[0] },
  { label: "2 次", color: EVIDENCE_RAMP[1] },
  { label: "3–4 次", color: EVIDENCE_RAMP[2] },
  { label: "5 次以上", color: EVIDENCE_RAMP[3] },
];
