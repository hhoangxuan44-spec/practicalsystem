import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assess,
  createLocalApi,
  latexToPlain,
  mathTextToPlain,
  MemoryStore,
  normalizeRef,
  phaseOf,
  seedInitialData,
  StudyService,
  type Attempt,
  type IngestResult,
} from "../src/index.ts";

const TODAY = "2026-10-24";

function makeService(start = new Date(2026, 9, 24, 10, 0, 0)) {
  let now = start;
  const service = new StudyService(new MemoryStore(), { clock: () => now, server: { aiEnabled: true, version: "test" } });
  return {
    service,
    advance(ms: number) {
      now = new Date(now.getTime() + ms);
    },
    setNow(d: Date) {
      now = d;
    },
  };
}

function attempt(partial: Partial<Attempt>): Attempt {
  return {
    id: Math.random().toString(36),
    entryId: "e",
    date: TODAY,
    ref: "x",
    kind: "选择",
    nodeIds: ["a1"],
    mine: "",
    answer: "",
    result: "ok",
    diagnosis: "",
    createdAt: new Date().toISOString(),
    ...partial,
  };
}

test("评估：没有记录时掌握度为空", () => {
  const a = assess([], TODAY);
  assert.equal(a.mastery, null);
  assert.equal(a.level, "none");
  assert.equal(a.confidence, "none");
});

test("评估：一次做对是「掌握」但证据不足，概念错误拉低到「薄弱」", () => {
  const one = assess([attempt({ result: "ok" })], TODAY);
  assert.equal(one.level, "good");
  assert.equal(one.confidence, "low");
  const bad = assess([attempt({ result: "concept" })], TODAY);
  assert.equal(bad.level, "bad");
  assert.equal(bad.mainError, "concept");
});

test("评估：久远的错误影响变小", () => {
  const recentWrong = assess([attempt({ result: "method", date: TODAY }), attempt({ result: "ok", date: "2026-08-01" })], TODAY);
  const oldWrong = assess([attempt({ result: "method", date: "2026-08-01" }), attempt({ result: "ok", date: TODAY })], TODAY);
  assert.ok(oldWrong.mastery! > recentWrong.mastery!);
});

test("题号归一化", () => {
  assert.equal(normalizeRef("2022-14"), "2022-14");
  assert.equal(normalizeRef("2022年第14题"), "2022-14");
  assert.equal(normalizeRef("2022 数二 第 14 题"), "2022-14");
  assert.equal(normalizeRef("张宇强化 例5.3"), "张宇强化例5.3");
});

test("阶段划分", () => {
  assert.equal(phaseOf(TODAY, "2026-12-19").key, "intensive");
  assert.equal(phaseOf(TODAY, "2027-03-01").key, "foundation");
  assert.equal(phaseOf(TODAY, "2026-11-10").key, "sprint");
  assert.equal(phaseOf(TODAY, "2026-10-28").key, "final");
});

test("LaTeX 转纯文本", () => {
  assert.equal(latexToPlain(String.raw`\frac{1}{2}`), "1/2");
  assert.equal(latexToPlain("x^{2}+y_1"), "x²+y₁");
  assert.equal(latexToPlain(String.raw`\sqrt{3}\pi`), "√3π");
  assert.equal(mathTextToPlain(String.raw`结果 $e^{1/2}$ 。`), "结果 e^(1/2) 。");
});

test("初始数据：44 道题、31 张重做卡、31 张知识卡", () => {
  const { service } = makeService();
  seedInitialData(service, TODAY);
  const entries = service.listEntries();
  assert.equal(entries.length, 2);
  assert.equal(service.store.list("attempts").length, 44);
  const cards = service.store.list("cards");
  assert.equal(cards.filter((c) => c.kind === "redo").length, 31);
  assert.equal(cards.filter((c) => c.kind !== "redo").length, 31);
  // 重复调用不会重复写入
  seedInitialData(service, TODAY);
  assert.equal(service.store.list("attempts").length, 44);
});

test("诊断：高阶常系数方程两年都错，排在薄弱点前列", () => {
  const { service } = makeService();
  seedInitialData(service, TODAY);
  const map = service.map(TODAY);
  const f2 = map.chapters.flatMap((c) => c.nodes).find((n) => n.id === "f2")!;
  assert.equal(f2.level, "bad");
  assert.equal(f2.count, 2);
  const h3 = map.chapters.flatMap((c) => c.nodes).find((n) => n.id === "h3")!;
  assert.equal(h3.level, "warn");
  const diag = service.diagnosis(TODAY);
  assert.ok(diag.weak.slice(0, 8).some((n) => n.id === "f2"), "f2 应在前 8 个薄弱点里");
  assert.ok(diag.blind.some((n) => n.id === "c6"), "中值定理证明还没测过");
  assert.ok(diag.repeated.some((r) => r.nodeId === "f2"));
  assert.ok(diag.insights.length > 0);
});

test("记忆复习：每天新卡有上限，复习后卡片离开队列", () => {
  const { service } = makeService();
  seedInitialData(service, TODAY);
  const q = service.reviewQueue(TODAY);
  assert.equal(q.counts.fresh, 20);
  assert.ok(q.cards.every((c) => c.kind !== "redo"));
  const first = q.cards[0];
  assert.ok(first.intervals[1] && first.intervals[4]);
  const res = service.review(first.id, 3, TODAY);
  assert.equal(res.log.rating, 3);
  assert.notEqual(res.card.srs.state, 0);
  assert.ok(!res.queue.cards.some((c) => c.id === first.id));
  assert.equal(res.queue.counts.doneToday, 1);
  const undone = service.undoReview(res.log.id, TODAY);
  assert.ok(undone.cards.some((c) => c.id === first.id));
});

