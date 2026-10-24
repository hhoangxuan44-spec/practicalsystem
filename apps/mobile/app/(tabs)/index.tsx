// 今日：倒计时、训练计划（可勾选）、需要注意的事、最该补的题型、最近上传。

import { formatDateCn, RESULT_META, type DashboardView, type PlanTask } from "@ps/core";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useAction, useConn, useQuery } from "../../src/conn.tsx";
import { usePalette } from "../../src/theme.ts";
import { Badge, Btn, Card, H1, H2, LevelPill, Loading, MathT, Meter, Row, Screen, T } from "../../src/ui.tsx";

const TASK_LABEL: Record<PlanTask["kind"], string> = { review: "记忆复习", redo: "错题重做", study: "专项补强", diagnose: "盲区摸底", exam: "真题套卷" };

export default function Today() {
  const p = usePalette();
  const { api, today } = useConn();
  const { run } = useAction();
  const { data, error } = useQuery<DashboardView>("dashboard", (a, t) => a.dashboard(t));
  if (!data) return <Loading error={error} />;
  const d = data;
  const due = d.review.due + d.review.fresh;
  const done = d.plan.tasks.filter((t) => t.done).length;

  const open = (t: PlanTask) => {
    if (t.kind === "review") router.push("/review");
    else if (t.kind === "exam") router.push("/capture");
    else if (t.nodeId) router.push(`/node/${t.nodeId}`);
  };

  return (
    <Screen>
      <View style={{ gap: 4 }}>
        <T tone="muted" size={13}>{formatDateCn(today)} · {d.phase.label}</T>
        <H1>距考试 {d.phase.daysLeft} 天</H1>
        <T tone="ink2" size={13}>{d.phase.advice}</T>
      </View>

      <Row gap={10}>
        <Card style={{ flex: 1 }}>
          <T tone="muted" size={12}>今日计划</T>
          <T size={22} bold>{done}/{d.plan.tasks.length}</T>
          <Meter value={d.plan.totalMinutes ? d.plan.doneMinutes / d.plan.totalMinutes : 0} />
        </Card>
        <Card style={{ flex: 1 }}>
          <T tone="muted" size={12}>待复习</T>
          <T size={22} bold>{due} 张</T>
          <T tone="muted" size={12}>今天已复习 {d.review.doneToday}</T>
        </Card>
      </Row>

      <Card>
        <H2 right={<Btn small title="重新安排" onPress={() => run(() => api.regeneratePlan(today))} />}>今日训练计划</H2>
        <T tone="muted" size={12}>约 {d.plan.totalMinutes} 分钟。题目在本子上做，做完拍照上传，系统会自动勾选。</T>
        {d.plan.tasks.map((t) => (
          <View key={t.id} style={{ flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: p.rule, paddingTop: 10 }}>
            <Pressable
              onPress={() => run(() => api.setTaskDone(d.plan.date, t.id, !t.done))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: t.done }}
              style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: t.done ? p.accent : p.ruleStrong, backgroundColor: t.done ? p.accent : "transparent", alignItems: "center", justifyContent: "center", marginTop: 2 }}
            >
              {t.done ? <T size={13} style={{ color: p.accentInk }}>✓</T> : null}
            </Pressable>
            <Pressable style={{ flex: 1, gap: 3 }} onPress={() => open(t)}>
              <Row wrap gap={6}>
                <Badge text={TASK_LABEL[t.kind]} />
                {t.doneAuto ? <Badge text="自动完成" tone="good" /> : null}
                <T tone="muted" size={12}>{t.minutes} 分钟</T>
              </Row>
              <T bold style={t.done ? { textDecorationLine: "line-through", color: p.muted } : undefined}>{t.title}</T>
              <MathT text={t.detail} tone="ink2" size={13} />
            </Pressable>
          </View>
        ))}
      </Card>

      {d.insights.length ? (
        <Card>
          <H2>需要注意</H2>
          {d.insights.slice(0, 3).map((s) => (
            <T key={s} tone="ink2" size={13}>· {s}</T>
          ))}
        </Card>
      ) : null}

      <Card>
        <H2>最该补的题型</H2>
        {d.weak.slice(0, 5).map((w, i) => (
          <Pressable key={w.id} onPress={() => router.push(`/node/${w.id}`)} style={{ gap: 2, borderTopWidth: i ? 1 : 0, borderTopColor: p.rule, paddingTop: i ? 8 : 0 }}>
            <Row between>
              <T>{i + 1}. {w.name}</T>
            </Row>
            <Row gap={10}>
              <LevelPill level={w.level} value={w.mastery === null ? undefined : String(Math.round(w.mastery * 100))} />
              <T tone="muted" size={12}>{w.count} 次{w.mainError ? ` · ${RESULT_META[w.mainError].label}` : ""}</T>
            </Row>
          </Pressable>
        ))}
        {d.blind.length ? <T tone="muted" size={12}>还没测过的重点：{d.blind.map((b) => b.name).join("、")}</T> : null}
      </Card>

      <Card>
        <H2>今天的学习</H2>
        <T>{d.report.headline}</T>
        {d.recentEntries.slice(0, 4).map((e) => (
          <Pressable key={e.id} onPress={() => router.push(`/entry/${e.id}`)} style={{ borderTopWidth: 1, borderTopColor: p.rule, paddingTop: 8 }}>
            <Row between>
              <T lines={1} style={{ flex: 1 }}>{e.title}</T>
              <Badge text={e.status === "done" ? "已归档" : e.status === "failed" ? "失败" : e.status === "needs_ai" ? "待分析" : e.progress ?? "分析中"} tone={e.status === "done" ? "good" : e.status === "failed" ? "bad" : "accent"} />
            </Row>
          </Pressable>
        ))}
      </Card>
    </Screen>
  );
}
