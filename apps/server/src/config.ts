import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const env = process.env;

/** 有任意一种 Anthropic 凭据就启用 AI；AI_ENABLED=0 可强制关闭，=1 强制开启（例如用 ant auth login 的登录信息） */
function detectAi(): boolean {
  if (env.AI_ENABLED === "0") return false;
  if (env.AI_ENABLED === "1") return true;
  return Boolean(env.ANTHROPIC_API_KEY || env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_PROFILE);
}

export const config = {
  port: Number(env.PORT ?? 8787),
  /** 默认监听所有网卡，手机在同一 Wi-Fi 下可以直接访问 */
  host: env.HOST ?? "0.0.0.0",
  dataDir: path.resolve(env.DATA_DIR ?? path.join(here, "..", "data")),
  /** 设置后所有接口都需要带上这个口令 */
  accessToken: env.ACCESS_TOKEN || undefined,
  aiEnabled: detectAi(),
  model: env.AI_MODEL ?? "claude-opus-5-5",
  effort: (env.AI_EFFORT ?? "high") as "low" | "medium" | "high" | "xhigh" | "max",
  /** 首次启动时写入 2021、2022 真题的初始数据 */
  seed: env.SEED !== "0",
  /** 网页版构建产物，存在时由服务器一起提供 */
  webDist: path.resolve(env.WEB_DIST ?? path.join(here, "..", "..", "web", "dist")),
  maxFileBytes: 25 * 1024 * 1024,
  maxRequestBytes: 60 * 1024 * 1024,
};
