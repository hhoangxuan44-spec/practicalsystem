// 诊断：薄弱点排名、错因构成、盲区、本周概况，以及设置入口。

import { RESULT_META, type DiagnosisView, type WeeklyReport } from "@ps/core";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useConn, useQuery } from "../../src/conn.tsx";
import { RESULT_COLOR, RESULT_DISPLAY, usePalette } from "../../src/theme.ts";
import { Btn, Card, H2, LevelPill, Loading, NodeChip, Row, Screen, T } from "../../src/ui.tsx";

export default function Me() {
  const p = usePalette();
  const { config, aiEnabled } = useConn();
  const { data, error } = useQuery<DiagnosisView>("diagnosis", (a, t) => a.diagnosis(t));
  const week = useQuery<WeeklyReport>("weekly", (a, t) => a.weeklyReport(t));
  if (!data) return <Loading error={error} />;
  const prof = data.errorProfile;
  const total = prof.total || 1;

  return (
    <Screen>
      <Card>
        <Row between>
          <T tone="ink2" size={13}>{config.mode === "local" ? "本机模式（数据在手机里）" : `服务器：${config.url}`}{aiEnabled ? " · AI 已连接" : ""}</T>
          <Btn small title="设置" onPress={() => router.push("/settings")} />
        </Row>
      </Card>

      {week.data ? (
        <Card>
          <H2>最近 7 天</H2>
          <Row between>
            <Stat label="做题" value={String(week.data.attempts)} />
            <Stat label="正确率" value={week.data.attempts ? `${Math.round((week.data.ok / week.data.attempts) * 100)}%` : "—"} />
            <Stat label="复习" value={String(week.data.reviews)} />
            <Stat label="记住" value={week.data.reviews ? `${Math.round((week.data.remembered / week.data.reviews) * 100)}%` : "—"} />
          </Row>
        </Card>
      ) : null}

      <Card>
        <H2>先补这些</H2>
        {data.weak.slice(0, 8).map((w, i) => (
          <Pressable key={w.id} onPress={() => router.push(`/node/${w.id}`)} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: p.rule, paddingTop: i ? 8 : 0, gap: 3 }}>
            <T>{i + 1}. {w.name}</T>
            <Row gap={10}>
              <LevelPill level={w.level} value={w.mastery === null ? undefined : String(Math.round(w.mastery * 100))} />
              <T tone="muted" size={12}>{w.mainError ? RESULT_META[w.mainError].label : ""}{w.rootCauses.length ? " · 有前置题型没掌握" : ""}</T>
            </Row>
          </Pressable>
        ))}
      </Card>

      <Card>
        <H2>错因构成（近 30 天 {prof.total} 题）</H2>
        <View style={{ flexDirection: "row", height: 14, borderRadius: 4, overflow: "hidden", gap: 2 }}>
          {RESULT_DISPLAY.filter((r) => prof.counts[r] > 0).map((r) => (
            <View key={r} style={{ flex: prof.counts[r] / total, backgroundColor: RESULT_COLOR[r] }} />
          ))}
        </View>
        <Row wrap gap={10}>
          {RESULT_DISPLAY.filter((r) => prof.counts[r] > 0).map((r) => (
            <Row key={r} gap={4}>
              <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: RESULT_COLOR[r] }} />
              <T size={12} tone="ink2">{RESULT_META[r].label} {prof.counts[r]}</T>
            </Row>
          ))}
        </Row>
        {prof.dominant ? <T size={13} tone="ink2">{prof.advice}</T> : null}
      </Card>

      {data.blind.length ? (
        <Card>
          <H2>盲区：常考但没测过</H2>
          <Row wrap gap={6}>
            {data.blind.map((b) => (
              <NodeChip key={b.id} id={b.id} />
            ))}
          </Row>
        </Card>
      ) : null}

      {data.insights.length ? (
        <Card>
          <H2>需要注意</H2>
          {data.insights.map((s) => (
            <T key={s} tone="ink2" size={13}>· {s}</T>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <T tone="muted" size={12}>{label}</T>
      <T bold size={18}>{value}</T>
    </View>
  );
}
