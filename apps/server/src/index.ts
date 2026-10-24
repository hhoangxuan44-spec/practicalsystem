import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { CORE_VERSION, seedInitialData, StudyService } from "@ps/core";
import { existsSync, mkdirSync } from "node:fs";
import { networkInterfaces } from "node:os";
import path from "node:path";
import { ClaudeAnalyzer } from "./ai/claude.ts";
import { createApp } from "./app.ts";
import { config } from "./config.ts";
import { IngestQueue } from "./jobs.ts";
import { SqliteStore } from "./sqlite-store.ts";

mkdirSync(config.dataDir, { recursive: true });
const store = new SqliteStore(path.join(config.dataDir, "study.db"));
const service = new StudyService(store, {
  server: { aiEnabled: config.aiEnabled, model: config.aiEnabled ? config.model : undefined, version: CORE_VERSION },
});

if (config.seed && store.list("entries").length === 0) {
  seedInitialData(service, service.today());
  console.log("已写入初始数据：2021、2022 数二真题");
}

const queue = new IngestQueue(service, config.aiEnabled ? new ClaudeAnalyzer() : null);
queue.resumePending();

const app = createApp(service, queue);

// 网页版构建产物存在时，由同一个端口提供（单页应用，未知路径回到 index.html）
if (existsSync(path.join(config.webDist, "index.html"))) {
  const root = path.relative(process.cwd(), config.webDist) || ".";
  app.use("/*", serveStatic({ root }));
  app.get("*", serveStatic({ path: path.join(root, "index.html") }));
}

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  const lan = Object.values(networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .map((i) => `http://${i!.address}:${info.port}`);
  console.log(`数二备考系统已启动：http://localhost:${info.port}`);
  if (lan.length) console.log(`手机 App 填这个地址（同一 Wi-Fi）：${lan.join("  ")}`);
  console.log(config.aiEnabled ? `AI 分析：已开启（${config.model}）` : "AI 分析：未开启（设置 ANTHROPIC_API_KEY 后重启即可）");
  if (config.accessToken) console.log("访问口令：已启用");
});
