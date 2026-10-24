// 总结：日报和周报。

import { assess, attemptsOfNode, RESULT_ORDER } from "./assessment.ts";
import { addDays, isoToDateStr, lastNDays } from "./dates.ts";
import { getNode } from "./taxonomy.ts";
import type { Attempt, Card, Entry, ResultCode, ReviewLog } from "./types.ts";

export interface NodeChange {
  nodeId: string;
  name: string;
  before: number | null;
  after: number | null;
  delta: number | null;
}

export interface DailyReport {
  date: string;
  entries: { id: string; title: string; status: Entry["status"] }[];
  attempts: number;
  ok: number;
  counts: Record<ResultCode, number>;
  nodes: NodeChange[];
  cardsCreated: number;
  reviews: number;
  remembered: number;
  highlights: string[];
  summaries: string[];
  headline: string;
}

export interface ReportData {
  entries: Entry[];
  attempts: Attempt[];
  cards: Card[];
  reviews: ReviewLog[];
}

function emptyCounts(): Record<ResultCode, number> {
  return Object.fromEntries(RESULT_ORDER.map((r) => [r, 0])) as Record<ResultCode, number>;
}

function nodeChanges(attempts: Attempt[], touched: Set<string>, from: string, to: string): NodeChange[] {
  return [...touched].map((nodeId) => {
    const own = attemptsOfNode(attempts, nodeId);
    const before = assess(own.filter((a) => a.date < from), addDays(from, -1)).mastery;
    const after = assess(own, to).mastery;
    return {
      nodeId,
      name: getNode(nodeId)?.name ?? nodeId,
      before,
      after,
      delta: before !== null && after !== null ? after - before : null,
    };
  });
}

export function dailyReport(date: string, data: ReportData): DailyReport {
  const entries = data.entries.filter((e) => e.date === date);
  const attempts = data.attempts.filter((a) => a.date === date);
  const counts = emptyCounts();
  for (const a of attempts) counts[a.result]++;
  const touched = new Set(attempts.map((a) => a.nodeIds[0]).filter(Boolean));
  const reviews = data.reviews.filter((r) => !r.auto && isoToDateStr(r.reviewedAt) === date);
  const remembered = reviews.filter((r) => r.rating >= 2).length;
  const cardsCreated = data.cards.filter((c) => c.kind !== "redo" && isoToDateStr(c.createdAt) === date).length;

  const parts: string[] = [];
  if (entries.length) parts.push(`上传 ${entries.length} 份内容`);
  if (attempts.length) parts.push(`识别 ${attempts.length} 道题，做对 ${counts.ok} 道`);
  if (cardsCreated) parts.push(`新增 ${cardsCreated} 张记忆卡`);
  if (reviews.length) parts.push(`复习 ${reviews.length} 张，记住 ${Math.round((remembered / reviews.length) * 100)}%`);

  return {
    date,
    entries: entries.map((e) => ({ id: e.id, title: e.title, status: e.status })),
    attempts: attempts.length,
    ok: counts.ok,
    counts,
    nodes: nodeChanges(data.attempts, touched, date, date).sort((a, b) => (a.after ?? 1) - (b.after ?? 1)),
    cardsCreated,
    reviews: reviews.length,
    remembered,
    highlights: entries.flatMap((e) => e.highlights ?? []),
    summaries: entries.map((e) => e.summary).filter((s): s is string => !!s),
    headline: parts.length ? parts.join("，") + "。" : "今天还没有学习记录。",
  };
}

export interface DaySeries {
  date: string;
  attempts: number;
  ok: number;
  reviews: number;
  remembered: number;
}

export interface WeeklyReport {
  from: string;
  to: string;
  days: DaySeries[];
  attempts: number;
  ok: number;
  counts: Record<ResultCode, number>;
  reviews: number;
  remembered: number;
  entries: number;
  improved: NodeChange[];
  declined: NodeChange[];
  /** 本周仍然薄弱、且已有两次以上记录的题型 */
  stillWeak: NodeChange[];
}

export function weeklyReport(endDate: string, data: ReportData): WeeklyReport {
  const days = lastNDays(endDate, 7);
  const from = days[0];
  const inWeek = (d: string) => d >= from && d <= endDate;
  const attempts = data.attempts.filter((a) => inWeek(a.date));
  const reviews = data.reviews.filter((r) => !r.auto && inWeek(isoToDateStr(r.reviewedAt)));
  const counts = emptyCounts();
  for (const a of attempts) counts[a.result]++;
  const series: DaySeries[] = days.map((date) => {
    const at = attempts.filter((a) => a.date === date);
    const rv = reviews.filter((r) => isoToDateStr(r.reviewedAt) === date);
    return {
      date,
      attempts: at.length,
      ok: at.filter((a) => a.result === "ok").length,
      reviews: rv.length,
      remembered: rv.filter((r) => r.rating >= 2).length,
    };
  });
  const touched = new Set(attempts.flatMap((a) => a.nodeIds));
  const changes = nodeChanges(data.attempts, touched, from, endDate);
  return {
    from,
    to: endDate,
    days: series,
    attempts: attempts.length,
    ok: counts.ok,
    counts,
    reviews: reviews.length,
    remembered: reviews.filter((r) => r.rating >= 2).length,
    entries: data.entries.filter((e) => inWeek(e.date)).length,
    improved: changes.filter((c) => (c.delta ?? 0) > 0.03).sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0)).slice(0, 6),
    declined: changes.filter((c) => (c.delta ?? 0) < -0.03).sort((a, b) => (a.delta ?? 0) - (b.delta ?? 0)).slice(0, 6),
    stillWeak: changes
      .filter((c) => c.after !== null && c.after < 0.45 && attemptsOfNode(data.attempts, c.nodeId).length >= 2)
      .sort((a, b) => (a.after ?? 0) - (b.after ?? 0))
      .slice(0, 6),
  };
}
