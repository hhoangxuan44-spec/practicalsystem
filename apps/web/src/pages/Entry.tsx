// 一条学习记录：处理进度、原件、AI 判定结果（可修正）、生成的卡片和笔记。

import { getNode, RESULT_META, type Attempt, type EntryView, type ResultCode } from "@ps/core";
import { useState } from "react";
import { Empty, ErrorBox, PageHead, ResultChip } from "../components/bits.tsx";
import { Icon } from "../components/Icon.tsx";
import { MathText } from "../components/MathText.tsx";
import { NodePicker } from "../components/NodePicker.tsx";
import { Modal } from "../components/overlays.tsx";
import { useAction, useApp, useInterval, useQuery } from "../lib/app.tsx";
import { CARD_KIND_LABEL, dateLabel, fileSize, RESULT_DISPLAY } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";
import { StatusBadge } from "./Today.tsx";

const STEPS = ["上传完成", "AI 阅读材料", "识别题目", "判定对错与错因", "归档、生成卡片", "完成"];

function stepOf(status: string, progress?: string): number {
  if (status === "done") return 5;
  if (status === "queued") return 0;
  if (!progress || progress.includes("阅读")) return 1;
  if (progress.includes("识别")) return progress.includes("评估") ? 3 : 2;
  if (progress.includes("归档")) return 4;
  return 2;
}

