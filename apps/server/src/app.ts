// REST API。路由只做参数解析，业务逻辑都在 @ps/core 的服务层。

import { AppError, invalid, newId, notFound, type Rating, type Snapshot, type StudyService } from "@ps/core";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { config } from "./config.ts";
import { isSupported, normalizeMime, readUpload, removeUploads, saveUpload } from "./files.ts";
import type { IngestQueue } from "./jobs.ts";

export function createApp(service: StudyService, queue: IngestQueue): Hono {
  const app = new Hono();
  const today = (c: Context) => c.req.query("today") || undefined;

  app.use("/api/*", cors({ origin: "*", allowHeaders: ["authorization", "content-type"], allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] }));

  app.get("/api/health", (c) => c.json({ ok: true, ...service.server }));

  // 设置了 ACCESS_TOKEN 时校验口令（图片、PDF 预览走 ?token=）
  app.use("/api/*", async (c, next) => {
    if (!config.accessToken || c.req.method === "OPTIONS") return next();
    const header = c.req.header("authorization")?.replace(/^Bearer\s+/i, "");
    const token = header || c.req.query("token");
    if (token !== config.accessToken) return c.json({ error: "需要访问口令，请在设置里填写" }, 401);
    return next();
  });

  app.onError((err, c) => {
    if (err instanceof AppError) return c.json({ error: err.message }, err.status as 400);
    if (err instanceof SyntaxError) return c.json({ error: "请求格式不正确" }, 400);
    console.error(err);
    return c.json({ error: "服务器内部错误" }, 500);
  });

  const body = async <T>(c: Context): Promise<T> => {
    try {
      return (await c.req.json()) as T;
    } catch {
      throw invalid("请求内容不是有效的 JSON");
    }
  };

  // ---------- 概览 ----------
  app.get("/api/bootstrap", (c) => c.json(service.bootstrap(today(c))));
  app.get("/api/dashboard", (c) => c.json(service.dashboard(today(c))));
  app.get("/api/map", (c) => c.json(service.map(today(c))));
  app.get("/api/nodes/:id", (c) => c.json(service.node(c.req.param("id"), today(c))));
  app.get("/api/diagnosis", (c) => c.json(service.diagnosis(today(c))));
  app.get("/api/reports/daily", (c) => c.json(service.dailyReport(c.req.query("date"))));
  app.get("/api/reports/weekly", (c) => c.json(service.weeklyReport(c.req.query("date"))));

  // ---------- 学习记录 ----------
  app.get("/api/entries", (c) => c.json(service.listEntries()));
  app.get("/api/entries/:id", (c) => c.json(service.entry(c.req.param("id"))));

  app.post(
    "/api/entries",
    bodyLimit({ maxSize: config.maxRequestBytes, onError: (c) => c.json({ error: "上传内容太大，请分几次上传" }, 413) }),
    async (c) => {
      const form = await c.req.parseBody({ all: true });
      let meta: { date?: string; title?: string; source?: string; text?: string } = {};
      try {
        meta = JSON.parse(String(form.meta ?? "{}"));
      } catch {
        throw invalid("meta 字段不是有效的 JSON");
      }
      const raw = form.files;
      const files = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter((f): f is File => f instanceof File);
      for (const f of files) {
        if (!isSupported(f.type, f.name)) throw invalid(`不支持「${f.name}」的格式。可以上传 PDF、JPG、PNG、WEBP 图片或 TXT 文本；iPhone 照片请先转成 JPG`);
        if (f.size > config.maxFileBytes) throw invalid(`「${f.name}」超过 25MB`);
      }
      const folder = newId("up");
      const saved = [];
      for (const f of files) {
        saved.push({ name: f.name, mime: normalizeMime(f.type, f.name), size: f.size, path: await saveUpload(folder, f.name, Buffer.from(await f.arrayBuffer())) });
      }
      const entry = service.createEntry({ date: meta.date ?? service.today(), title: meta.title, source: meta.source, text: meta.text }, saved);
      if (entry.status === "queued") queue.enqueue(entry.id);
      return c.json(entry, 201);
    },
  );

  app.post("/api/entries/:id/reprocess", (c) => {
    const id = c.req.param("id");
    const view = service.entry(id);
    if (!service.server.aiEnabled) throw invalid("服务器没有配置 AI，无法分析");
    if (view.entry.source === "手动记录") throw invalid("手动记录不需要分析");
    const entry = service.setEntryStatus(id, "queued", "排队中");
    queue.enqueue(id);
    return c.json(entry);
  });

  app.delete("/api/entries/:id", async (c) => {
    const paths = service.deleteEntry(c.req.param("id"));
    await removeUploads(paths);
    return c.body(null, 204);
  });

  app.get("/api/files/:id", async (c) => {
    const att = service.store.get("attachments", c.req.param("id"));
    if (!att) throw notFound("文件");
    const data = await readUpload(att.path).catch(() => {
      throw notFound("文件");
    });
    return new Response(new Uint8Array(data), {
      headers: {
        "content-type": att.mime,
        "cache-control": "private, max-age=86400",
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(att.name)}`,
      },
    });
  });

  // ---------- 做题记录 ----------
  app.patch("/api/attempts/:id", async (c) => c.json(service.updateAttempt(c.req.param("id"), await body(c))));
  app.post("/api/attempts/manual", async (c) => c.json(service.addManualAttempt(await body(c)), 201));

  // ---------- 记忆复习 ----------
  app.get("/api/review/queue", (c) => c.json(service.reviewQueue(today(c))));
  app.post("/api/review", async (c) => {
    const b = await body<{ cardId: string; rating: Rating; today?: string }>(c);
    return c.json(service.review(b.cardId, Number(b.rating) as Rating, b.today));
  });
  app.post("/api/review/undo", async (c) => {
    const b = await body<{ logId: string; today?: string }>(c);
    return c.json(service.undoReview(b.logId, b.today));
  });
  app.get("/api/cards", (c) => {
    const q = c.req.query();
    return c.json(
      service.cards(
        { nodeId: q.nodeId, kind: q.kind as never, q: q.q, filter: q.filter as never },
        q.today,
      ),
    );
  });
  app.post("/api/cards", async (c) => c.json(service.createCard(await body(c)), 201));
  app.patch("/api/cards/:id", async (c) => c.json(service.updateCard(c.req.param("id"), await body(c))));
  app.delete("/api/cards/:id", (c) => {
    service.deleteCard(c.req.param("id"));
    return c.body(null, 204);
  });

  // ---------- 训练计划 ----------
  app.get("/api/plan", (c) => c.json(service.plan(today(c))));
  app.post("/api/plan/regenerate", async (c) => c.json(service.regeneratePlan((await body<{ today?: string }>(c)).today)));
  app.post("/api/plan/task", async (c) => {
    const b = await body<{ date: string; taskId: string; done: boolean }>(c);
    return c.json(service.setTaskDone(b.date, b.taskId, Boolean(b.done)));
  });

  // ---------- 设置与数据 ----------
  app.get("/api/settings", (c) => c.json(service.settings()));
  app.put("/api/settings", async (c) => c.json(service.updateSettings(await body(c))));
  app.get("/api/export", (c) => {
    c.header("content-disposition", `attachment; filename="study-backup-${service.today()}.json"`);
    return c.json(service.exportData());
  });
  app.post("/api/import", bodyLimit({ maxSize: config.maxRequestBytes }), async (c) => {
    service.importData(await body<Snapshot>(c));
    return c.json({ ok: true });
  });

  app.all("/api/*", () => {
    throw new AppError("接口不存在", 404);
  });

  return app;
}
