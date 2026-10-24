// API 契约：网页版和 App 都只依赖这个接口。
// createHttpApi 连接服务器；createLocalApi 直接调用本机的服务层（演示 / 离线模式）。

import type { Snapshot } from "./store.ts";
import type { StudyService } from "./service.ts";
import type { Card, Entry, Rating, Settings } from "./types.ts";
import type {
  AttemptPatch,
  BootstrapView,
  CardInput,
  CardPatch,
  CardQuery,
  CardView,
  DailyReport,
  DashboardView,
  DiagnosisView,
  EntryListItem,
  EntryView,
  ManualAttemptInput,
  MapView,
  NewEntryInput,
  NodeView,
  PlanView,
  ReviewQueueView,
  ReviewResultView,
  SettingsView,
  WeeklyReport,
} from "./views.ts";

/** 待上传的文件。网页传 blob，React Native 传 uri。 */
export interface UploadFile {
  name: string;
  type: string;
  size?: number;
  blob?: Blob;
  uri?: string;
  /** 演示模式下用于预览的 data URL */
  dataUrl?: string;
}

export interface StudyApi {
  readonly mode: "server" | "local";
  bootstrap(today: string): Promise<BootstrapView>;
  dashboard(today: string): Promise<DashboardView>;
  map(today: string): Promise<MapView>;
  node(id: string, today: string): Promise<NodeView>;
  diagnosis(today: string): Promise<DiagnosisView>;
  entries(): Promise<EntryListItem[]>;
  entry(id: string): Promise<EntryView>;
  createEntry(input: NewEntryInput, files: UploadFile[]): Promise<Entry>;
  reprocessEntry(id: string): Promise<Entry>;
  deleteEntry(id: string): Promise<void>;
  updateAttempt(id: string, patch: AttemptPatch): Promise<EntryView>;
  addManualAttempt(input: ManualAttemptInput): Promise<EntryView>;
  reviewQueue(today: string): Promise<ReviewQueueView>;
  review(cardId: string, rating: Rating, today: string): Promise<ReviewResultView>;
  undoReview(logId: string, today: string): Promise<ReviewQueueView>;
  cards(query: CardQuery, today: string): Promise<CardView[]>;
  createCard(input: CardInput): Promise<Card>;
  updateCard(id: string, patch: CardPatch): Promise<Card>;
  deleteCard(id: string): Promise<void>;
  plan(today: string): Promise<PlanView>;
  regeneratePlan(today: string): Promise<PlanView>;
  setTaskDone(date: string, taskId: string, done: boolean): Promise<PlanView>;
  dailyReport(date: string): Promise<DailyReport>;
  weeklyReport(date: string): Promise<WeeklyReport>;
  settings(): Promise<SettingsView>;
  updateSettings(patch: Partial<Settings>): Promise<SettingsView>;
  exportData(): Promise<Snapshot>;
  importData(snap: Snapshot): Promise<void>;
  /** 附件的访问地址 */
  fileUrl(attachmentId: string, path?: string): string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface HttpApiOptions {
  /** 服务器地址，如 http://192.168.1.10:8787；网页与服务器同源时留空 */
  baseUrl: string;
  token?: string;
  fetch?: typeof fetch;
}

export function createHttpApi(opts: HttpApiOptions): StudyApi {
  const base = opts.baseUrl.replace(/\/+$/, "");
  const doFetch = opts.fetch ?? fetch;
  const headers = (json: boolean): Record<string, string> => ({
    ...(json ? { "content-type": "application/json" } : {}),
    ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
  });

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await doFetch(base + path, {
        method,
        headers: headers(body !== undefined && !(body instanceof FormData)),
        body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(`连不上服务器 ${base || "（当前网址）"}，请检查地址和网络`, 0);
    }
    const text = await res.text();
    const data = text ? safeJson(text) : undefined;
    if (!res.ok) {
      const msg = (data as { error?: string } | undefined)?.error ?? `请求失败（${res.status}）`;
      throw new ApiError(msg, res.status);
    }
    return data as T;
  }

  const qs = (params: Record<string, string | undefined>) => {
    const s = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
      .join("&");
    return s ? `?${s}` : "";
  };

  return {
    mode: "server",
    bootstrap: (today) => call("GET", `/api/bootstrap${qs({ today })}`),
    dashboard: (today) => call("GET", `/api/dashboard${qs({ today })}`),
    map: (today) => call("GET", `/api/map${qs({ today })}`),
    node: (id, today) => call("GET", `/api/nodes/${encodeURIComponent(id)}${qs({ today })}`),
    diagnosis: (today) => call("GET", `/api/diagnosis${qs({ today })}`),
    entries: () => call("GET", "/api/entries"),
    entry: (id) => call("GET", `/api/entries/${encodeURIComponent(id)}`),
    createEntry: (input, files) => {
      const form = new FormData();
      form.append("meta", JSON.stringify(input));
      for (const f of files) {
        if (f.blob) form.append("files", f.blob, f.name);
        // React Native 的 FormData 接受 { uri, name, type }
        else if (f.uri) form.append("files", { uri: f.uri, name: f.name, type: f.type } as unknown as Blob);
      }
      return call("POST", "/api/entries", form);
    },
    reprocessEntry: (id) => call("POST", `/api/entries/${encodeURIComponent(id)}/reprocess`, {}),
    deleteEntry: (id) => call("DELETE", `/api/entries/${encodeURIComponent(id)}`),
    updateAttempt: (id, patch) => call("PATCH", `/api/attempts/${encodeURIComponent(id)}`, patch),
    addManualAttempt: (input) => call("POST", "/api/attempts/manual", input),
    reviewQueue: (today) => call("GET", `/api/review/queue${qs({ today })}`),
    review: (cardId, rating, today) => call("POST", "/api/review", { cardId, rating, today }),
    undoReview: (logId, today) => call("POST", "/api/review/undo", { logId, today }),
    cards: (query, today) => call("GET", `/api/cards${qs({ ...query, today } as Record<string, string | undefined>)}`),
    createCard: (input) => call("POST", "/api/cards", input),
    updateCard: (id, patch) => call("PATCH", `/api/cards/${encodeURIComponent(id)}`, patch),
    deleteCard: (id) => call("DELETE", `/api/cards/${encodeURIComponent(id)}`),
    plan: (today) => call("GET", `/api/plan${qs({ today })}`),
    regeneratePlan: (today) => call("POST", "/api/plan/regenerate", { today }),
    setTaskDone: (date, taskId, done) => call("POST", "/api/plan/task", { date, taskId, done }),
    dailyReport: (date) => call("GET", `/api/reports/daily${qs({ date })}`),
    weeklyReport: (date) => call("GET", `/api/reports/weekly${qs({ date })}`),
    settings: () => call("GET", "/api/settings"),
    updateSettings: (patch) => call("PUT", "/api/settings", patch),
    exportData: () => call("GET", "/api/export"),
    importData: (snap) => call("POST", "/api/import", snap),
    fileUrl: (id) => `${base}/api/files/${encodeURIComponent(id)}${opts.token ? `?token=${encodeURIComponent(opts.token)}` : ""}`,
  };
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 200) };
  }
}