export function EntryPage({ id }: { id: string }) {
  const { api, today, boot, invalidate } = useApp();
  const { run, busy } = useAction();
  const { data, error } = useQuery<EntryView>(`entry:${id}`, (a) => a.entry(id));
  const [editing, setEditing] = useState<Attempt | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const processing = data?.entry.status === "queued" || data?.entry.status === "analyzing";
  useInterval(invalidate, processing ? 2000 : null);

  if (!data) return error ? <ErrorBox error={error} /> : <div className="skeleton">正在加载…</div>;
  const { entry, attachments, attempts, cards, notes } = data;
  const redo = cards.filter((c) => c.kind === "redo").length;
  const lowConfidence = attempts.filter((a) => (a.confidence ?? 1) < 0.7).length;

  return (
    <>
      <div>
        <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => navigate({ name: "journal" })}>
          <Icon name="chevronLeft" size={14} />
          学习记录
        </button>
      </div>
      <PageHead
        title={entry.title}
        sub={
          <span className="row" style={{ gap: 10 }}>
            <span>{dateLabel(entry.date, today)}</span>
            {entry.source ? <span>· {entry.source}</span> : null}
            <StatusBadge status={entry.status} progress={entry.progress} />
          </span>
        }
        actions={
          <>
            {boot?.server.aiEnabled && entry.source !== "手动记录" && !processing ? (
              <button className="btn" disabled={busy} onClick={() => run(() => api.reprocessEntry(id), "已重新排队分析")}>
                <Icon name="refresh" size={15} />
                重新分析
              </button>
            ) : null}
            <button className="btn danger" onClick={() => setConfirmDelete(true)}>
              <Icon name="trash" size={15} />
              删除
            </button>
          </>
        }
      />

      {processing ? <Pipeline step={stepOf(entry.status, entry.progress)} progress={entry.progress} /> : null}
      {entry.status === "failed" ? (
        <div className="notice">
          分析失败：{entry.error}
          {boot?.server.aiEnabled ? (
            <button className="btn sm" style={{ marginLeft: 10 }} onClick={() => run(() => api.reprocessEntry(id), "已重新排队分析")}>重试</button>
          ) : null}
        </div>
      ) : null}
      {entry.status === "needs_ai" ? (
        <div className="notice">
          {boot?.server.demo
            ? "演示版不能调用 AI 分析。原件已保存；可以到「上传 → 手动补一条」记录这次做题的结果。"
            : "服务器还没有配置 AI，原件已保存。配置 ANTHROPIC_API_KEY 并重启服务器后，点「重新分析」。"}
        </div>
      ) : null}

      {entry.summary || entry.highlights?.length ? (
        <section className="panel">
          <div className="panel-head"><h2>这次学习的总结</h2></div>
          {entry.summary ? <p style={{ fontSize: 15 }}><MathText text={entry.summary} /></p> : null}
          {entry.highlights?.length ? (
            <ul style={{ margin: "10px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
              {entry.highlights.map((h, i) => (
                <li key={i}><MathText text={h} /></li>
              ))}
            </ul>
          ) : null}
          {entry.stats ? (
            <div className="row" style={{ marginTop: 12, gap: 8 }}>
              <span className="badge">{entry.stats.attempts} 道题</span>
              <span className="badge good">对 {entry.stats.ok}</span>
              <span className="badge">新卡 {entry.stats.cards}</span>
              {redo ? <span className="badge">重做提醒 {redo}</span> : null}
              {entry.stats.notes ? <span className="badge">笔记 {entry.stats.notes}</span> : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {entry.text ? (
        <section className="panel">
          <div className="panel-head"><h2>你的说明</h2></div>
          <p className="ink2" style={{ whiteSpace: "pre-wrap" }}>{entry.text}</p>
        </section>
      ) : null}

      {attachments.length ? (
        <section className="panel">
          <div className="panel-head"><h2>原件</h2><span className="hint">{attachments.length} 个文件</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {attachments.map((a) => {
              const url = api.fileUrl(a.id, a.path);
              const isImage = a.mime.startsWith("image/") && url;
              return (
                <a key={a.id} href={url || undefined} target="_blank" rel="noreferrer" style={{ border: "1px solid var(--rule)", borderRadius: 10, overflow: "hidden", color: "inherit", textDecoration: "none", background: "var(--surface)" }}>
                  {isImage ? (
                    <img src={url} alt={a.name} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ height: 120, display: "grid", placeItems: "center", background: "var(--surface-2)" }}><Icon name="file" size={32} /></div>
                  )}
                  <div style={{ padding: "6px 8px" }}>
                    <div className="small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                    <div className="small muted">{fileSize(a.size)}</div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      ) : null}

      {attempts.length ? (
        <section className="panel">
          <div className="panel-head">
            <h2>逐题判定</h2>
            <span className="hint">
              判错了可以直接改，地图和计划会跟着更新
              {lowConfidence ? ` · ${lowConfidence} 道题 AI 把握不大，建议核对` : ""}
            </span>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>题</th>
                  <th>题型</th>
                  <th>你的答案 / 标准答案</th>
                  <th>判定</th>
                  <th style={{ width: "30%" }}>问题出在哪</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {attempts.map((a) => (
                  <tr key={a.id}>
                    <td className="nowrap">
                      <div className="mono">{a.ref}</div>
                      <div className="small muted">{a.kind}</div>
                    </td>
                    <td>
                      {a.nodeIds.map((n) => (
                        <div key={n} className="small">
                          <a href={`#node.${n}`} onClick={(e) => (e.preventDefault(), navigate({ name: "node", id: n }))}>{getNode(n)?.name ?? n}</a>
                        </div>
                      ))}
                    </td>
                    <td className="small">
                      <div><MathText text={a.mine || "—"} /></div>
                      <div className="muted"><MathText text={a.answer || "—"} /></div>
                    </td>
                    <td>
                      <ResultSelect value={a.result} onChange={(r) => run(() => api.updateAttempt(a.id, { result: r }), `已改为「${RESULT_META[r].label}」`)} />
                      {(a.confidence ?? 1) < 0.7 ? <div className="badge warn" style={{ marginTop: 4 }}>把握不大</div> : null}
                      {a.corrected ? <div className="badge" style={{ marginTop: 4 }}>已修正</div> : null}
                    </td>
                    <td className="small ink2"><MathText text={a.diagnosis} /></td>
                    <td>
                      <button className="icon-btn" title="修改题型" aria-label="修改题型" onClick={() => setEditing(a)}><Icon name="edit" size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : entry.status === "done" ? (
        <section className="panel"><Empty title="这份材料里没有识别到做题记录" icon="file">如果是笔记，整理出的要点在下面。</Empty></section>
      ) : null}

      {cards.length ? (
        <section className="panel">
          <div className="panel-head"><h2>生成的记忆卡</h2><span className="hint">{cards.length} 张</span></div>
          <div className="grid-2">
            {cards.map((c) => (
              <div key={c.id} style={{ border: "1px solid var(--rule)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 6 }}>
                <span className="badge" style={{ justifySelf: "start" }}>{CARD_KIND_LABEL[c.kind]}</span>
                <div><MathText text={c.front} /></div>
                <div className="small ink2" style={{ whiteSpace: "pre-wrap", borderTop: "1px solid var(--rule)", paddingTop: 6 }}><MathText text={c.back} /></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {notes.length ? (
        <section className="panel">
          <div className="panel-head"><h2>整理出的笔记</h2></div>
          <div className="stack">
            {notes.map((n) => (
              <div key={n.id}>
                <b>{n.title}</b>
                <div className="ink2"><MathText text={n.content} /></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {editing ? <NodeEditor attempt={editing} onClose={() => setEditing(null)} /> : null}
      {confirmDelete ? (
        <Modal
          title="删除这条学习记录？"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirmDelete(false)}>取消</button>
              <button
                className="btn primary"
                style={{ background: "var(--bad)", borderColor: "var(--bad)", color: "#fff" }}
                onClick={async () => {
                  const ok = await run(async () => {
                    await api.deleteEntry(id);
                    return true;
                  }, "已删除");
                  setConfirmDelete(false);
                  if (ok) navigate({ name: "journal" });
                }}
              >
                删除
              </button>
            </>
          }
        >
          <p className="ink2">原件、识别出的 {attempts.length} 道题、生成的 {cards.length} 张卡片都会删除，掌握度会重新计算。不能恢复。</p>
        </Modal>
      ) : null}
    </>
  );
}

function Pipeline({ step, progress }: { step: number; progress?: string }) {
  return (
    <section className="panel" aria-live="polite">
      <div className="panel-head">
        <h2>正在分析</h2>
        <span className="hint">{progress ?? "排队中"} · 一般需要 1 到 3 分钟，可以先去做别的</span>
      </div>
      <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8 }}>
        {STEPS.map((s, i) => {
          const state = i < step ? "done" : i === step ? "active" : "todo";
          return (
            <li
              key={s}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${state === "active" ? "var(--accent)" : "var(--rule)"}`,
                background: state === "done" ? "var(--surface-2)" : state === "active" ? "var(--accent-soft)" : "var(--surface)",
                display: "grid",
                gap: 4,
              }}
            >
              <span className="small muted">第 {i + 1} 步</span>
              <span style={{ fontWeight: state === "active" ? 700 : 400, color: state === "todo" ? "var(--muted)" : "var(--ink)" }}>
                {state === "done" ? "✓ " : ""}
                {s}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ResultSelect({ value, onChange }: { value: ResultCode; onChange: (r: ResultCode) => void }) {
  return (
    <label style={{ position: "relative", display: "inline-block" }}>
      <span className="sr-only">修改判定</span>
      <ResultChip result={value} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ResultCode)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
        aria-label="修改判定"
      >
        {RESULT_DISPLAY.map((r) => (
          <option key={r} value={r}>{RESULT_META[r].label}</option>
        ))}
      </select>
    </label>
  );
}

function NodeEditor({ attempt, onClose }: { attempt: Attempt; onClose: () => void }) {
  const { api } = useApp();
  const { run, busy } = useAction();
  const [ids, setIds] = useState(attempt.nodeIds);
  return (
    <Modal
      title={`修改 ${attempt.ref} 的题型`}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>取消</button>
          <button
            className="btn primary"
            disabled={busy || !ids.length}
            onClick={async () => {
              const out = await run(() => api.updateAttempt(attempt.id, { nodeIds: ids }), "已修改题型");
              if (out) onClose();
            }}
          >
            保存
          </button>
        </>
      }
    >
      <p className="small muted">第一个是主题型，最多 3 个。</p>
      <NodePicker value={ids} onChange={setIds} />
    </Modal>
  );
}
