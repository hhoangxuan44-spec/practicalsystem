// 卡片库：搜索、筛选、编辑、暂停、删除记忆卡，也可以自己新建。

import { getNode, type Card, type CardInput, type CardKind, type CardQuery, type CardView } from "@ps/core";
import { useState } from "react";
import { Empty, ErrorBox, Meter, PageHead } from "../components/bits.tsx";
import { Icon } from "../components/Icon.tsx";
import { MathText } from "../components/MathText.tsx";
import { NodePicker } from "../components/NodePicker.tsx";
import { Modal } from "../components/overlays.tsx";
import { useAction, useApp, useQuery } from "../lib/app.tsx";
import { CARD_KIND_LABEL, pct } from "../lib/format.ts";

const KINDS: (CardKind | "all")[] = ["all", "formula", "method", "pitfall", "redo"];

export function CardsPage() {
  const { api } = useApp();
  const { run } = useAction();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<CardKind | "all">("all");
  const [filter, setFilter] = useState<NonNullable<CardQuery["filter"]>>("all");
  const [editing, setEditing] = useState<Card | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CardView | null>(null);
  const query: CardQuery = { q: q || undefined, kind: kind === "all" ? undefined : kind, filter };
  const { data, error } = useQuery<CardView[]>(`cards:${JSON.stringify(query)}`, (a, t) => a.cards(query, t));

  return (
    <>
      <PageHead
        title="卡片库"
        sub="做错的题会自动生成卡片：公式结论、方法识别、易错点，以及需要在本子上重做的错题。"
        actions={
          <button className="btn primary" onClick={() => setEditing("new")}>
            <Icon name="plus" size={16} />
            新建卡片
          </button>
        }
      />
      <div className="panel row" style={{ padding: "12px 14px", gap: 10 }}>
        <div className="seg" role="group" aria-label="卡片类型">
          {KINDS.map((k) => (
            <button key={k} aria-pressed={kind === k} onClick={() => setKind(k)}>{k === "all" ? "全部" : CARD_KIND_LABEL[k]}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="状态">
          {(["all", "due", "suspended"] as const).map((f) => (
            <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === "all" ? "全部" : f === "due" ? "已到期" : "已暂停"}</button>
          ))}
        </div>
        <div className="row" style={{ marginLeft: "auto", gap: 6, flexWrap: "nowrap" }}>
          <Icon name="search" size={16} />
          <input className="input" style={{ width: 200, padding: "5px 8px" }} placeholder="搜索卡片内容" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜索卡片" />
        </div>
      </div>
      <ErrorBox error={error} />
      {data ? (
        data.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th style={{ width: "46%" }}>问题</th>
                  <th>类型 · 题型</th>
                  <th>记住程度</th>
                  <th>下次</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id} style={c.suspended ? { opacity: 0.55 } : undefined}>
                    <td>
                      <details>
                        <summary style={{ cursor: "pointer" }}><MathText text={c.front} /></summary>
                        <div className="small ink2" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}><MathText text={c.back} /></div>
                      </details>
                    </td>
                    <td>
                      <div className="badge" style={{ marginBottom: 4 }}>{CARD_KIND_LABEL[c.kind]}</div>
                      <div className="small muted">{c.nodeIds.map((id) => getNode(id)?.name).join("、")}</div>
                    </td>
                    <td style={{ minWidth: 110 }}>
                      {c.retention === null ? (
                        <span className="small muted">还没复习</span>
                      ) : (
                        <div style={{ display: "grid", gap: 4 }}>
                          <span className="small num">{pct(c.retention)}%</span>
                          <Meter value={c.retention} label="记住程度" />
                        </div>
                      )}
                    </td>
                    <td className="small nowrap">{c.dueLabel}</td>
                    <td className="nowrap">
                      <button className="icon-btn" title="编辑" aria-label="编辑" onClick={() => setEditing(c)}><Icon name="edit" size={16} /></button>
                      <button
                        className="icon-btn"
                        title={c.suspended ? "恢复" : "暂停"}
                        aria-label={c.suspended ? "恢复" : "暂停"}
                        onClick={() => run(() => api.updateCard(c.id, { suspended: !c.suspended }), c.suspended ? "已恢复" : "已暂停，不再出现在复习里")}
                      >
                        <Icon name={c.suspended ? "play" : "pause"} size={16} />
                      </button>
                      <button className="icon-btn" title="删除" aria-label="删除" onClick={() => setConfirmDelete(c)}><Icon name="trash" size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel"><Empty title="没有符合条件的卡片" icon="cards" /></div>
        )
      ) : (
        <div className="skeleton">正在加载…</div>
      )}

      {editing ? <CardEditor card={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {confirmDelete ? (
        <Modal
          title="删除这张卡片？"
          onClose={() => setConfirmDelete(null)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirmDelete(null)}>取消</button>
              <button
                className="btn primary"
                style={{ background: "var(--bad)", borderColor: "var(--bad)", color: "#fff" }}
                onClick={async () => {
                  await run(() => api.deleteCard(confirmDelete.id), "已删除");
                  setConfirmDelete(null);
                }}
              >
                删除
              </button>
            </>
          }
        >
          <p className="ink2">卡片和它的复习记录都会删除，不能恢复。只是暂时不想复习的话，可以用「暂停」。</p>
          <div className="callout"><Icon name="cards" size={16} /><MathText text={confirmDelete.front} /></div>
        </Modal>
      ) : null}
    </>
  );
}

function CardEditor({ card, onClose }: { card: Card | null; onClose: () => void }) {
  const { api } = useApp();
  const { run, busy } = useAction();
  const [f, setF] = useState<CardInput>(card ? { kind: card.kind, front: card.front, back: card.back, nodeIds: card.nodeIds } : { kind: "formula", front: "", back: "", nodeIds: [] });
  const save = async () => {
    const out = card ? await run(() => api.updateCard(card.id, f), "已保存") : await run(() => api.createCard(f), "已添加，会出现在今天的复习里");
    if (out) onClose();
  };
  return (
    <Modal
      title={card ? "编辑卡片" : "新建卡片"}
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn primary" disabled={busy || !f.front.trim() || !f.back.trim()} onClick={save}>保存</button>
        </>
      }
    >
      <div className="seg" role="group" aria-label="卡片类型">
        {(["formula", "method", "pitfall", "redo"] as CardKind[]).map((k) => (
          <button key={k} aria-pressed={f.kind === k} onClick={() => setF({ ...f, kind: k })}>{CARD_KIND_LABEL[k]}</button>
        ))}
      </div>
      <label className="field">
        <span>正面：一个具体的问题（公式写在 $...$ 里）</span>
        <textarea className="textarea" value={f.front} onChange={(e) => setF({ ...f, front: e.target.value })} />
      </label>
      {f.front.includes("$") ? <div className="callout"><Icon name="eye" size={16} /><MathText text={f.front} /></div> : null}
      <label className="field">
        <span>背面：答案</span>
        <textarea className="textarea" value={f.back} onChange={(e) => setF({ ...f, back: e.target.value })} />
      </label>
      {f.back.includes("$") ? <div className="callout"><Icon name="eye" size={16} /><MathText text={f.back} /></div> : null}
      <div className="field">
        <span>题型</span>
        <NodePicker value={f.nodeIds} onChange={(ids) => setF({ ...f, nodeIds: ids })} />
      </div>
    </Modal>
  );
}
