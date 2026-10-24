// 能力地图：按章节排列的题型格子，掌握度 / 记忆保持两种着色。

import { type MapView, type NodeState } from "@ps/core";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useQuery } from "../../src/conn.tsx";
import { LEVEL_COLOR, LEVEL_GLYPH, usePalette } from "../../src/theme.ts";
import { Card, Loading, Row, Screen, Seg, T } from "../../src/ui.tsx";

type Mode = "mastery" | "retention";

function look(s: NodeState, mode: Mode) {
  if (mode === "retention") {
    if (s.retention === null) return { color: LEVEL_COLOR.none, level: "none" as const, value: s.cardCount ? "未复习" : "无卡" };
    const level = s.retention >= 0.85 ? "good" : s.retention >= 0.7 ? "warn" : "bad";
    return { color: LEVEL_COLOR[level], level, value: `${Math.round(s.retention * 100)}%` } as const;
  }
  if (s.mastery === null) return { color: LEVEL_COLOR.none, level: "none" as const, value: "未测" };
  return { color: LEVEL_COLOR[s.level], level: s.level, value: String(Math.round(s.mastery * 100)) };
}

export default function MapScreen() {
  const p = usePalette();
  const [mode, setMode] = useState<Mode>("mastery");
  const { data, error } = useQuery<MapView>("map", (a, t) => a.map(t));
  if (!data) return <Loading error={error} />;
  return (
    <Screen>
      <Row between>
        <T tone="ink2" size={13}>已测 {data.overview.tested}/{data.overview.total} · 重点掌握 {data.overview.key.good}/{data.overview.key.total}</T>
      </Row>
      <Seg value={mode} onChange={setMode} options={[["mastery", "掌握度"], ["retention", "记忆保持"]]} />
      <T tone="muted" size={12}>虚线框：证据还少；灰色：没有数据。点题型看档案。</T>
      {data.chapters.map((ch) => (
        <Card key={ch.id}>
          <Row between>
            <T bold>{ch.name}</T>
            <T tone="muted" size={12}>平均 {ch.avg === null ? "—" : Math.round(ch.avg * 100)} · 已测 {ch.tested}/{ch.total}</T>
          </Row>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ch.nodes.map((s) => {
              const l = look(s, mode);
              const dashed = mode === "mastery" && s.confidence === "low";
              return (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/node/${s.id}`)}
                  accessibilityLabel={`${s.name}，${l.value}`}
                  style={{ width: "48%", borderWidth: 1.5, borderStyle: dashed ? "dashed" : "solid", borderColor: l.level === "none" ? p.ruleStrong : l.color, borderRadius: 10, padding: 9, gap: 6, backgroundColor: l.level === "none" ? p.surface2 : `${l.color}22` }}
                >
                  <Text style={{ color: p.ink, fontSize: 13 }} numberOfLines={2}>{s.name.replace(/（.*?）/g, "")}</Text>
                  <Row gap={6}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: l.color, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ color: l.level === "warn" ? "#141b2d" : "#fff", fontSize: 10, fontWeight: "800" }}>{LEVEL_GLYPH[l.level]}</Text>
                    </View>
                    <Text style={{ color: p.ink, fontWeight: "700" }}>{l.value}</Text>
                    <Text style={{ color: p.muted, fontSize: 11, marginLeft: "auto" }}>{"★".repeat(s.freq)}</Text>
                  </Row>
                </Pressable>
              );
            })}
          </View>
        </Card>
      ))}
    </Screen>
  );
}