test("闭环：上传同一道题的重做结果，自动复习对应的重做卡", () => {
  const { service, setNow } = makeService();
  seedInitialData(service, TODAY);
  const redo = service.store.list("cards").find((c) => c.kind === "redo" && c.sourceRef === "2022-14")!;
  assert.equal(redo.srs.state, 0);
  setNow(new Date(2026, 9, 25, 9, 0, 0));
  const entry = service.createEntry({ date: "2026-10-25", text: "重做 2022-14" }, []);
  const result: IngestResult = {
    summary: "重做",
    highlights: [],
    notes: [],
    cards: [],
    attempts: [{ ref: "2022年第14题", kind: "填空", nodeIds: ["f2"], mine: "C₁+eˣ(C₂cos2x+C₃sin2x)", answer: "同左", result: "ok", diagnosis: "正确" }],
  };
  service.applyIngest(entry.id, result);
  const after = service.store.get("cards", redo.id)!;
  assert.notEqual(after.srs.state, 0);
  const logs = service.store.list("reviews").filter((l) => l.cardId === redo.id);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].auto, true);
  // 做对了不再新建重做卡
  assert.equal(service.store.list("cards").filter((c) => c.kind === "redo" && c.sourceRef === "2022年第14题").length, 0);
  // 重新处理同一条记录不会重复自动评分
  service.applyIngest(entry.id, result);
  assert.equal(service.store.list("reviews").filter((l) => l.cardId === redo.id).length, 1);
});

test("训练计划：包含复习和补强任务，上传对应题型后自动完成", () => {
  const { service, setNow } = makeService();
  seedInitialData(service, TODAY);
  setNow(new Date(2026, 9, 25, 8, 0, 0));
  const plan = service.plan("2026-10-25");
  assert.ok(plan.tasks.some((t) => t.kind === "review"));
  assert.ok(plan.tasks.some((t) => t.kind === "redo"), "第二天应安排错题重做");
  const study = plan.tasks.find((t) => t.kind === "study");
  assert.ok(study?.nodeId);
  assert.ok(plan.totalMinutes <= plan.budget + 60);
  const entry = service.createEntry({ date: "2026-10-25", text: "练习" }, []);
  service.applyIngest(entry.id, {
    summary: "练习",
    highlights: [],
    notes: [],
    cards: [],
    attempts: [1, 2].map((i) => ({ ref: `练习 ${i}`, kind: "练习" as const, nodeIds: [study!.nodeId!], mine: "", answer: "", result: "ok" as const, diagnosis: "" })),
  });
  const again = service.plan("2026-10-25");
  const s2 = again.tasks.find((t) => t.id === study!.id)!;
  assert.equal(s2.done, true);
  assert.equal(s2.doneAuto, true);
  const manual = service.setTaskDone("2026-10-25", s2.id, false);
  assert.equal(manual.tasks.find((t) => t.id === s2.id)!.done, false);
});

test("修正判定：改成正确后删除未复习的重做卡", () => {
  const { service } = makeService();
  seedInitialData(service, TODAY);
  const a = service.store.list("attempts").find((x) => x.ref === "2022-1")!;
  assert.ok(service.store.list("cards").some((c) => c.kind === "redo" && c.sourceAttemptId === a.id));
  service.updateAttempt(a.id, { result: "ok" });
  assert.ok(!service.store.list("cards").some((c) => c.kind === "redo" && c.sourceAttemptId === a.id));
  assert.equal(service.store.get("attempts", a.id)!.corrected, true);
});

test("删除学习记录会清掉它生成的题目和卡片", () => {
  const { service } = makeService();
  seedInitialData(service, TODAY);
  const e = service.listEntries().find((x) => x.title === "2022 数二真题")!;
  service.deleteEntry(e.id);
  assert.equal(service.store.list("attempts").length, 22);
  assert.ok(service.store.list("cards").every((c) => c.entryId !== e.id));
});

test("日报与首页", async () => {
  const { service } = makeService();
  seedInitialData(service, TODAY);
  const api = createLocalApi(service);
  const dash = await api.dashboard(TODAY);
  assert.equal(dash.report.attempts, 44);
  assert.match(dash.report.headline, /识别 44 道题/);
  assert.equal(dash.overview.tested > 20, true);
  assert.equal(dash.phase.key, "intensive");
  const week = await api.weeklyReport(TODAY);
  assert.equal(week.attempts, 44);
  await assert.rejects(api.node("zz", TODAY), /题型不存在/);
});

test("手动记录走同一条通道", () => {
  const { service } = makeService();
  const view = service.addManualAttempt({ date: TODAY, ref: "张宇强化 例5.3", kind: "例题", nodeIds: ["e1"], result: "method" });
  assert.equal(view.attempts.length, 1);
  assert.equal(view.entry.stats?.attempts, 1);
  service.addManualAttempt({ date: TODAY, ref: "张宇强化 例5.4", kind: "例题", nodeIds: ["e1"], result: "ok" });
  assert.equal(service.listEntries().length, 1);
  assert.equal(service.entry(view.entry.id).entry.stats?.attempts, 2);
});
