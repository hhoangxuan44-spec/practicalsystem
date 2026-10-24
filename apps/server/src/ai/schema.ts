// AI 输出的结构（结构化输出，模型只能按这个格式返回）。题型 id 用枚举限定，保证都是有效 id。

import { ALL_NODES, type IngestResult } from "@ps/core";
import { z } from "zod";

const NODE_IDS = ALL_NODES.map((n) => n.id) as [string, ...string[]];
const nodeIds = z.array(z.enum(NODE_IDS)).describe("归属题型 id，1 到 3 个，第一个是最主要的");

const AttemptSchema = z.object({
  ref: z.string().describe("题目出处。真题写成「年份-题号」如 2022-14；书上的题写成「书名 例5.3」；看不出出处时写简短描述"),
  kind: z.enum(["选择", "填空", "解答", "例题", "练习"]),
  stem: z.string().describe("题目内容的简短概括，30 字以内，公式用 $...$"),
  node_ids: nodeIds,
  user_answer: z.string().describe("学生写下的最终答案；没写就填「空白」；只写了过程没有结论就概括写到哪一步"),
  correct_answer: z.string().describe("标准答案，公式用 $...$"),
  answer_source: z.enum(["key", "solved"]).describe("key：材料里有答案；solved：你自己解出的答案"),
  result: z.enum(["ok", "calc", "partial", "method", "concept", "blank"]),
  diagnosis: z.string().describe("错在哪一步、正确做法是什么，60 字以内；做对的题写一句关键点"),
  key_steps: z.array(z.string()).describe("标准解法的关键步骤，2 到 4 步，每步 20 字以内"),
  confidence: z.number().describe("对这道题判定的把握，0 到 1。字迹不清、没有答案页时要调低"),
});

const NoteSchema = z.object({
  kind: z.enum(["formula", "method", "concept", "pitfall"]),
  node_ids: nodeIds,
  title: z.string(),
  content: z.string().describe("要点内容，100 字以内，公式用 $...$"),
});

const CardSchema = z.object({
  kind: z.enum(["formula", "method", "pitfall"]).describe("formula 公式结论；method 看到什么特征用什么方法；pitfall 易错点"),
  node_ids: nodeIds,
  front: z.string().describe("一个具体的问题，考查这次暴露的漏洞，40 字以内"),
  back: z.string().describe("答案，100 字以内，公式用 $...$"),
  from_ref: z.string().describe("由哪道题的错误生成，填那道题的 ref；来自笔记时留空"),
});

export const IngestSchema = z.object({
  title: z.string().describe("这次学习内容的标题，15 字以内，如「2023 数二真题」「定积分应用 例题」"),
  source: z.string().describe("资料来源，如「2023 数二真题」「张宇强化 第 5 讲」；看不出来就留空"),
  summary: z.string().describe("本次学习的总结，2 到 4 句：学了什么、表现如何、主要问题"),
  highlights: z.array(z.string()).describe("本次最该记住的要点，最多 5 条，每条 30 字以内"),
  attempts: z.array(AttemptSchema),
  notes: z.array(NoteSchema),
  cards: z.array(CardSchema),
});

export type IngestOutput = z.infer<typeof IngestSchema>;

export function toIngestResult(o: IngestOutput): IngestResult {
  return {
    title: o.title.trim() || undefined,
    source: o.source.trim() || undefined,
    summary: o.summary.trim(),
    highlights: o.highlights.map((h) => h.trim()).filter(Boolean).slice(0, 5),
    attempts: o.attempts.map((a) => ({
      ref: a.ref,
      kind: a.kind,
      stem: a.stem,
      nodeIds: a.node_ids,
      mine: a.user_answer,
      answer: a.correct_answer,
      answerSource: a.answer_source,
      result: a.result,
      diagnosis: a.diagnosis,
      keySteps: a.key_steps,
      confidence: Math.min(1, Math.max(0, a.confidence)),
    })),
    notes: o.notes.map((n) => ({ kind: n.kind, nodeIds: n.node_ids, title: n.title, content: n.content })),
    cards: o.cards.map((c) => ({ kind: c.kind, nodeIds: c.node_ids, front: c.front, back: c.back, fromRef: c.from_ref || undefined })),
  };
}
