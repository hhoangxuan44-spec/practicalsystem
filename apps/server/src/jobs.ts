// 处理队列：上传后在后台逐条分析，客户端轮询学习记录的状态。

import type { StudyService } from "@ps/core";
import { describeAiError, type Analyzer } from "./ai/claude.ts";

export class IngestQueue {
  private queue: string[] = [];
  private running = false;

  constructor(
    private readonly service: StudyService,
    private readonly analyzer: Analyzer | null,
  ) {}

  enqueue(entryId: string) {
    if (!this.queue.includes(entryId)) this.queue.push(entryId);
    void this.pump();
  }

  /** 服务器重启后，把没处理完的记录重新排队 */
  resumePending() {
    for (const e of this.service.listEntries()) {
      if (e.status === "queued" || e.status === "analyzing") this.enqueue(e.id);
    }
  }

  private async pump() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) await this.process(this.queue.shift()!);
    } finally {
      this.running = false;
    }
  }

  private async process(id: string) {
    let view;
    try {
      view = this.service.entry(id);
    } catch {
      return; // 已被删除
    }
    if (!this.analyzer) {
      this.service.setEntryStatus(id, "needs_ai");
      return;
    }
    const status = (s: "analyzing" | "failed", progress?: string, error?: string) => {
      try {
        this.service.setEntryStatus(id, s, progress, error);
      } catch {
        // 处理过程中记录被删除
      }
    };
    try {
      status("analyzing", "AI 正在阅读材料");
      const result = await this.analyzer.analyze(view.entry, view.attachments, (msg) => status("analyzing", msg));
      this.service.applyIngest(id, result);
      console.log(`[ingest] ${id} 完成：${result.attempts.length} 道题，${result.cards.length} 张卡`);
    } catch (e) {
      const msg = describeAiError(e);
      console.error(`[ingest] ${id} 失败：${msg}`);
      status("failed", undefined, msg);
    }
  }
}
