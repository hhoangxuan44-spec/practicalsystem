// 服务层：所有业务逻辑都在这里，存储无关。服务器、网页演示版、App 离线模式共用同一套代码。

import { assess, attemptsOfNode, masteryHistory, RESULT_META } from "./assessment.ts";
import { addDays, formatDuration, isoToDateStr, startOfDay, toDateStr } from "./dates.ts";
import {
  blindSpots,
  chapterSummaries,
  computeNodeStates,
  errorProfile,
  insights,
  keyCoverage,
  repeatedMistakes,
  rootChain,
  uncertainNodes,
  weakPoints,
  type NodeStates,
} from "./diagnosis.ts";
import { invalid, notFound } from "./errors.ts";
import { newId, normalizeRef } from "./ids.ts";
import { applyReview, isDue, makeScheduler, newSrs, previewIntervals, ratingFromResult, retrievability, type Scheduler } from "./memory.ts";
import { evaluatePlan, generatePlan, phaseOf, type PlanContext } from "./planner.ts";
import { dailyReport, weeklyReport } from "./reports.ts";
import { loadSnapshot, snapshotOf, type Snapshot, type Store } from "./store.ts";
import { dependentsOf, getNode, isNodeId, TAXONOMY } from "./taxonomy.ts";
import type {
  Attachment,
  Attempt,
  Card,
  DayPlan,
  Entry,
  IngestAttempt,
  IngestResult,
  Note,
  Rating,
  ReviewLog,
  Settings,
} from "./types.ts";
import type {
  AttemptPatch,
  BootstrapView,
  CardInput,
  CardPatch,
  CardQuery,
  CardView,
  DashboardView,
  DiagnosisView,
  EntryListItem,
  EntryView,
  ManualAttemptInput,
  MapView,
  NewEntryInput,
  NodeView,
  Overview,
  PlanView,
  ReviewQueueView,
  ReviewResultView,
  ServerInfo,
  SettingsView,
} from "./views.ts";

export const CORE_VERSION = "0.1.0";

export interface ServiceOptions {
  clock?: () => Date;
  server?: ServerInfo;
}

interface Ctx {
  today: string;
  now: Date;
  settings: Settings;
  attempts: Attempt[];
  cards: Card[];
  reviews: ReviewLog[];
  entries: Entry[];
  scheduler: Scheduler;
  states: NodeStates;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const uniq = <T,>(xs: T[]) => [...new Set(xs)];

export class StudyService {
  constructor(
    readonly store: Store,
    private readonly opts: ServiceOptions = {},
  ) {}

  now(): Date {
    return this.opts.clock?.() ?? new Date();
  }

  today(date?: string): string {
    return date && DATE_RE.test(date) ? date : toDateStr(this.now());
  }

  get server(): ServerInfo {
    return this.opts.server ?? { aiEnabled: false, version: CORE_VERSION };
  }

  private load(today?: string): Ctx {
    const t = this.today(today);
    const now = this.now();
    const settings = this.store.getSettings();
    const attempts = this.store.list("attempts");
    const cards = this.store.list("cards");
    const scheduler = makeScheduler(settings, t);
    return {
      today: t,
      now,
      settings,
      attempts,
      cards,
      reviews: this.store.list("reviews"),
      entries: this.store.list("entries"),
      scheduler,
      states: computeNodeStates(attempts, cards, t, now, scheduler),
    };
  }

  // ---------- 概览 ----------

  bootstrap(today?: string): BootstrapView {
    return { today: this.today(today), settings: this.store.getSettings(), server: this.server, taxonomy: TAXONOMY };
  }

  dashboard(today?: string): DashboardView {
    const ctx = this.load(today);
    const queue = this.buildQueue(ctx);
    const entries = this.entryItems(ctx.entries);
    const todayLogs = ctx.reviews.filter((r) => !r.auto && isoToDateStr(r.reviewedAt) === ctx.today);
    return {
      today: ctx.today,
      phase: phaseOf(ctx.today, ctx.settings.examDate),
      plan: this.planFor(ctx, false),
      review: {
        due: queue.filter((c) => c.srs.state !== 0).length,
        fresh: queue.filter((c) => c.srs.state === 0).length,
        doneToday: todayLogs.length,
      },
      processing: entries.filter((e) => e.status === "queued" || e.status === "analyzing"),
      recentEntries: entries.slice(0, 6),
      weak: weakPoints(ctx.states, 6),
      blind: blindSpots(ctx.states, 3).slice(0, 6),
      overview: this.overview(ctx),
      report: dailyReport(ctx.today, ctx),
      streak: this.streak(ctx),
      insights: insights(ctx.states, ctx.attempts, ctx.today),
    };
  }

