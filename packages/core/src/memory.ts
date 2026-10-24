// 自记忆系统：用 FSRS 算法安排每张卡的复习时间。
// 记得越牢，下次间隔越长；忘了就缩短。最长间隔不超过考试日期，保证考前都复习到。

import { createEmptyCard, fsrs, type Card as FsrsCard, type FSRS, type Grade } from "ts-fsrs";
import { daysBetween, formatDuration, startOfDay } from "./dates.ts";
import type { Card, Rating, Settings, SrsState } from "./types.ts";

export const RATING_LABEL: Record<Rating, string> = { 1: "忘了", 2: "模糊", 3: "记得", 4: "秒答" };

export type Scheduler = FSRS;

export function makeScheduler(settings: Settings, today: string): Scheduler {
  const daysLeft = daysBetween(today, settings.examDate);
  const maximumInterval = daysLeft > 2 ? daysLeft - 1 : 36500;
  return fsrs({ request_retention: 0.9, maximum_interval: maximumInterval, enable_fuzz: true, enable_short_term: true });
}

export function newSrs(now: Date): SrsState {
  return fromFsrs(createEmptyCard(now));
}

function toFsrs(s: SrsState): FsrsCard {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsedDays,
    scheduled_days: s.scheduledDays,
    learning_steps: s.learningSteps,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.lastReview ? new Date(s.lastReview) : undefined,
  };
}

function fromFsrs(c: FsrsCard): SrsState {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsedDays: c.elapsed_days,
    scheduledDays: c.scheduled_days,
    learningSteps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state as SrsState["state"],
    lastReview: c.last_review ? c.last_review.toISOString() : undefined,
  };
}

/** 间隔以天计时，把到期时间对齐到当天 0 点，按「天」到期而不是按钟点 */
function alignDue(c: FsrsCard): FsrsCard {
  if (c.scheduled_days >= 1) c.due = startOfDay(c.due);
  return c;
}

export function applyReview(srs: SrsState, rating: Rating, now: Date, scheduler: Scheduler): SrsState {
  const { card } = scheduler.next(toFsrs(srs), now, rating as Grade);
  return fromFsrs(alignDue(card));
}

/** 每个评分按钮对应的下次间隔，例如 { 1: "1 分钟", 3: "3 天" } */
export function previewIntervals(srs: SrsState, now: Date, scheduler: Scheduler): Record<Rating, string> {
  const preview = scheduler.repeat(toFsrs(srs), now);
  const out = {} as Record<Rating, string>;
  for (const r of [1, 2, 3, 4] as Rating[]) {
    const next = alignDue({ ...preview[r as Grade].card });
    out[r] = formatDuration(next.due.getTime() - now.getTime());
  }
  return out;
}

/** 当前还能回忆起来的概率；新卡没有数据，返回 null */
export function retrievability(srs: SrsState, now: Date, scheduler: Scheduler): number | null {
  if (srs.state === 0) return null;
  return scheduler.get_retrievability(toFsrs(srs), now, false);
}

export function isDue(card: Card, now: Date): boolean {
  return !card.suspended && new Date(card.srs.due).getTime() <= now.getTime();
}

/** 由一次重做的判定结果换算成复习评分 */
export function ratingFromResult(result: string): Rating {
  if (result === "ok") return 3;
  if (result === "calc") return 2;
  return 1;
}
