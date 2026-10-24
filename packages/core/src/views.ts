// 服务层返回给客户端的视图结构（网页版和 App 共用）。

import type { ChapterSummary, ErrorProfile, KeyCoverage, NodeState } from "./diagnosis.ts";
import type { PhaseInfo } from "./planner.ts";
import type { DailyReport, WeeklyReport } from "./reports.ts";
import type { Attachment, Attempt, Card, Chapter, DayPlan, Entry, Note, Rating, ReviewLog, Settings } from "./types.ts";

export interface ServerInfo {
  /** 是否可以用 AI 自动分析上传内容 */
  aiEnabled: boolean;
  model?: string;
  /** 演示模式：数据只存在本机，不能 AI 分析 */
  demo?: boolean;
  version: string;
}

export interface BootstrapView {
  today: string;
  settings: Settings;
  server: ServerInfo;
  taxonomy: Chapter[];
}

export interface EntryListItem extends Entry {
  attachmentCount: number;
}

export interface EntryView {
  entry: Entry;
  attachments: Attachment[];
  attempts: Attempt[];
  notes: Note[];
  cards: Card[];
}

export interface CardView extends Card {
  /** 当前可提取率（新卡为 null） */
  retention: number | null;
  /** 距离下次复习，如「3 天后」「已到期」 */
  dueLabel: string;
}

export interface PlanView extends DayPlan {
  phase: PhaseInfo;
  budget: number;
  totalMinutes: number;
  doneMinutes: number;
}

export interface Overview {
  total: number;
  tested: number;
  avgMastery: number | null;
  key: KeyCoverage;
  attempts: number;
  cards: number;
  entries: number;
}

export interface DashboardView {
  today: string;
  phase: PhaseInfo;
  plan: PlanView;
  review: { due: number; fresh: number; doneToday: number };
  processing: EntryListItem[];
  recentEntries: EntryListItem[];
  weak: NodeState[];
  blind: NodeState[];
  overview: Overview;
  report: DailyReport;
  /** 连续有学习记录的天数 */
  streak: number;
  insights: string[];
}

export interface MapChapter extends ChapterSummary {
  nodes: NodeState[];
}

export interface MapView {
  today: string;
  chapters: MapChapter[];
  overview: Overview;
}

export interface NodeView {
  state: NodeState;
  keyIdeas: string[];
  advice: string;
  prereqs: NodeState[];
  dependents: NodeState[];
  rootChains: string[][];
  attempts: Attempt[];
  notes: Note[];
  cards: CardView[];
  history: { date: string; mastery: number | null }[];
}

export interface ReviewCardView extends CardView {
  intervals: Record<Rating, string>;
}

export interface ReviewQueueView {
  today: string;
  cards: ReviewCardView[];
  counts: {
    due: number;
    fresh: number;
    doneToday: number;
    /** 今天还能复习的上限余量 */
    remaining: number;
  };
}

export interface ReviewResultView {
  card: CardView;
  log: ReviewLog;
  queue: ReviewQueueView;
}

export interface DiagnosisView {
  today: string;
  weak: NodeState[];
  blind: NodeState[];
  uncertain: NodeState[];
  errorProfile: ErrorProfile;
  chapters: ChapterSummary[];
  key: KeyCoverage;
  repeated: { nodeId: string; name: string; refs: string[] }[];
  roots: { nodeId: string; name: string; dependents: string[] }[];
  insights: string[];
}

export type { DailyReport, WeeklyReport };

export interface SettingsView {
  settings: Settings;
  server: ServerInfo;
}

export interface NewEntryInput {
  date: string;
  title?: string;
  source?: string;
  text?: string;
}

export interface ManualAttemptInput {
  date: string;
  ref: string;
  kind: Attempt["kind"];
  nodeIds: string[];
  result: Attempt["result"];
  mine?: string;
  answer?: string;
  diagnosis?: string;
}

export type AttemptPatch = Partial<Pick<Attempt, "result" | "nodeIds" | "mine" | "answer" | "diagnosis" | "ref" | "kind">>;

export type CardInput = Pick<Card, "kind" | "front" | "back" | "nodeIds">;
export type CardPatch = Partial<Pick<Card, "front" | "back" | "nodeIds" | "suspended" | "kind">>;

export interface CardQuery {
  nodeId?: string;
  kind?: Card["kind"];
  q?: string;
  /** due 只看到期 · suspended 只看暂停 */
  filter?: "due" | "suspended" | "all";
}