  map(today?: string): MapView {
    const ctx = this.load(today);
    const summaries = chapterSummaries(ctx.states, ctx.attempts);
    return {
      today: ctx.today,
      chapters: summaries.map((s) => ({
        ...s,
        nodes: TAXONOMY.find((c) => c.id === s.id)!.nodes.map((n) => ctx.states[n.id]),
      })),
      overview: this.overview(ctx),
    };
  }

  node(id: string, today?: string): NodeView {
    const node = getNode(id);
    if (!node) throw notFound("题型");
    const ctx = this.load(today);
    const state = ctx.states[id];
    const own = attemptsOfNode(ctx.attempts, id).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    return {
      state,
      keyIdeas: node.keyIdeas,
      advice: state.mainError ? RESULT_META[state.mainError].advice : state.mastery === null ? "还没有记录。找 2 道这个题型的题做完上传，系统会给出评估。" : RESULT_META.ok.advice,
      prereqs: node.prereqs.map((p) => ctx.states[p]),
      dependents: dependentsOf(id).map((d) => ctx.states[d.id]),
      rootChains: rootChain(ctx.states, id),
      attempts: own,
      notes: this.store.list("notes").filter((n) => n.nodeIds.includes(id)).sort((a, b) => b.date.localeCompare(a.date)),
      cards: ctx.cards.filter((c) => c.nodeIds.includes(id)).map((c) => this.cardView(c, ctx)),
      history: masteryHistory(own, ctx.today, 30),
    };
  }

  diagnosis(today?: string): DiagnosisView {
    const ctx = this.load(today);
    return {
      today: ctx.today,
      weak: weakPoints(ctx.states, 12),
      blind: blindSpots(ctx.states, 2),
      uncertain: uncertainNodes(ctx.states),
      errorProfile: errorProfile(ctx.attempts, ctx.today, 30),
      chapters: chapterSummaries(ctx.states, ctx.attempts),
      key: keyCoverage(ctx.states),
      repeated: repeatedMistakes(ctx.attempts).map((r) => ({ ...r, name: ctx.states[r.nodeId].name })),
      roots: Object.values(ctx.states)
        .filter((s) => s.weakDependents.length > 0)
        .sort((a, b) => b.weakDependents.length - a.weakDependents.length)
        .map((s) => ({ nodeId: s.id, name: s.name, dependents: s.weakDependents })),
      insights: insights(ctx.states, ctx.attempts, ctx.today),
    };
  }

  dailyReport(date?: string) {
    const ctx = this.load(date);
    return dailyReport(ctx.today, ctx);
  }

  weeklyReport(date?: string) {
    const ctx = this.load(date);
    return weeklyReport(ctx.today, ctx);
  }

  private overview(ctx: Ctx): Overview {
    const states = Object.values(ctx.states);
    const tested = states.filter((s) => s.mastery !== null);
    return {
      total: states.length,
      tested: tested.length,
      avgMastery: tested.length ? tested.reduce((s, x) => s + (x.mastery ?? 0), 0) / tested.length : null,
      key: keyCoverage(ctx.states),
      attempts: ctx.attempts.length,
      cards: ctx.cards.filter((c) => c.kind !== "redo" && !c.suspended).length,
      entries: ctx.entries.length,
    };
  }

  private streak(ctx: Ctx): number {
    const active = new Set<string>([
      ...ctx.entries.map((e) => e.date),
      ...ctx.reviews.filter((r) => !r.auto).map((r) => isoToDateStr(r.reviewedAt)),
    ]);
    let day = active.has(ctx.today) ? ctx.today : addDays(ctx.today, -1);
    let n = 0;
    while (active.has(day)) {
      n++;
      day = addDays(day, -1);
    }
    return n;
  }

  // ---------- 学习记录 ----------

