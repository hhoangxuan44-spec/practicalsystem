// 题型档案：掌握度、建议、根因、方法要点、做题记录、记忆卡。

import { getNode, mathTextToPlain, RESULT_META, type NodeView } from "@ps/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { useQuery } from "../../src/conn.tsx";
import { LEVEL_COLOR, usePalette } from "../../src/theme.ts";
import { Badge, Card, H1, H2, LevelPill, Loading, MathT, Meter, NodeChip, ResultPill, Row, Screen, T } from "../../src/ui.tsx";

export default function NodeScreen() {
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const node = getNode(id);
  const { data, error } = useQuery<NodeView>(`node:${id}`, (a, t) => a.node(id, t));
  if (!data || !node) return <Loading error={error ?? (node ? undefined : new Error("没有这个题型"))} />;
  const s = data.state;
  return (
    <Screen>
      <Stack.Screen options={{ title: node.name.replace(/（.*?）/g, "") }} />
      <View style={{ gap: 6 }}>
        <T tone="muted" size={12}>{s.part} · {s.chapterName} · {"★".repeat(node.freq)}</T>
        <H1>{node.name}</H1>
        <LevelPill level={s.level} value={s.mastery === null ? undefined : String(Math.round(s.mastery * 100))} />
        <Meter value={s.mastery} color={LEVEL_COLOR[s.level]} />
        <T tone="muted" size={12}>
          {s.count} 次记录 · 记忆卡 {s.cardCount} 张{s.retention !== null ? `，平均记住 ${Math.round(s.retention * 100)}%` : ""}
        </T>
      </View>
      <Card style={{ backgroundColor: p.accentSoft, borderColor: "transparent" }}>
        <T>{data.advice}</T>
      </Card>
      {data.rootChains.length ? (
        <Card>
          <H2>可能的根因</H2>
          {data.rootChains.map((c) => (
            <Row key={c.join(">")} wrap gap={6}>
              {c.slice(1).reverse().map((nid) => (
                <Row key={nid} gap={4}>
                  <NodeChip id={nid} />
                  <T tone="muted">→</T>
                </Row>
              ))}
              <T tone="muted" size={12}>本题型</T>
            </Row>
          ))}
        </Card>
      ) : null}
      <Card>
        <H2>方法要点</H2>
        {data.keyIdeas.map((k) => (
          <MathT key={k} text={`· ${k}`} tone="ink2" size={13} />
        ))}
      </Card>
      <Card>
        <H2>做题记录（{data.attempts.length}）</H2>
        {data.attempts.length ? (
          data.attempts.map((a) => (
            <Pressable key={a.id} onPress={() => router.push(`/entry/${a.entryId}`)} style={{ borderTopWidth: 1, borderTopColor: p.rule, paddingTop: 8, gap: 4 }}>
              <Row between>
                <T bold>{a.ref}</T>
                <ResultPill result={a.result} />
              </Row>
              <MathT text={a.diagnosis} tone="ink2" size={13} />
            </Pressable>
          ))
        ) : (
          <T tone="muted" size={13}>还没有记录。做 2 道这个题型的题，拍照上传。</T>
        )}
      </Card>
      {data.cards.length ? (
        <Card>
          <H2>记忆卡</H2>
          {data.cards.map((c) => (
            <View key={c.id} style={{ borderTopWidth: 1, borderTopColor: p.rule, paddingTop: 8, gap: 4 }}>
              <Row gap={6}>
                <Badge text={c.kind === "redo" ? "重做" : c.kind === "formula" ? "公式" : c.kind === "method" ? "方法" : "易错"} />
                <T tone="muted" size={12}>{c.dueLabel}</T>
              </Row>
              <T size={13}>{mathTextToPlain(c.front)}</T>
            </View>
          ))}
        </Card>
      ) : null}
      {s.mainError ? <T tone="muted" size={12}>主要问题：{RESULT_META[s.mainError].label}</T> : null}
    </Screen>
  );
}
