// 诊断：每个题型的综合状态、薄弱点排序、根因、盲区、错因画像。

import { assess, attemptsOfNode, masteryTrend, RESULT_META, RESULT_ORDER } from "./assessment.ts";
import { addDays, daysBetween } from "./dates.ts";
import { isDue, retrievability, type Scheduler } from "./memory.ts";
import { ALL_NODES, examWeight, getChapter, TAXONOMY } from "./taxonomy.ts";
import type { Attempt, Card, Confidence, Level, Part, ResultCode, TopicNode } from "./types.ts";

export interface NodeState {
  id: string;
  name: string;
  chapterId: string;
  chapterName: string;
  part: Part;
  freq: TopicNode["freq"];
  isKey: boolean;
  mastery: number | null;
  level: Level;
  confidence: Confidence;
  count: number;
  nEff: number;
  sd: number;
  lastSeen?: string;
  errorCounts: Partial<Record<ResultCode, number>>;
  mainError: ResultCode | null;
  /** 该题型记忆卡的平均可提取率 */
  retention: number | null;
  cardCount: number;
  dueCards: number;
  /** 最近 7 天掌握度变化 */
  trend7: number | null;
  /** 补强优先级，越大越该先补 */
  priority: number;
  /** 可能的根因：没掌握的前置题型 */
  rootCauses: string[];
  /** 被本题型拖累的下游题型 */
  weakDependents: string[];
}

export type NodeStates = Record<string, NodeState>;

const isWeak = (l: Level) => l === "bad" || l === "warn";

export function computeNodeStates(
  attempts: Attempt[],
  cards: Card[],
  today: string,
  now: Date,
  scheduler: Scheduler,
): NodeStates {
  const states: NodeStates = {};
  for (const node of ALL_NODES) {
    const own = attemptsOfNode(attempts, node.id);
    const a = assess(own, today);
    const nodeCards = cards.filter((c) => !c.suspended && c.nodeIds.includes(node.id));
    const rets = nodeCards.map((c) => retrievability(c.srs, now, scheduler)).filter((r): r is number => r !== null);
    const chapter = getChapter(node.chapterId)!;
    states[node.id] = {
      id: node.id,
      name: node.name,
      chapterId: node.chapterId,
      chapterName: chapter.name,
      part: chapter.part,
      freq: node.freq,
      isKey: node.freq === 3,
      mastery: a.mastery,
      level: a.level,
      confidence: a.confidence,
      count: a.count,
      nEff: a.nEff,
      sd: a.sd,
      lastSeen: a.lastSeen,
      errorCounts: a.errorCounts,
      mainError: a.mainError,
      retention: rets.length ? rets.reduce((s, r) => s + r, 0) / rets.length : null,
      cardCount: nodeCards.length,
      dueCards: nodeCards.filter((c) => c.kind !== "redo" && isDue(c, now)).length,
      trend7: own.length ? masteryTrend(own, today, 7) : null,
      priority: 0,
      rootCauses: [],
      weakDependents: [],
    };
  }

  // 根因：薄弱题型的前置题型如果也没掌握（或是从没测过的常考题型），就是可能的根因
  for (const node of ALL_NODES) {
    const s = states[node.id];
    if (!isWeak(s.level)) continue;
    for (const p of node.prereqs) {
      const ps = states[p];
      // 证据太少（只有一次记录、而且不算差）的前置题型不当作根因，避免过度推断
      const suspect = ps.level === "bad" || (ps.level === "warn" && ps.confidence !== "low") || (ps.level === "none" && ps.freq >= 2);
      if (suspect) {
        s.rootCauses.push(p);
        ps.weakDependents.push(node.id);
      }
    }
  }

  for (const s of Object.values(states)) {
    const w = examWeight(s.freq);
    const boost = Math.min(0.25, 0.08 * s.weakDependents.length);
    if (s.mastery === null) {
      s.priority = boost > 0 ? 0.25 * w + boost : 0;
    } else {
      const conf = s.confidence === "low" ? 0.7 : s.confidence === "medium" ? 0.9 : 1;
      s.priority = w * (1 - s.mastery) * conf + boost;
    }
  }
  return states;
}

/** 薄弱点：已有记录、掌握度不够的题型，按优先级排序 */
export function weakPoints(states: NodeStates, limit = 10): NodeState[] {
  return Object.values(states)
    .filter((s) => s.mastery !== null && s.level !== "good")
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}

/** 盲区：从没测过的常考题型（考频高的在前） */
export function blindSpots(states: NodeStates, minFreq: TopicNode["freq"] = 2): NodeState[] {
  return Object.values(states)
    .filter((s) => s.mastery === null && s.freq >= minFreq)
    .sort((a, b) => b.freq - a.freq || b.priority - a.priority);
}

/** 证据不足：只有零星记录，颜色还不可信的题型 */
export function uncertainNodes(states: NodeStates): NodeState[] {
  return Object.values(states)
    .filter((s) => s.mastery !== null && s.confidence === "low")
    .sort((a, b) => b.freq - a.freq);
}

/** 薄弱题型的根因链，最多追两层：[本题型, 前置, 前置的前置] */
export function rootChain(states: NodeStates, nodeId: string): string[][] {
  const chains: string[][] = [];
  for (const p of states[nodeId]?.rootCauses ?? []) {
    const deeper = states[p].rootCauses;
    if (deeper.length) for (const q of deeper) chains.push([nodeId, p, q]);
    else chains.push([nodeId, p]);
  }
  return chains;
}