  private entryItems(entries: Entry[]): EntryListItem[] {
    return entries
      .map((e) => ({ ...e, attachmentCount: e.attachmentIds.length }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  }

  listEntries(): EntryListItem[] {
    return this.entryItems(this.store.list("entries"));
  }

  entry(id: string): EntryView {
    const entry = this.store.get("entries", id);
    if (!entry) throw notFound("学习记录");
    return {
      entry,
      attachments: entry.attachmentIds.map((a) => this.store.get("attachments", a)).filter((a): a is Attachment => !!a),
      attempts: this.store.list("attempts").filter((a) => a.entryId === id).sort(compareRef),
      notes: this.store.list("notes").filter((n) => n.entryId === id),
      cards: this.store.list("cards").filter((c) => c.entryId === id),
    };
  }

  /** 新建一条学习记录。附件由调用方先存好（服务器存磁盘，演示版存 data URL）。 */
  createEntry(input: NewEntryInput, files: Omit<Attachment, "id" | "entryId" | "createdAt">[]): Entry {
    const date = this.today(input.date);
    if (!files.length && !input.text?.trim()) throw invalid("请至少上传一个文件或写一段说明");
    const nowIso = this.now().toISOString();
    const entryId = newId("ent");
    const attachments: Attachment[] = files.map((f) => ({ ...f, id: newId("att"), entryId, createdAt: nowIso }));
    const entry: Entry = {
      id: entryId,
      date,
      title: input.title?.trim() || defaultTitle(input, files),
      titleAuto: !input.title?.trim(),
      source: input.source?.trim() || undefined,
      text: input.text?.trim() || undefined,
      attachmentIds: attachments.map((a) => a.id),
      status: this.server.aiEnabled ? "queued" : "needs_ai",
      progress: this.server.aiEnabled ? "排队中" : undefined,
      createdAt: nowIso,
    };
    this.store.transaction(() => {
      for (const a of attachments) this.store.put("attachments", a);
      this.store.put("entries", entry);
    });
    return entry;
  }

  setEntryStatus(id: string, status: Entry["status"], progress?: string, error?: string): Entry {
    const entry = this.store.get("entries", id);
    if (!entry) throw notFound("学习记录");
    const next: Entry = { ...entry, status, progress, error };
    this.store.put("entries", next);
    return next;
  }

  /** 应用 AI 的识别评估结果。重新处理时先清掉这条记录之前生成的内容。 */
  applyIngest(entryId: string, r: IngestResult): EntryView {
    const entry = this.store.get("entries", entryId);
    if (!entry) throw notFound("学习记录");
    const now = this.now();
    const nowIso = now.toISOString();
    const scheduler = makeScheduler(this.store.getSettings(), this.today());
    this.store.transaction(() => {
      this.clearEntryOutput(entryId);
      const created = this.addAttempts(entry, r.attempts, now, scheduler);
      const byRef = new Map(created.map((a) => [normalizeRef(a.ref), a]));
      const existingFronts = new Set(this.store.list("cards").map((c) => normalizeText(c.front)));
      let cardCount = 0;
      for (const ic of r.cards) {
        const nodeIds = uniq(ic.nodeIds.filter(isNodeId));
        const key = normalizeText(ic.front);
        if (!ic.front.trim() || !ic.back.trim() || existingFronts.has(key)) continue;
        existingFronts.add(key);
        const src = ic.fromRef ? byRef.get(normalizeRef(ic.fromRef)) : undefined;
        this.store.put("cards", {
          id: newId("card"),
          nodeIds: nodeIds.length ? nodeIds : (src?.nodeIds ?? []),
          kind: ic.kind,
          front: ic.front.trim(),
          back: ic.back.trim(),
          entryId,
          sourceAttemptId: src?.id,
          createdAt: nowIso,
          srs: newSrs(now),
        });
        cardCount++;
      }
      for (const n of r.notes) {
        const note: Note = {
          id: newId("note"),
          entryId,
          date: entry.date,
          nodeIds: uniq(n.nodeIds.filter(isNodeId)),
          kind: n.kind,
          title: n.title.trim(),
          content: n.content.trim(),
          createdAt: nowIso,
        };
        this.store.put("notes", note);
      }
      this.store.put("entries", {
        ...entry,
        title: entry.titleAuto && r.title ? r.title : entry.title,
        titleAuto: entry.titleAuto && !r.title,
        source: entry.source || r.source || undefined,
        summary: r.summary,
        highlights: r.highlights,
        status: "done",
        progress: undefined,
        error: undefined,
        processedAt: nowIso,
        stats: {
          attempts: created.length,
          ok: created.filter((a) => a.result === "ok").length,
          cards: cardCount,
          notes: r.notes.length,
        },
      });
    });
    return this.entry(entryId);
  }

  /** 手动补一条做题记录（没有 AI 时的备用通道），归到当天的「手动记录」里 */
  addManualAttempt(input: ManualAttemptInput): EntryView {
    if (!input.ref.trim()) throw invalid("请填写题目出处");
    const nodeIds = uniq(input.nodeIds.filter(isNodeId));
    if (!nodeIds.length) throw invalid("请至少选择一个题型");
    const date = this.today(input.date);
    const nowIso = this.now().toISOString();
    let entry = this.store.list("entries").find((e) => e.date === date && e.source === "手动记录");
    if (!entry) {
      entry = {
        id: newId("ent"),
        date,
        title: "手动记录",
        source: "手动记录",
        attachmentIds: [],
        status: "done",
        createdAt: nowIso,
        processedAt: nowIso,
        stats: { attempts: 0, ok: 0, cards: 0, notes: 0 },
      };
    }
    const target = entry;
    const now = this.now();
    this.store.transaction(() => {
      this.store.put("entries", target);
      const created = this.addAttempts(
        target,
        [{
          ref: input.ref.trim(),
          kind: input.kind,
          nodeIds,
          mine: input.mine?.trim() ?? "",
          answer: input.answer?.trim() ?? "",
          answerSource: "user",
          result: input.result,
          diagnosis: input.diagnosis?.trim() || RESULT_META[input.result].label,
        }],
        now,
        makeScheduler(this.store.getSettings(), date),
      );
      const stats = target.stats ?? { attempts: 0, ok: 0, cards: 0, notes: 0 };
      this.store.put("entries", {
        ...target,
        stats: { ...stats, attempts: stats.attempts + created.length, ok: stats.ok + created.filter((a) => a.result === "ok").length },
      });
    });
    return this.entry(target.id);
  }

  /** 写入作答记录：给做错的题建重做卡；如果之前有同一道题的重做卡，按这次结果自动复习它 */
  private addAttempts(entry: Entry, items: IngestAttempt[], now: Date, scheduler: Scheduler): Attempt[] {
    const nowIso = now.toISOString();
    const redoByRef = new Map<string, Card>();
    for (const c of this.store.list("cards")) {
      if (c.kind === "redo" && c.sourceRef && c.entryId !== entry.id) redoByRef.set(normalizeRef(c.sourceRef), c);
    }
    const autoLogged = new Set(
      this.store.list("reviews").filter((l) => l.auto && l.entryId === entry.id).map((l) => l.cardId),
    );
    const created: Attempt[] = [];
    for (const ia of items) {
      const attempt: Attempt = {
        id: newId("try"),
        entryId: entry.id,
        date: entry.date,
        ref: ia.ref.trim() || "未标注出处",
        kind: ia.kind,
        stem: ia.stem?.trim() || undefined,
        nodeIds: uniq(ia.nodeIds.filter(isNodeId)),
        mine: ia.mine,
        answer: ia.answer,
        result: ia.result,
        diagnosis: ia.diagnosis,
        keySteps: ia.keySteps?.length ? ia.keySteps : undefined,
        confidence: ia.confidence,
        answerSource: ia.answerSource,
        createdAt: nowIso,
      };
      this.store.put("attempts", attempt);
      created.push(attempt);

      const redo = redoByRef.get(normalizeRef(attempt.ref));
      if (redo) {
        if (!autoLogged.has(redo.id)) this.reviewInternal(redo, ratingFromResult(attempt.result), now, scheduler, entry.id);
        continue;
      }
      if (attempt.result !== "ok") this.store.put("cards", this.redoCard(attempt, now));
    }
    return created;
  }

  private redoCard(a: Attempt, now: Date): Card {
    const srs = newSrs(now);
    // 当天刚做过，第二天再安排重做
    srs.due = startOfDay(new Date(now.getTime() + 86_400_000)).toISOString();
    const back = [
      a.answer ? `答案：${a.answer}` : "",
      a.keySteps?.length ? `关键步骤：${a.keySteps.join(" → ")}` : "",
      `上次：${RESULT_META[a.result].label}。${a.diagnosis}`,
    ].filter(Boolean).join("\n");
    return {
      id: newId("card"),
      nodeIds: a.nodeIds,
      kind: "redo",
      front: `${a.ref}${a.stem ? "：" + a.stem : ""}`,
      back,
      entryId: a.entryId,
      sourceAttemptId: a.id,
      sourceRef: a.ref,
      createdAt: now.toISOString(),
      srs,
    };
  }

  private clearEntryOutput(entryId: string) {
    const cardIds = new Set<string>();
    for (const a of this.store.list("attempts")) if (a.entryId === entryId) this.store.remove("attempts", a.id);
    for (const n of this.store.list("notes")) if (n.entryId === entryId) this.store.remove("notes", n.id);
    for (const c of this.store.list("cards")) {
      if (c.entryId === entryId) {
        cardIds.add(c.id);
        this.store.remove("cards", c.id);
      }
    }
    for (const l of this.store.list("reviews")) if (cardIds.has(l.cardId)) this.store.remove("reviews", l.id);
  }

  /** 删除学习记录及其生成的内容，返回需要删除的附件文件路径 */
  deleteEntry(id: string): string[] {
    const entry = this.store.get("entries", id);
    if (!entry) throw notFound("学习记录");
    const paths: string[] = [];
    this.store.transaction(() => {
      this.clearEntryOutput(id);
      for (const aid of entry.attachmentIds) {
        const att = this.store.get("attachments", aid);
        if (att) {
          paths.push(att.path);
          this.store.remove("attachments", aid);
        }
      }
      this.store.remove("entries", id);
    });
    return paths;
  }

  /** 修正 AI 的判定。结果改变时同步增删重做卡。 */
  updateAttempt(id: string, patch: AttemptPatch): EntryView {
    const a = this.store.get("attempts", id);
    if (!a) throw notFound("做题记录");
    const nodeIds = patch.nodeIds ? uniq(patch.nodeIds.filter(isNodeId)) : a.nodeIds;
    if (patch.nodeIds && !nodeIds.length) throw invalid("请至少选择一个题型");
    const next: Attempt = { ...a, ...patch, nodeIds, corrected: true };
    const now = this.now();
    this.store.transaction(() => {
      this.store.put("attempts", next);
      const redos = this.store.list("cards").filter((c) => c.kind === "redo" && c.sourceAttemptId === id);
      if (next.result === "ok") {
        for (const c of redos) if (c.srs.reps === 0) this.store.remove("cards", c.id);
      } else if (!redos.length) {
        this.store.put("cards", this.redoCard(next, now));
      } else {
        for (const c of redos) this.store.put("cards", { ...c, nodeIds, front: `${next.ref}${next.stem ? "：" + next.stem : ""}` });
      }
      for (const c of this.store.list("cards")) {
        if (c.kind !== "redo" && c.sourceAttemptId === id && patch.nodeIds) this.store.put("cards", { ...c, nodeIds });
      }
      const entry = this.store.get("entries", a.entryId);
      if (entry?.stats) {
        const all = this.store.list("attempts").filter((x) => x.entryId === a.entryId);
        this.store.put("entries", { ...entry, stats: { ...entry.stats, attempts: all.length, ok: all.filter((x) => x.result === "ok").length } });
      }
    });
    return this.entry(a.entryId);
  }

  // ---------- 记忆复习 ----------

  private buildQueue(ctx: Ctx): Card[] {
    const { settings, now, states } = ctx;
    const todayLogs = ctx.reviews.filter((r) => !r.auto && isoToDateStr(r.reviewedAt) === ctx.today);
    const freshDone = todayLogs.filter((l) => l.prev.state === 0).length;
    const active = ctx.cards.filter((c) => !c.suspended && c.kind !== "redo");
    const prio = (c: Card) => Math.max(0, ...c.nodeIds.map((id) => states[id]?.priority ?? 0));
    const learning = active
      .filter((c) => (c.srs.state === 1 || c.srs.state === 3) && isDue(c, now))
      .sort((a, b) => a.srs.due.localeCompare(b.srs.due));
    const review = active
      .filter((c) => c.srs.state === 2 && isDue(c, now))
      .map((c) => ({ c, r: retrievability(c.srs, now, ctx.scheduler) ?? 1 }))
      .sort((a, b) => a.r - b.r || prio(b.c) - prio(a.c))
      .map((x) => x.c);
    const fresh = active
      .filter((c) => c.srs.state === 0)
      .sort((a, b) => prio(b) - prio(a) || a.createdAt.localeCompare(b.createdAt));
    const remaining = Math.max(0, settings.maxReviewsPerDay - todayLogs.length);
    const queue = [...learning];
    for (const c of review) if (queue.length < Math.max(remaining, learning.length)) queue.push(c);
    const freshCap = Math.min(Math.max(0, settings.newCardsPerDay - freshDone), Math.max(0, remaining - queue.length));
    queue.push(...fresh.slice(0, freshCap));
    return queue;
  }

  reviewQueue(today?: string): ReviewQueueView {
    const ctx = this.load(today);
    const queue = this.buildQueue(ctx);
    const todayLogs = ctx.reviews.filter((r) => !r.auto && isoToDateStr(r.reviewedAt) === ctx.today);
    return {
      today: ctx.today,
      cards: queue.map((c) => ({ ...this.cardView(c, ctx), intervals: previewIntervals(c.srs, ctx.now, ctx.scheduler) })),
      counts: {
        due: queue.filter((c) => c.srs.state !== 0).length,
        fresh: queue.filter((c) => c.srs.state === 0).length,
        doneToday: todayLogs.length,
        remaining: Math.max(0, ctx.settings.maxReviewsPerDay - todayLogs.length),
      },
    };
  }

  private reviewInternal(card: Card, rating: Rating, now: Date, scheduler: Scheduler, autoEntryId?: string): ReviewLog {
    const srs = applyReview(card.srs, rating, now, scheduler);
    this.store.put("cards", { ...card, srs });
    const log: ReviewLog = {
      id: newId("rev"),
      cardId: card.id,
      rating,
      reviewedAt: now.toISOString(),
      prev: card.srs,
      nextDue: srs.due,
      ...(autoEntryId ? { auto: true, entryId: autoEntryId } : {}),
    };
    this.store.put("reviews", log);
    return log;
  }

  review(cardId: string, rating: Rating, today?: string): ReviewResultView {
    if (![1, 2, 3, 4].includes(rating)) throw invalid("评分只能是 1 到 4");
    const card = this.store.get("cards", cardId);
    if (!card) throw notFound("记忆卡");
    const t = this.today(today);
    const log = this.store.transaction(() => this.reviewInternal(card, rating, this.now(), makeScheduler(this.store.getSettings(), t)));
    const ctx = this.load(t);
    return { card: this.cardView(this.store.get("cards", cardId)!, ctx), log, queue: this.reviewQueue(t) };
  }

  /** 撤销一次复习，卡片恢复到复习前的状态 */
  undoReview(logId: string, today?: string): ReviewQueueView {
    const log = this.store.get("reviews", logId);
    if (!log) throw notFound("复习记录");
    const card = this.store.get("cards", log.cardId);
    this.store.transaction(() => {
      if (card) this.store.put("cards", { ...card, srs: log.prev });
      this.store.remove("reviews", logId);
    });
    return this.reviewQueue(today);
  }

  private cardView(c: Card, ctx: Pick<Ctx, "now" | "scheduler">): CardView {
    const dueMs = new Date(c.srs.due).getTime() - ctx.now.getTime();
    const dueLabel = c.suspended ? "已暂停" : c.srs.state === 0 ? "新卡" : dueMs <= 0 ? "已到期" : `${formatDuration(dueMs)}后`;
    return { ...c, retention: retrievability(c.srs, ctx.now, ctx.scheduler), dueLabel };
  }

  cards(query: CardQuery = {}, today?: string): CardView[] {
    const ctx = this.load(today);
    const q = query.q?.trim().toLowerCase();
    return ctx.cards
      .filter((c) => !query.nodeId || c.nodeIds.includes(query.nodeId))
      .filter((c) => !query.kind || c.kind === query.kind)
      .filter((c) => (query.filter === "suspended" ? c.suspended : query.filter === "due" ? isDue(c, ctx.now) : true))
      .filter((c) => !q || `${c.front}\n${c.back}`.toLowerCase().includes(q))
      .sort((a, b) => a.srs.due.localeCompare(b.srs.due))
      .map((c) => this.cardView(c, ctx));
  }

  createCard(input: CardInput): Card {
    if (!input.front?.trim() || !input.back?.trim()) throw invalid("正面和背面都要填写");
    const card: Card = {
      id: newId("card"),
      kind: input.kind,
      front: input.front.trim(),
      back: input.back.trim(),
      nodeIds: uniq((input.nodeIds ?? []).filter(isNodeId)),
      createdAt: this.now().toISOString(),
      srs: newSrs(this.now()),
    };
    this.store.put("cards", card);
    return card;
  }

  updateCard(id: string, patch: CardPatch): Card {
    const card = this.store.get("cards", id);
    if (!card) throw notFound("记忆卡");
    const next: Card = { ...card, ...patch, nodeIds: patch.nodeIds ? uniq(patch.nodeIds.filter(isNodeId)) : card.nodeIds };
    this.store.put("cards", next);
    return next;
  }

  deleteCard(id: string): void {
    if (!this.store.get("cards", id)) throw notFound("记忆卡");
    this.store.transaction(() => {
      this.store.remove("cards", id);
      for (const l of this.store.list("reviews")) if (l.cardId === id) this.store.remove("reviews", l.id);
    });
  }

  // ---------- 训练计划 ----------

  private planContext(ctx: Ctx): PlanContext {
    return { ...ctx, reviewQueue: this.buildQueue(ctx) };
  }

  private planFor(ctx: Ctx, regenerate: boolean): PlanView {
    const pctx = this.planContext(ctx);
    let plan: DayPlan | undefined = this.store.get("plans", ctx.today);
    if (!plan || regenerate) {
      plan = generatePlan(pctx);
      this.store.put("plans", plan);
    }
    const evaluated = evaluatePlan(plan, pctx);
    const total = evaluated.tasks.reduce((s, t) => s + t.minutes, 0);
    return {
      ...evaluated,
      phase: phaseOf(ctx.today, ctx.settings.examDate),
      budget: ctx.settings.dailyMinutes,
      totalMinutes: total,
      doneMinutes: evaluated.tasks.filter((t) => t.done).reduce((s, t) => s + t.minutes, 0),
    };
  }

  plan(today?: string): PlanView {
    return this.planFor(this.load(today), false);
  }

  regeneratePlan(today?: string): PlanView {
    return this.planFor(this.load(today), true);
  }

  setTaskDone(date: string, taskId: string, done: boolean): PlanView {
    const plan = this.store.get("plans", date);
    if (!plan) throw notFound("当天计划");
    if (!plan.tasks.some((t) => t.id === taskId)) throw notFound("任务");
    this.store.put("plans", {
      ...plan,
      tasks: plan.tasks.map((t) => (t.id === taskId ? { ...t, done, manual: true, doneAuto: false } : t)),
    });
    return this.plan(date);
  }

  // ---------- 设置与数据 ----------

  settings(): SettingsView {
    return { settings: this.store.getSettings(), server: this.server };
  }

  updateSettings(patch: Partial<Settings>): SettingsView {
    const cur = this.store.getSettings();
    const next: Settings = { ...cur, ...patch };
    if (!DATE_RE.test(next.examDate)) throw invalid("考试日期格式应为 YYYY-MM-DD");
    for (const [k, min, max] of [["dailyMinutes", 30, 900], ["newCardsPerDay", 0, 200], ["maxReviewsPerDay", 10, 1000]] as const) {
      const v = Number(next[k]);
      if (!Number.isFinite(v) || v < min || v > max) throw invalid(`${k} 应在 ${min} 到 ${max} 之间`);
      next[k] = Math.round(v);
    }
    this.store.putSettings(next);
    // 设置变化会影响当天计划，删除后下次访问时重新生成
    this.store.remove("plans", this.today());
    return this.settings();
  }

  exportData(): Snapshot {
    return snapshotOf(this.store);
  }

  importData(snap: Snapshot): void {
    if (!snap || snap.version !== 1) throw invalid("不是有效的导出文件");
    loadSnapshot(this.store, snap);
  }

  /** 当前每个题型的掌握度（供导出和外部使用） */
  nodeStates(today?: string): NodeStates {
    return this.load(today).states;
  }

  /** 单题型在指定日期的评估（测试用） */
  assessNode(id: string, today?: string) {
    return assess(attemptsOfNode(this.store.list("attempts"), id), this.today(today));
  }
}

function defaultTitle(input: Pick<NewEntryInput, "source" | "text">, files: { name: string }[]): string {
  if (input.source?.trim()) return input.source.trim();
  if (files.length) return files.length === 1 ? files[0].name.replace(/\.[^.]+$/, "") : `${files.length} 个文件`;
  return (input.text ?? "").trim().slice(0, 20) || "学习记录";
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, "").toLowerCase();
}

/** 按题号自然排序：2022-2 在 2022-10 前面 */
function compareRef(a: Attempt, b: Attempt): number {
  return a.ref.localeCompare(b.ref, "zh-CN", { numeric: true });
}
