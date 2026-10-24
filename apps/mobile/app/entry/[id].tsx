// 学习记录：处理进度、AI 总结、逐题判定（点判定可以修改）、生成的卡片。

import { getNode, mathTextToPlain, RESULT_META, type EntryView, type ResultCode } from "@ps/core";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, View } from "react-native";
import { useAction, useConn, useQuery } from "../../src/conn.tsx";
import { RESULT_COLOR, RESULT_DISPLAY, usePalette } from "../../src/theme.ts";
import { Badge, Btn, Card, H1, H2, Loading, MathT, ResultPill, Row, Screen, T } from "../../src/ui.tsx";

export default function EntryScreen() {
  const p = usePalette();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, invalidate, aiEnabled } = useConn();
  const { run } = useAction();
  const { data, error } = useQuery<EntryView>(`entry:${id}`, (a) => a.entry(id));
  const [picking, setPicking] = useState<string | null>(null);
  const processing = data?.entry.status === "queued" || data?.entry.status === "analyzing";

  useEffect(() => {
    if (!processing) return;
    const t = setInterval(invalidate, 2000);
    return () => clearInterval(t);
  }, [processing, invalidate]);

  if (!data) return <Loading error={error} />;
  const { entry, attempts, cards } = data;

  const setResult = async (r: ResultCode) => {
    const attemptId = picking;
    setPicking(null);
    if (attemptId) await run(() => api.updateAttempt(attemptId, { result: r }));
  };

  const remove = () =>
    Alert.alert("删除这条记录？", "识别出的题目和生成的卡片都会删除，不能恢复。", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: async () => {
          const ok = await run(async () => {
            await api.deleteEntry(id);
            return true;
          });
          if (ok) router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: entry.title }} />
      <View style={{ gap: 6 }}>
        <H1>{entry.title}</H1>
        <Row wrap gap={8}>
          <T tone="muted" size={13}>{entry.date}{entry.source ? ` · ${entry.source}` : ""}</T>
          <Badge text={entry.status === "done" ? "已归档" : entry.status === "failed" ? "分析失败" : entry.status === "needs_ai" ? "待分析" : "分析中"} tone={entry.status === "done" ? "good" : entry.status === "failed" ? "bad" : "accent"} />
        </Row>
      </View>
      {processing ? (
        <Card style={{ alignItems: "center" }}>
          <ActivityIndicator color={p.accent} />
          <T>{entry.progress ?? "排队中"}</T>
          <T tone="muted" size={12}>一般需要 1 到 3 分钟，可以先去做别的。</T>
        </Card>
      ) : null}
      {entry.status === "failed" ? (
        <Card>
          <T tone="bad">{entry.error}</T>
          {aiEnabled ? <Btn title="重试" onPress={() => run(() => api.reprocessEntry(id))} /> : null}
        </Card>
      ) : null}
      {entry.status === "needs_ai" ? (
        <Card>
          <T size={13} tone="ink2">还没有 AI 分析。连接配置了 AI 的服务器后，可以点「重新分析」。</T>
          {aiEnabled ? <Btn title="重新分析" onPress={() => run(() => api.reprocessEntry(id))} /> : null}
        </Card>
      ) : null}
      {entry.summary ? (
        <Card>
          <H2>总结</H2>
          <MathT text={entry.summary} />
          {entry.highlights?.map((h) => (
            <MathT key={h} text={`· ${h}`} tone="ink2" size={13} />
          ))}
        </Card>
      ) : null}
      {attempts.length ? (
        <Card>
          <H2>逐题判定（点判定可以修改）</H2>
          {attempts.map((a) => (
            <View key={a.id} style={{ borderTopWidth: 1, borderTopColor: p.rule, paddingTop: 8, gap: 4 }}>
              <Row between>
                <T bold>{a.ref}</T>
                <ResultPill result={a.result} onPress={() => setPicking(a.id)} />
              </Row>
              <T tone="muted" size={12}>{a.nodeIds.map((n) => getNode(n)?.name.replace(/（.*?）/g, "")).join("、")}</T>
              <T size={13}>你的：{mathTextToPlain(a.mine || "—")}　标准：{mathTextToPlain(a.answer || "—")}</T>
              <MathT text={a.diagnosis} tone="ink2" size={13} />
              {(a.confidence ?? 1) < 0.7 ? <Badge text="AI 把握不大，建议核对" tone="warn" /> : null}
            </View>
          ))}
        </Card>
      ) : null}
      {cards.length ? (
        <Card>
          <H2>生成的记忆卡（{cards.length}）</H2>
          {cards.map((c) => (
            <T key={c.id} size={13} tone="ink2">· {mathTextToPlain(c.front)}</T>
          ))}
        </Card>
      ) : null}
      <Row gap={8}>
        {aiEnabled && !processing && entry.source !== "手动记录" ? (
          <View style={{ flex: 1 }}><Btn title="重新分析" onPress={() => run(() => api.reprocessEntry(id))} /></View>
        ) : null}
        <View style={{ flex: 1 }}><Btn title="删除" kind="danger" onPress={remove} /></View>
      </Row>

      <Modal visible={!!picking} transparent animationType="fade" onRequestClose={() => setPicking(null)}>
        <Pressable style={{ flex: 1, backgroundColor: "rgba(10,14,24,0.45)", justifyContent: "flex-end" }} onPress={() => setPicking(null)}>
          <View style={{ backgroundColor: p.surface, padding: 16, gap: 8, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <T bold>改成</T>
            {RESULT_DISPLAY.map((r) => (
              <Pressable key={r} onPress={() => setResult(r)} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 }}>
                <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: RESULT_COLOR[r] }} />
                <T>{RESULT_META[r].label}</T>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
