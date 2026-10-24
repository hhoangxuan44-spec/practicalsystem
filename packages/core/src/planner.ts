// 培训训练系统：根据离考试的天数、薄弱点和到期的卡片，生成每天的训练计划。
// 题目都在线下做（自己的书和本子），系统只负责安排做什么，并在上传后自动核对完成情况。

import { RESULT_META } from "./assessment.ts";
import { daysBetween, isoToDateStr } from "./dates.ts";
import { blindSpots, weakPoints, type NodeState, type NodeStates } from "./diagnosis.ts";
import { newId, normalizeRef } from "./ids.ts";
import { isDue } from "./memory.ts";
import { getNode } from "./taxonomy.ts";
import type { Attempt, Card, DayPlan, Entry, PlanTask, ReviewLog, Settings } from "./types.ts";

export type PhaseKey = "foundation" | "intensive" | "sprint" | "final" | "after";

export interface PhaseInfo {
  key: PhaseKey;
  label: string;
  daysLeft: number;
  advice: string;
}

export function phaseOf(today: string, examDate: string): PhaseInfo {
  const daysLeft = daysBetween(today, examDate);
  if (daysLeft < 0) return { key: "after", label: "考试已结束", daysLeft, advice: "在设置里更新考试日期，计划会重新安排。" };
  if (daysLeft <= 6) return { key: "final", label: "考前一周", daysLeft, advice: "不学新内容，只过记忆卡和错题，保持手感。" };
  if (daysLeft <= 24) return { key: "sprint", label: "冲刺期", daysLeft, advice: "以真题套卷为主，错题当天回炉，记忆卡每天清空。" };
  if (daysLeft <= 60) return { key: "intensive", label: "强化期", daysLeft, advice: "真题和题型补漏并行，每周至少两套完整真题。" };
  return { key: "foundation", label: "补漏期", daysLeft, advice: "按题型逐个补薄弱点，先补前置题型。" };
}

/** 一套完整试卷的上传：识别出的题数达到这个数就算整卷 */
const FULL_PAPER_MIN = 15;

interface PhaseQuota {
  redo: number;
  study: number;
  diagnose: number;
  /** 多少天内没做过整卷就安排一套，0 表示不安排 */
  examEvery: number;
  studyMinutes: number;
}

const QUOTA: Record<PhaseKey, PhaseQuota> = {
  foundation: { redo: 3, study: 2, diagnose: 1, examEvery: 0, studyMinutes: 45 },
  intensive: { redo: 3, study: 2, diagnose: 1, examEvery: 4, studyMinutes: 40 },
  sprint: { redo: 4, study: 1, diagnose: 0, examEvery: 2, studyMinutes: 30 },
  final: { redo: 4, study: 0, diagnose: 0, examEvery: 0, studyMinutes: 0 },
  after: { redo: 0, study: 0, diagnose: 0, examEvery: 0, studyMinutes: 0 },
};

export interface PlanContext {
  today: string;
  now: Date;
  settings: Settings;
  states: NodeStates;
  cards: Card[];
  attempts: Attempt[];
  entries: Entry[];
  reviews: ReviewLog[];
  /** 今天待复习的记忆卡（已按上限截断） */
  reviewQueue: Card[];
}

function studyAction(s: NodeState): string {
  const node = getNode(s.id);
  const tip = node?.keyIdeas[0] ? `要点：${node.keyIdeas[0]}。` : "";
  const how = s.mainError ? RESULT_META[s.mainError].advice : "找 3 到 5 道同类题做，做完上传。";
  return `${how}${tip}`;
}