export interface ErrorProfile {
  sinceDays: number;
  total: number;
  counts: Record<ResultCode, number>;
  /** 做错的题里占比最大的错误类型 */
  dominant: ResultCode | null;
  dominantShare: number;
  advice: string;
}

export function errorProfile(attempts: Attempt[], today: string, sinceDays = 30): ErrorProfile {
  const since = addDays(today, -sinceDays + 1);
  const recent = attempts.filter((a) => a.date >= since && a.date <= today);
  const counts = Object.fromEntries(RESULT_ORDER.map((r) => [r, 0])) as Record<ResultCode, number>;
  for (const a of recent) counts[a.result]++;
  const wrong = recent.length - counts.ok;
  let dominant: ResultCode | null = null;
  for (const r of RESULT_ORDER) {
    if (r === "ok") continue;
    if (counts[r] > 0 && (dominant === null || counts[r] > counts[dominant])) dominant = r;
  }
  return {
    sinceDays,
    total: recent.length,
    counts,
    dominant,
    dominantShare: dominant && wrong ? counts[dominant] / wrong : 0,
    advice: dominant ? RESULT_META[dominant].advice : "",
  };
}

export interface ChapterSummary {
  id: string;
  name: string;
  part: Part;
  avg: number | null;
  tested: number;
  total: number;
  weak: number;
  counts: Record<ResultCode, number>;
}

export function chapterSummaries(states: NodeStates, attempts: Attempt[]): ChapterSummary[] {
  return TAXONOMY.map((ch) => {
    const ss = ch.nodes.map((n) => states[n.id]);
    const tested = ss.filter((s) => s.mastery !== null);
    const counts = Object.fromEntries(RESULT_ORDER.map((r) => [r, 0])) as Record<ResultCode, number>;
    for (const a of attempts) {
      const primary = a.nodeIds[0];
      if (primary && ch.nodes.some((n) => n.id === primary)) counts[a.result]++;
    }
    return {
      id: ch.id,
      name: ch.name,
      part: ch.part,
      avg: tested.length ? tested.reduce((s, x) => s + (x.mastery ?? 0), 0) / tested.length : null,
      tested: tested.length,
      total: ss.length,
      weak: ss.filter((s) => isWeak(s.level)).length,
      counts,
    };
  });
}

export interface KeyCoverage {
  total: number;
  tested: number;
  good: number;
}

/** 重点（几乎每年考的题型）覆盖情况 */
export function keyCoverage(states: NodeStates): KeyCoverage {
  const keys = Object.values(states).filter((s) => s.isKey);
  return {
    total: keys.length,
    tested: keys.filter((s) => s.mastery !== null).length,
    good: keys.filter((s) => s.level === "good").length,
  };
}

/** 反复出错：同一题型在两份以上材料里都做错 */
export function repeatedMistakes(attempts: Attempt[]): { nodeId: string; refs: string[] }[] {
  const byNode = new Map<string, { entries: Set<string>; refs: string[] }>();
  for (const a of attempts) {
    if (a.result === "ok") continue;
    const id = a.nodeIds[0];
    if (!id) continue;
    const e = byNode.get(id) ?? { entries: new Set<string>(), refs: [] };
    e.entries.add(a.entryId);
    e.refs.push(a.ref);
    byNode.set(id, e);
  }
  return [...byNode.entries()]
    .filter(([, v]) => v.entries.size >= 2)
    .map(([nodeId, v]) => ({ nodeId, refs: v.refs }))
    .sort((a, b) => b.refs.length - a.refs.length);
}

/** 用一两句话说出当前最值得注意的事 */
export function insights(states: NodeStates, attempts: Attempt[], today: string): string[] {
  const out: string[] = [];
  const prof = errorProfile(attempts, today, 30);
  const wrong = prof.total - prof.counts.ok;
  if (wrong > 0 && prof.dominant) {
    out.push(`最近 30 天做错的 ${wrong} 题里，${Math.round(prof.dominantShare * 100)}% 是「${RESULT_META[prof.dominant].label}」。${prof.advice}`);
  }
  for (const r of repeatedMistakes(attempts).slice(0, 2)) {
    out.push(`「${states[r.nodeId].name}」在不同材料里错了 ${r.refs.length} 次（${r.refs.join("、")}），不是偶然失误。`);
  }
  const roots = Object.values(states)
    .filter((s) => s.weakDependents.length >= 2)
    .sort((a, b) => b.weakDependents.length - a.weakDependents.length);
  for (const s of roots.slice(0, 1)) {
    out.push(`「${s.name}」是 ${s.weakDependents.length} 个薄弱题型的前置，先补它收益最大。`);
  }
  const blind = blindSpots(states, 3);
  if (blind.length) {
    out.push(`有 ${blind.length} 个几乎每年考的题型还没有任何记录，比如「${blind[0].name}」。`);
  }
  const stale = Object.values(states).filter(
    (s) => s.level === "good" && s.lastSeen && daysBetween(s.lastSeen, today) > 21,
  );
  if (stale.length) out.push(`${stale.length} 个已掌握的题型超过 3 周没碰，掌握度在慢慢下降。`);
  return out;
}