/** 本机模式：不经网络，直接调用服务层。数据存在浏览器或手机里，不能做 AI 分析。 */
export function createLocalApi(service: StudyService): StudyApi {
  const run = <T>(fn: () => T): Promise<T> =>
    new Promise((resolve, reject) => {
      try {
        resolve(fn());
      } catch (e) {
        const err = e as { message?: string; status?: number };
        reject(new ApiError(err.message ?? String(e), err.status ?? 500));
      }
    });

  return {
    mode: "local",
    bootstrap: (today) => run(() => service.bootstrap(today)),
    dashboard: (today) => run(() => service.dashboard(today)),
    map: (today) => run(() => service.map(today)),
    node: (id, today) => run(() => service.node(id, today)),
    diagnosis: (today) => run(() => service.diagnosis(today)),
    entries: () => run(() => service.listEntries()),
    entry: (id) => run(() => service.entry(id)),
    createEntry: (input, files) =>
      run(() =>
        service.createEntry(
          input,
          files.map((f) => ({ name: f.name, mime: f.type || "application/octet-stream", size: f.size ?? 0, path: f.dataUrl ?? f.uri ?? "" })),
        ),
      ),
    reprocessEntry: (id) => run(() => service.entry(id).entry),
    deleteEntry: (id) => run(() => void service.deleteEntry(id)),
    updateAttempt: (id, patch) => run(() => service.updateAttempt(id, patch)),
    addManualAttempt: (input) => run(() => service.addManualAttempt(input)),
    reviewQueue: (today) => run(() => service.reviewQueue(today)),
    review: (cardId, rating, today) => run(() => service.review(cardId, rating, today)),
    undoReview: (logId, today) => run(() => service.undoReview(logId, today)),
    cards: (query, today) => run(() => service.cards(query, today)),
    createCard: (input) => run(() => service.createCard(input)),
    updateCard: (id, patch) => run(() => service.updateCard(id, patch)),
    deleteCard: (id) => run(() => service.deleteCard(id)),
    plan: (today) => run(() => service.plan(today)),
    regeneratePlan: (today) => run(() => service.regeneratePlan(today)),
    setTaskDone: (date, taskId, done) => run(() => service.setTaskDone(date, taskId, done)),
    dailyReport: (date) => run(() => service.dailyReport(date)),
    weeklyReport: (date) => run(() => service.weeklyReport(date)),
    settings: () => run(() => service.settings()),
    updateSettings: (patch) => run(() => service.updateSettings(patch)),
    exportData: () => run(() => service.exportData()),
    importData: (snap) => run(() => service.importData(snap)),
    fileUrl: (id, path) => path ?? "",
  };
}
