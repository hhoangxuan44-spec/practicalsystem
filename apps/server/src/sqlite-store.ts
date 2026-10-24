// SQLite 存储：每个集合一张表，id + JSON 文档。单人使用的数据量（几千条）下足够快。

import { DatabaseSync, type StatementSync } from "node:sqlite";
import { COLLECTIONS, DEFAULT_SETTINGS, type CollectionName, type Collections, type Settings, type Store } from "@ps/core";

export class SqliteStore implements Store {
  private db: DatabaseSync;
  private stmts = new Map<string, StatementSync>();
  private depth = 0;

  constructor(file: string) {
    this.db = new DatabaseSync(file);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
    for (const c of COLLECTIONS) {
      this.db.exec(`CREATE TABLE IF NOT EXISTS ${c} (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT NOT NULL)`);
    }
    this.db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
  }

  private stmt(sql: string): StatementSync {
    let s = this.stmts.get(sql);
    if (!s) {
      s = this.db.prepare(sql);
      this.stmts.set(sql, s);
    }
    return s;
  }

  list<K extends CollectionName>(c: K): Collections[K][] {
    return (this.stmt(`SELECT data FROM ${c}`).all() as { data: string }[]).map((r) => JSON.parse(r.data));
  }

  get<K extends CollectionName>(c: K, id: string): Collections[K] | undefined {
    const row = this.stmt(`SELECT data FROM ${c} WHERE id = ?`).get(id) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : undefined;
  }

  put<K extends CollectionName>(c: K, doc: Collections[K]): void {
    this.stmt(
      `INSERT INTO ${c} (id, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    ).run((doc as { id: string }).id, JSON.stringify(doc), new Date().toISOString());
  }

  remove<K extends CollectionName>(c: K, id: string): void {
    this.stmt(`DELETE FROM ${c} WHERE id = ?`).run(id);
  }

  getSettings(): Settings {
    const row = this.stmt("SELECT value FROM meta WHERE key = 'settings'").get() as { value: string } | undefined;
    return { ...DEFAULT_SETTINGS, ...(row ? JSON.parse(row.value) : {}) };
  }

  putSettings(s: Settings): void {
    this.stmt("INSERT INTO meta (key, value) VALUES ('settings', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
      JSON.stringify(s),
    );
  }

  transaction<T>(fn: () => T): T {
    const sp = `sp${this.depth}`;
    this.db.exec(this.depth === 0 ? "BEGIN" : `SAVEPOINT ${sp}`);
    this.depth++;
    try {
      const out = fn();
      this.depth--;
      this.db.exec(this.depth === 0 ? "COMMIT" : `RELEASE ${sp}`);
      return out;
    } catch (e) {
      this.depth--;
      this.db.exec(this.depth === 0 ? "ROLLBACK" : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
      throw e;
    }
  }

  close() {
    this.db.close();
  }
}
