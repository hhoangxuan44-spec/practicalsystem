// 领域模型。所有日期字段：date 为本地日期 YYYY-MM-DD，*At 为 ISO 时间串。

export type Part = "高数" | "线代";

/** 一次作答的判定结果 */
export type ResultCode = "ok" | "calc" | "partial" | "method" | "concept" | "blank";

export type ProblemKind = "选择" | "填空" | "解答" | "例题" | "练习";

/** 记忆卡类型：公式结论 / 方法识别 / 易错点 / 错题重做 */
export type CardKind = "formula" | "method" | "pitfall" | "redo";

export type NoteKind = "formula" | "method" | "concept" | "pitfall";

/**
 * 学习记录的处理状态
 * queued 等待处理 · analyzing AI 识别评估中 · done 完成 · failed 失败 · needs_ai 未配置 AI，只保存了原件
 */
export type EntryStatus = "queued" | "analyzing" | "done" | "failed" | "needs_ai";

/** 复习评分：1 忘了 · 2 模糊 · 3 记得 · 4 秒答 */
export type Rating = 1 | 2 | 3 | 4;

export type Level = "good" | "warn" | "bad" | "none";
export type Confidence = "none" | "low" | "medium" | "high";

// ---------- 题型体系 ----------

export interface TopicNode {
  id: string;
  name: string;
  chapterId: string;
  /** 考频：3 几乎每年考 · 2 常考 · 1 偶尔 */
  freq: 1 | 2 | 3;
  /** 前置题型：这些没掌握，本题型大概率也做不好 */
  prereqs: string[];
  /** 标准方法要点（内置知识） */
  keyIdeas: string[];
}

export interface Chapter {
  id: string;
  name: string;
  part: Part;
  nodes: TopicNode[];
}

// ---------- 学习记录（每天上传的内容） ----------

export interface Entry {
  id: string;
  /** 学习日期 */
  date: string;
  title: string;
  /** 标题是系统自动起的（AI 分析后可替换） */
  titleAuto?: boolean;
  /** 资料来源，如「2022 数二真题」「张宇强化 第 5 讲」 */
  source?: string;
  /** 用户补充的文字说明 */
  text?: string;
  attachmentIds: string[];
  status: EntryStatus;
  /** 处理中的进度说明 */
  progress?: string;
  error?: string;
  /** AI 写的本次学习总结 */
  summary?: string;
  /** 本次要记住的要点 */
  highlights?: string[];
  stats?: EntryStats;
  createdAt: string;
  processedAt?: string;
}

export interface EntryStats {
  attempts: number;
  ok: number;
  cards: number;
  notes: number;
}

export interface Attachment {
  id: string;
  entryId: string;
  name: string;
  mime: string;
  size: number;
  /** 存储位置（服务器相对路径，或演示模式下的 data URL） */
  path: string;
  createdAt: string;
}

/** 一道题的作答记录（从上传内容中识别并评估得到） */
export interface Attempt {
  id: string;
  entryId: string;
  date: string;
  /** 题目出处，如「2022-14」「张宇强化 例 5.3」 */
  ref: string;
  kind: ProblemKind;
  /** 题目简述 */
  stem?: string;
  /** 归属题型，第一个为主题型 */
  nodeIds: string[];
  /** 你的答案 */
  mine: string;
  /** 标准答案 */
  answer: string;
  result: ResultCode;
  /** 错在哪、应该怎么做 */
  diagnosis: string;
  keySteps?: string[];
  /** AI 判定的把握 0~1 */
  confidence?: number;
  /** 标准答案来源：材料里的答案页 / AI 自己解出 / 用户填写 */
  answerSource?: "key" | "solved" | "user";
  /** 用户手动修正过判定 */
  corrected?: boolean;
  createdAt: string;
}

/** 从笔记中整理出的知识点 */
export interface Note {
  id: string;
  entryId?: string;
  date: string;
  nodeIds: string[];
  kind: NoteKind;
  title: string;
  content: string;
  createdAt: string;
}

/** FSRS 记忆状态 */
export interface SrsState {
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** 0 新卡 · 1 学习中 · 2 复习 · 3 重学 */
  state: 0 | 1 | 2 | 3;
  lastReview?: string;
}

export interface Card {
  id: string;
  nodeIds: string[];
  kind: CardKind;
  front: string;
  back: string;
  entryId?: string;
  sourceAttemptId?: string;
  /** 重做卡对应的题目出处，用于上传重做结果时自动评分 */
  sourceRef?: string;
  suspended?: boolean;
  createdAt: string;
  srs: SrsState;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  rating: Rating;
  reviewedAt: string;
  /** 复习前的状态，用于撤销 */
  prev: SrsState;
  nextDue: string;
  /** 由上传的重做结果自动评分 */
  auto?: boolean;
  /** 自动评分来自哪条学习记录 */
  entryId?: string;
}

// ---------- 训练计划 ----------

export type TaskKind = "review" | "redo" | "study" | "diagnose" | "exam";

export interface PlanTask {
  id: string;
  kind: TaskKind;
  title: string;
  detail: string;
  /** 为什么安排这项 */
  reason: string;
  minutes: number;
  nodeId?: string;
  cardIds?: string[];
  attemptId?: string;
  ref?: string;
  /** 计划生成时的目标数量（复习卡张数、需做题数） */
  target?: number;
  done: boolean;
  /** 由系统根据上传/复习记录自动勾选 */
  doneAuto?: boolean;
  /** 用户手动设置过完成状态 */
  manual?: boolean;
}

export interface DayPlan {
  id: string; // = date
  date: string;
  tasks: PlanTask[];
  generatedAt: string;
}

// ---------- 设置 ----------

export interface Settings {
  /** 考试日期 */
  examDate: string;
  /** 每天给数学的分钟数 */
  dailyMinutes: number;
  newCardsPerDay: number;
  maxReviewsPerDay: number;
  /** 正在用的强化书/课程 */
  book?: string;
}

export const DEFAULT_SETTINGS: Settings = {
  examDate: "2026-12-19",
  dailyMinutes: 240,
  newCardsPerDay: 20,
  maxReviewsPerDay: 80,
};

// ---------- AI 识别结果（服务器校验后传给服务层） ----------

export interface IngestAttempt {
  ref: string;
  kind: ProblemKind;
  stem?: string;
  nodeIds: string[];
  mine: string;
  answer: string;
  answerSource?: "key" | "solved" | "user";
  result: ResultCode;
  diagnosis: string;
  keySteps?: string[];
  confidence?: number;
}

export interface IngestCard {
  kind: Exclude<CardKind, "redo">;
  nodeIds: string[];
  front: string;
  back: string;
  /** 由哪道题的错误生成 */
  fromRef?: string;
}

export interface IngestNote {
  kind: NoteKind;
  nodeIds: string[];
  title: string;
  content: string;
}

export interface IngestResult {
  title?: string;
  source?: string;
  summary: string;
  highlights: string[];
  attempts: IngestAttempt[];
  notes: IngestNote[];
  cards: IngestCard[];
}
