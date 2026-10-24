// 记忆复习：点卡片翻面，按记住的程度评分，可以撤销上一张。

import { getNode, mathTextToPlain, RATING_LABEL, type Rating, type ReviewLog, type ReviewQueueView } from "@ps/core";
import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useConn, useQuery } from "../../src/conn.tsx";
import { usePalette } from "../../src/theme.ts";
import { Badge, Btn, Card, Loading, Row, Screen, T } from "../../src/ui.tsx";

const KIND: Record<string, string> = { formula: "公式", method: "方法", pitfall: "易错", redo: "重做" };

export default function Review() {
  const p = usePalette();
  const { api, today, invalidate } = useConn();
  const initial = useQuery<ReviewQueueView>("review", (a, t) => a.reviewQueue(t));
  const [queue, setQueue] = useState<ReviewQueueView | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ReviewLog[]>([]);

  useEffect(() => {
    if (initial.data && !busy) setQueue(initial.data);
  }, [initial.data, busy]);

  if (!queue) return <Loading error={initial.error} />;
  const card = queue.cards[0];

  const rate = async (r: Rating) => {
    if (!card) return;
    setBusy(true);
    try {
      const res = await api.review(card.id, r, today);
      setQueue(res.queue);
      setHistory((h) => [...h.slice(-19), res.log]);
      setRevealed(false);
      invalidate();
    } catch (e) {
      Alert.alert("没有保存", e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const undo = async () => {
    const last = history.at(-1);
    if (!last) return;
    setBusy(true);
    try {
      setQueue(await api.undoReview(last.id, today));
      setHistory((h) => h.slice(0, -1));
      setRevealed(false);
      invalidate();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Row between>
        <T tone="ink2" size={13}>今天已复习 {queue.counts.doneToday} 张 · 还剩 {queue.cards.length} 张</T>
        <Btn small kind="ghost" title="撤销" disabled={!history.length || busy} onPress={undo} />
      </Row>
      {card ? (
        <>
          <Pressable onPress={() => setRevealed(true)} accessibilityRole="button" accessibilityLabel={revealed ? "卡片背面" : "点击翻面"}>
            <Card style={{ minHeight: 300, padding: 20, gap: 16 }}>
              <Row wrap gap={6}>
                <Badge text={KIND[card.kind]} />
                {card.nodeIds.map((id) => (
                  <T key={id} tone="muted" size={12}>{getNode(id)?.name.replace(/（.*?）/g, "")}</T>
                ))}
              </Row>
              <Text style={{ color: p.ink, fontSize: 19, lineHeight: 30 }}>{mathTextToPlain(card.front)}</Text>
              {revealed ? (
                <View style={{ borderTopWidth: 1, borderTopColor: p.rule, paddingTop: 14 }}>
                  <Text style={{ color: p.ink, fontSize: 16, lineHeight: 26 }}>{mathTextToPlain(card.back)}</Text>
                </View>
              ) : (
                <T tone="muted" style={{ textAlign: "center", marginTop: "auto" }}>想好答案后，点卡片翻面</T>
              )}
            </Card>
          </Pressable>
          {revealed ? (
            <Row gap={6}>
              {([1, 2, 3, 4] as Rating[]).map((r) => (
                <Pressable
                  key={r}
                  disabled={busy}
                  onPress={() => rate(r)}
                  accessibilityRole="button"
                  style={{ flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: r === 3 ? p.accent : p.ruleStrong, backgroundColor: r === 3 ? p.accent : p.surface }}
                >
                  <Text style={{ color: r === 3 ? p.accentInk : p.ink, fontWeight: "700" }}>{RATING_LABEL[r]}</Text>
                  <Text style={{ color: r === 3 ? p.accentInk : p.muted, fontSize: 11 }}>{card.intervals[r]}后</Text>
                </Pressable>
              ))}
            </Row>
          ) : null}
        </>
      ) : (
        <Card style={{ alignItems: "center", padding: 28 }}>
          <T bold size={16}>{queue.counts.doneToday ? "今天的复习完成了" : "现在没有要复习的卡"}</T>
          <T tone="muted" size={13} style={{ textAlign: "center" }}>刚学的卡会在几分钟后回来，到期的卡明天再来。</T>
        </Card>
      )}
    </Screen>
  );
}