export function generatePlan(ctx: PlanContext): DayPlan {
  const { today, settings, states } = ctx;
  const phase = phaseOf(today, settings.examDate);
  const quota = QUOTA[phase.key];
  const candidates: { task: PlanTask; rank: number }[] = [];

  // 1. 记忆复习
  if (ctx.reviewQueue.length) {
    const fresh = ctx.reviewQueue.filter((c) => c.srs.state === 0).length;
    const due = ctx.reviewQueue.length - fresh;
    candidates.push({
      rank: 0,
      task: {
        id: newId("task"),
        kind: "review",
        title: `复习 ${ctx.reviewQueue.length} 张记忆卡`,
        detail: [due ? `${due} 张到期` : "", fresh ? `${fresh} 张新卡` : ""].filter(Boolean).join(" + "),
        reason: "按遗忘曲线，这些卡今天最容易忘。",
        minutes: Math.max(5, Math.round(ctx.reviewQueue.length * 0.4)),
        cardIds: ctx.reviewQueue.map((c) => c.id),
        target: ctx.reviewQueue.length,
        done: false,
      },
    });
  }

  // 2. 错题重做：到期的重做卡，薄弱题型优先
  const attemptById = new Map(ctx.attempts.map((a) => [a.id, a]));
  const redo = ctx.cards
    .filter((c) => c.kind === "redo" && isDue(c, ctx.now))
    .sort((a, b) => (states[b.nodeIds[0]]?.priority ?? 0) - (states[a.nodeIds[0]]?.priority ?? 0))
    .slice(0, quota.redo);
  redo.forEach((c, i) => {
    const src = c.sourceAttemptId ? attemptById.get(c.sourceAttemptId) : undefined;
    const big = src?.kind === "解答";
    candidates.push({
      rank: i === 0 ? 1 : 4 + i,
      task: {
        id: newId("task"),
        kind: "redo",
        title: `重做 ${c.sourceRef ?? src?.ref ?? "错题"}`,
        detail: `${src?.stem ? src.stem + " · " : ""}在本子上独立重做，做完拍照上传，系统自动判分。`,
        reason: src ? `上次「${RESULT_META[src.result].label}」：${src.diagnosis}` : "按记忆曲线到了该重做的时候。",
        minutes: big ? 15 : 6,
        nodeId: c.nodeIds[0],
        cardIds: [c.id],
        attemptId: src?.id,
        ref: c.sourceRef ?? src?.ref,
        done: false,
      },
    });
  });

  // 3. 专项补强：优先级最高的薄弱题型；如果它的前置题型也薄弱，先补前置
  const chosen = new Set<string>();
  const study: NodeState[] = [];
  for (const s of weakPoints(states, 10)) {
    if (study.length >= quota.study) break;
    const root = s.rootCauses.map((id) => states[id]).find((r) => !chosen.has(r.id));
    const pick = root ?? s;
    if (chosen.has(pick.id)) continue;
    chosen.add(pick.id);
    study.push(pick);
  }
  study.forEach((s, i) => {
    const because = s.weakDependents.length
      ? `它是「${s.weakDependents.map((d) => states[d].name).join("」「")}」的前置题型。`
      : "";
    const evidence = s.mastery === null
      ? "还没有记录。"
      : `掌握度 ${Math.round(s.mastery * 100)}，${s.count} 次记录${s.mainError ? `，主要问题是「${RESULT_META[s.mainError].label}」` : ""}。`;
    candidates.push({
      rank: i === 0 ? 2 : 6,
      task: {
        id: newId("task"),
        kind: "study",
        title: `补强：${s.name}`,
        detail: studyAction(s),
        reason: `${evidence}${because}`,
        minutes: quota.studyMinutes,
        nodeId: s.id,
        target: 2,
        done: false,
      },
    });
  });

  // 4. 盲区摸底
  const blind = blindSpots(states, phase.key === "sprint" ? 3 : 2).filter((s) => !chosen.has(s.id)).slice(0, quota.diagnose);
  for (const s of blind) {
    candidates.push({
      rank: 7,
      task: {
        id: newId("task"),
        kind: "diagnose",
        title: `摸底：${s.name}`,
        detail: "找 2 道这个题型的题（真题优先）做完上传，系统会给出你在这个题型的水平。",
        reason: `${s.freq === 3 ? "几乎每年都考" : "常考题型"}，但还没有任何记录。`,
        minutes: 20,
        nodeId: s.id,
        target: 1,
        done: false,
      },
    });
  }

  // 5. 真题套卷
  if (quota.examEvery > 0) {
    const lastFull = lastFullPaperDate(ctx.entries, ctx.attempts);
    const gap = lastFull ? daysBetween(lastFull, today) : Infinity;
    if (gap >= quota.examEvery) {
      candidates.push({
        rank: 3,
        task: {
          id: newId("task"),
          kind: "exam",
          title: "做一套数二真题",
          detail: "按考试时间限时 3 小时，做完整卷拍照或扫描上传。",
          reason: lastFull ? `上一套整卷是 ${gap} 天前做的。` : "还没有上传过整套试卷。",
          minutes: 180,
          target: FULL_PAPER_MIN,
          done: false,
        },
      });
    }
  }

  // 按优先顺序放进当天时间预算；复习永远保留
  candidates.sort((a, b) => a.rank - b.rank);
  const tasks: PlanTask[] = [];
  let used = 0;
  for (const { task } of candidates) {
    if (task.kind === "review" || used + task.minutes <= settings.dailyMinutes) {
      tasks.push(task);
      used += task.minutes;
    }
  }
  return { id: today, date: today, tasks, generatedAt: ctx.now.toISOString() };
}

