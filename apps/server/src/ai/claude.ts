// 用 Claude 识别、评估上传的学习内容。一次请求完成：识别题目 → 判定对错和错因 → 归类题型 → 整理笔记 → 出记忆卡 → 写总结。

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Attachment, Entry, IngestResult } from "@ps/core";
import { config } from "../config.ts";
import { normalizeMime, readUpload } from "../files.ts";
import { SYSTEM_PROMPT, userInstruction } from "./prompt.ts";
import { IngestSchema, toIngestResult } from "./schema.ts";

export interface Analyzer {
  analyze(entry: Entry, attachments: Attachment[], onProgress: (message: string) => void): Promise<IngestResult>;
}

type ImageMime = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

/** API 单次请求上限 32MB，base64 会膨胀约三分之一，留出余量 */
const MAX_RAW_BYTES = 22 * 1024 * 1024;

export class ClaudeAnalyzer implements Analyzer {
  private client = new Anthropic();

  async analyze(entry: Entry, attachments: Attachment[], onProgress: (message: string) => void): Promise<IngestResult> {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    let bytes = 0;
    for (const a of attachments) {
      const mime = normalizeMime(a.mime, a.name);
      const data = await readUpload(a.path);
      bytes += data.length;
      if (mime === "application/pdf") {
        content.push({ type: "document", title: a.name, source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") } });
      } else if (mime.startsWith("image/")) {
        content.push({ type: "image", source: { type: "base64", media_type: mime as ImageMime, data: data.toString("base64") } });
      } else if (mime.startsWith("text/")) {
        content.push({ type: "text", text: `文件「${a.name}」的内容：\n${data.toString("utf8")}` });
      }
    }
    if (bytes > MAX_RAW_BYTES) throw new Error("这次上传的文件总共超过 22MB，请分成几次上传");
    content.push({
      type: "text",
      text: userInstruction({
        date: entry.date,
        title: entry.titleAuto ? undefined : entry.title,
        source: entry.source,
        text: entry.text,
        fileNames: attachments.map((a) => a.name),
      }),
    });

    onProgress("AI 正在阅读材料");
    const stream = this.client.beta.messages.stream({
      model: config.model,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive" },
      output_config: { effort: config.effort, format: betaZodOutputFormat(IngestSchema) },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
    });

    let lastReport = 0;
    let lastCount = -1;
    stream.on("text", (_delta, snapshot) => {
      const now = Date.now();
      if (now - lastReport < 800) return;
      lastReport = now;
      const n = (snapshot.match(/"ref"\s*:/g) ?? []).length;
      if (n !== lastCount) {
        lastCount = n;
        onProgress(n ? `已识别 ${n} 道题，正在评估` : "正在整理识别结果");
      }
    });

    const message = await stream.finalMessage();
    if (message.stop_reason === "refusal") throw new Error("AI 拒绝处理这份内容，请检查上传的文件是否是学习材料");
    if (message.stop_reason === "max_tokens") throw new Error("内容太多，AI 的输出被截断了，请把材料分成几次上传");
    if (!message.parsed_output) throw new Error("AI 返回的结果无法解析，请点「重新分析」");
    onProgress("正在归档");
    return toIngestResult(message.parsed_output);
  }
}

/** 把 SDK 的错误翻译成用户能看懂、知道怎么处理的话 */
export function describeAiError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "Anthropic API 密钥无效，请检查服务器上的 ANTHROPIC_API_KEY";
  if (e instanceof Anthropic.PermissionDeniedError) return "当前 API 账号没有权限使用这个模型，请检查 AI_MODEL 设置";
  if (e instanceof Anthropic.RateLimitError) return "请求太频繁，过一会儿点「重新分析」";
  if (e instanceof Anthropic.BadRequestError) return `请求被拒绝：${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return "连不上 Anthropic 服务，请检查服务器的网络";
  if (e instanceof Anthropic.APIError) return `AI 服务出错（${e.status ?? "未知状态"}），稍后点「重新分析」`;
  return e instanceof Error ? e.message : String(e);
}
