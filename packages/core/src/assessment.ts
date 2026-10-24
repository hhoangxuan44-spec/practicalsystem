// 评估系统：把作答记录折算成每个题型的掌握度。
//
// 模型：带遗忘的贝叶斯估计。每次作答按结果折算成得分 s∈[0,1]，
// 权重 w = 题型系数 × 0.5^(距今天数/半衰期)。掌握度取 Beta 后验均值：
//   α = 1 + Σ w·s，β = 1 + Σ w·(1−s)，mastery = α/(α+β)
// 有效证据量 nEff = Σ w 决定置信度；越久远的记录影响越小。

import { addDays, daysBetween, lastNDays } from "./dates.ts";
import type { Attempt, Confidence, Level, ProblemKind, ResultCode } from "./types.ts";

export interface ResultMeta {
  label: string;
  score: number;
  /** 这一类错误对应的补法 */
  advice: string;
}

export const RESULT_META: Record<ResultCode, ResultMeta> = {
  ok: { label: "正确", score: 1, advice: "已经做对过。保持间隔复习，一两次正确记录后就能确认掌握。" },
  calc: { label: "计算失误", score: 0.6, advice: "思路是对的，丢分在计算。做限时计算练习，算完把结果代回或换一种方法验算。" },
  partial: { label: "未做完", score: 0.35, advice: "做到一半停了。先完整看一遍标准解法，第二天再独立从头写一遍。" },
  method: { label: "方法错", score: 0.15, advice: "这个题型的标准方法还没掌握。集中做 5 到 8 道同类例题，先看解法，再盖住答案独立重做。" },
  concept: { label: "概念不清", score: 0.1, advice: "回到定义和定理条件，专门做概念辨析题，每道都说清楚其他选项错在哪。" },
  blank: { label: "空白", score: 0, advice: "没有动笔。先学这个题型的标准解法，再从最简单的例题做起。" },
};

export const RESULT_ORDER: ResultCode[] = ["ok", "calc", "partial", "method", "concept", "blank"];

const KIND_WEIGHT: Record<ProblemKind, number> = { 选择: 1, 填空: 1, 解答: 1.2, 例题: 0.8, 练习: 0.9 };

export const HALF_LIFE_DAYS = 30;
export const GOOD_THRESHOLD = 0.66;
export const WARN_THRESHOLD = 0.45;

export interface Assessment {
  mastery: number | null;
  level: Level;
  confidence: Confidence;
  count: number;
  /** 有效证据量（按时间衰减后的权重和） */
  nEff: number;
  /** 后验标准差，越大越不确定 */
  sd: number;
  lastSeen?: string;
  errorCounts: Partial<Record<ResultCode, number>>;
  mainError: ResultCode | null;
}

/** 平票时，越需要换学法的错误越靠前 */
const ERROR_PRIORITY: ResultCode[] = ["method", "concept", "calc", "partial", "blank"];

export function attemptWeight(a: Attempt, today: string): number {
  const age = Math.max(0, daysBetween(a.date, today));
  return (KIND_WEIGHT[a.kind] ?? 1) * Math.pow(0.5, age / HALF_LIFE_DAYS);
}

export function levelOf(mastery: number | null): Level {
  if (mastery === null) return "none";
  if (mastery >= GOOD_THRESHOLD) return "good";
  if (mastery >= WARN_THRESHOLD) return "warn";
  return "bad";
}

export function assess(attempts: Attempt[], today: string): Assessment {
  const usable = attempts.filter((a) => a.date <= today);
  const errorCounts: Partial<Record<ResultCode, number>> = {};
  if (usable.length === 0) {
    return { mastery: null, level: "none", confidence: "none", count: 0, nEff: 0, sd: 0, errorCounts, mainError: null };
  }
  let alpha = 1;
  let beta = 1;
  let nEff = 0;
  let lastSeen = usable[0].date;
  for (const a of usable) {
    const w = attemptWeight(a, today);
    const s = RESULT_META[a.result].score;
    alpha += w * s;
    beta += w * (1 - s);
    nEff += w;
    if (a.date > lastSeen) lastSeen = a.date;
    errorCounts[a.result] = (errorCounts[a.result] ?? 0) + 1;
  }
  const total = alpha + beta;
  const mastery = alpha / total;
  const sd = Math.sqrt((alpha * beta) / (total * total * (total + 1)));
  const confidence: Confidence = nEff < 1.5 ? "low" : nEff < 3 ? "medium" : "high";
  let mainError: ResultCode | null = null;
  let best = 0;
  for (const code of ERROR_PRIORITY) {
    const c = errorCounts[code] ?? 0;
    if (c > best) {
      best = c;
      mainError = code;
    }
  }
  return { mastery, level: levelOf(mastery), confidence, count: usable.length, nEff, sd, lastSeen, errorCounts, mainError };
}

/** 掌握度随时间的变化（每天的估计值，没有记录的日子为 null） */
export function masteryHistory(attempts: Attempt[], today: string, days = 30): { date: string; mastery: number | null }[] {
  return lastNDays(today, days).map((date) => ({ date, mastery: assess(attempts, date).mastery }));
}

/** 与 n 天前相比的变化 */
export function masteryTrend(attempts: Attempt[], today: string, days = 7): number | null {
  const now = assess(attempts, today).mastery;
  const before = assess(attempts, addDays(today, -days)).mastery;
  if (now === null || before === null) return null;
  return now - before;
}

export function attemptsOfNode(attempts: Attempt[], nodeId: string): Attempt[] {
  return attempts.filter((a) => a.nodeIds.includes(nodeId));
}
