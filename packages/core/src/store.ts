// 存储抽象。服务器用 SQLite 实现，网页演示版和 App 离线模式用内存实现。

import type { Attachment, Attempt, Card, DayPlan, Entry, Note, ReviewLog, Settings } from "./types.ts";
import { DEFAULT_SETTINGS } from "./types.ts";

export interface Collections {
  entries: Entry;
  attachments: Attachment;
  attempts: Attempt;
  notes: Note;
  cards: Card;
  reviews: ReviewLog;
  plans: DayPlan;
}

export type CollectionName = keyof Collections;

export const COLLECTIONS: CollectionName[] = ["entries", "attachments", "attempts", "notes", "cards", "reviews", "plans"];

export interface Store {
  list<K extends CollectionName>(c: K): Collections[K][];
  get<K extends CollectionName>(c: K, id: string): Collections[K] | undefined;
  put<K extends CollectionName>(c: K, doc: Collections[K]): void;
  remove<K extends CollectionName>(c: K, id: string): void;
  getSettings(): Settings;
  putSettings(s: Settings): void;
  /** 一组写操作要么全部生效，要么都不生效 */
  transaction<T>(fn: () => T): T;
}

/** 整个数据库的快照，用于导出 / 导入和演示版持久化 */
export type Snapshot = { version: 1; settings: Settings } & { [K in CollectionName]: Collections[K][] };

export function snapshotOf(store: Store): Snapshot {
  const snap = { version: 1, settings: store.getSettings() } as Snapshot;
  for (const c of COLLECTIONS) (snap as Record<string, unknown>)[c] = store.list(c);
  return snap;
}

export function loadSnapshot(store: Store, snap: Snapshot): void {
  store.transaction(() => {
    for (const c of COLLECTIONS) {
      for (const doc of store.list(c)) store.remove(c, (doc as { id: string }).id);
      for (const doc of snap[c] ?? []) store.put(c, doc as never);
    }
    store.putSettings({ ...DEFAULT_SETTINGS, ...snap.settings });
  });
}

export class MemoryStore implements Store {
  private data = new Map<CollectionName, Map<string, unknown>>();
  private settings: Settings = { ...DEFAULT_SETTINGS };
  /** 每次写入后调用，用于持久化 */
  onChange?: () => void;
  private depth = 0;

  constructor() {
    for (const c of COLLECTIONS) this.data.set(c, new Map());
  }

  list<K extends CollectionName>(c: K): Collections[K][] {
    return [...this.data.get(c)!.values()].map(clone) as Collections[K][];
  }

  get<K extends CollectionName>(c: K, id: string): Collections[K] | undefined {
    const v = this.data.get(c)!.get(id);
    return v === undefined ? undefined : (clone(v) as Collections[K]);
  }

  put<K extends CollectionName>(c: K, doc: Collections[K]): void {
    this.data.get(c)!.set((doc as { id: string }).id, clone(doc));
    this.changed();
  }

  remove<K extends CollectionName>(c: K, id: string): void {
    this.data.get(c)!.delete(id);
    this.changed();
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  putSettings(s: Settings): void {
    this.settings = { ...s };
    this.changed();
  }

  transaction<T>(fn: () => T): T {
    const backup = new Map([...this.data].map(([k, m]) => [k, new Map(m)]));
    const settings = this.settings;
    this.depth++;
    try {
      return fn();
    } catch (e) {
      this.data = backup;
      this.settings = settings;
      throw e;
    } finally {
      this.depth--;
      this.changed();
    }
  }

  private changed() {
    if (this.depth === 0) this.onChange?.();
  }
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}