function lastFullPaperDate(entries: Entry[], attempts: Attempt[]): string | null {
  const perEntry = new Map<string, number>();
  for (const a of attempts) perEntry.set(a.entryId, (perEntry.get(a.entryId) ?? 0) + 1);
  let last: string | null = null;
  for (const e of entries) {
    if ((perEntry.get(e.id) ?? 0) >= FULL_PAPER_MIN && (!last || e.date > last)) last = e.date;
  }
  return last;
}

/** 根据今天的上传和复习记录，自动勾选完成的任务（手动设置过的保持不变） */
export function evaluatePlan(plan: DayPlan, ctx: PlanContext): DayPlan {
  // 只算计划生成之后的上传和复习，之前的内容已经体现在计划里了
  const todayAttempts = ctx.attempts.filter((a) => a.date === plan.date && a.createdAt >= plan.generatedAt);
  const todayLogs = ctx.reviews.filter((r) => isoToDateStr(r.reviewedAt) === plan.date && r.reviewedAt >= plan.generatedAt);
  const tasks = plan.tasks.map((t) => {
    if (t.manual) return t;
    let auto = false;
    switch (t.kind) {
      case "review": {
        const reviewed = new Set(todayLogs.filter((l) => !l.auto).map((l) => l.cardId));
        const planned = t.cardIds ?? [];
        auto = planned.length > 0 && planned.every((id) => reviewed.has(id) || !ctx.cards.some((c) => c.id === id));
        break;
      }
      case "redo": {
        const ids = new Set(t.cardIds ?? []);
        const ref = t.ref ? normalizeRef(t.ref) : null;
        auto = todayLogs.some((l) => ids.has(l.cardId)) || (!!ref && todayAttempts.some((a) => normalizeRef(a.ref) === ref));
        break;
      }
      case "study":
      case "diagnose":
        auto = todayAttempts.filter((a) => t.nodeId && a.nodeIds.includes(t.nodeId)).length >= (t.target ?? 1);
        break;
      case "exam": {
        const perEntry = new Map<string, number>();
        for (const a of todayAttempts) perEntry.set(a.entryId, (perEntry.get(a.entryId) ?? 0) + 1);
        auto = [...perEntry.values()].some((n) => n >= (t.target ?? FULL_PAPER_MIN));
        break;
      }
    }
    return { ...t, done: auto, doneAuto: auto };
  });
  return { ...plan, tasks };
}

