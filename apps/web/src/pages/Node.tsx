// 题型档案：这个题型的全部证据、掌握度曲线、方法要点、笔记、记忆卡、上下游关系。

import { getChapter, getNode, RESULT_META, type NodeView } from "@ps/core";
import type { ReactNode } from "react";
import { MasteryLine } from "../charts/MasteryLine.tsx";
import { Empty, ErrorBox, LevelBadge, Meter, NodeLink, ResultChip, Stars } from "../components/bits.tsx";
import { Icon } from "../components/Icon.tsx";
import { MathText } from "../components/MathText.tsx";
import { RootChain } from "../components/NodeDrawer.tsx";
import { useApp, useQuery } from "../lib/app.tsx";
import { CARD_KIND_LABEL, CONFIDENCE_LABEL, dateLabel, LEVEL_COLOR, pct, signed } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";

export function NodePage({ id }: { id: string }) {
  const { today } = useApp();
  const node = getNode(id);
  const { data, error } = useQuery<NodeView>(`node:${id}`, (api, t) => api.node(id, t));
  if (!node) return <ErrorBox error={new Error("没有这个题型")} />;
  if (!data) return error ? <ErrorBox error={error} /> : <div className="skeleton">正在加载…</div>;
  const s = data.state;
  const chapter = getChapter(node.chapterId)!;

  return (
    <>
      <header className="page-head">
        <div>
          <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => navigate({ name: "map" })}>
            <Icon name="chevronLeft" size={14} />
            能力地图 · {chapter.part} · {chapter.name}
          </button>
          <h1 style={{ marginTop: 4 }}>{node.name}</h1>
          <div className="row" style={{ gap: 14, marginTop: 6 }}>
            <LevelBadge level={s.level} mastery={s.mastery} />
            <Stars freq={node.freq} />
            <span className="small muted">{node.freq === 3 ? "几乎每年都考" : node.freq === 2 ? "常考" : "偶尔考"}</span>
          </div>
        </div>
        <button className="btn primary" onClick={() => navigate({ name: "upload" })}>
          <Icon name="upload" size={16} />
          上传这个题型的练习
        </button>
      </header>

      <section className="grid-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <Fact label="掌握度" value={pct(s.mastery)} foot={<Meter value={s.mastery} color={LEVEL_COLOR[s.level]} label="掌握度" />} />
        <Fact label="证据" value={`${s.count} 次`} foot={`${CONFIDENCE_LABEL[s.confidence]}${s.lastSeen ? ` · 最近 ${dateLabel(s.lastSeen, today)}` : ""}`} />
        <Fact label="记忆保持" value={s.retention === null ? "—" : `${pct(s.retention)}%`} foot={`${s.cardCount} 张卡，${s.dueCards} 张到期`} />
        <Fact label="7 天变化" value={signed(s.trend7)} foot={s.mainError ? `主要问题：${RESULT_META[s.mainError].label}` : "还没有出错记录"} />
      </section>

      <section className="split">
        <div className="stack" style={{ gap: 18 }}>
          <div className="panel">
            <div className="callout accent" style={{ marginBottom: data.rootChains.length ? 12 : 0 }}>
              <Icon name="target" size={16} />
              <span>{data.advice}</span>
            </div>
            {data.rootChains.length ? (
              <div className="stack" style={{ gap: 6 }}>
                <b className="small">可能的根因：这些前置题型也没掌握</b>
                {data.rootChains.map((c) => (
                  <RootChain key={c.join(">")} chain={c} />
                ))}
              </div>
            ) : null}
          </div>
          <div className="panel">
            <MasteryLine points={data.history} />
          </div>
          <div className="panel">
            <div className="panel-head">
              <h2>做题记录</h2>
              <span className="hint">{data.attempts.length} 次</span>
            </div>
            {data.attempts.length ? (
              <div className="stack" style={{ gap: 0 }}>
                {data.attempts.map((a) => (
                  <div key={a.id} style={{ display: "grid", gap: 4, padding: "10px 0", borderTop: "1px solid var(--rule)" }}>
                    <div className="row between">
                      <span className="row" style={{ gap: 8 }}>
                        <span className="mono">{a.ref}</span>
                        <span className="small muted">{a.kind} · {dateLabel(a.date, today)}</span>
                        {a.corrected ? <span className="badge">已人工修正</span> : null}
                      </span>
                      <ResultChip result={a.result} />
                    </div>
                    {a.stem ? <div className="small ink2"><MathText text={a.stem} /></div> : null}
                    <div className="small">
                      <span className="muted">你的：</span>
                      <MathText text={a.mine || "—"} />
                      <span className="muted" style={{ marginLeft: 12 }}>标准：</span>
                      <MathText text={a.answer || "—"} />
                    </div>
                    <div className="small ink2"><MathText text={a.diagnosis} /></div>
                    <div>
                      <button className="btn ghost sm" style={{ paddingLeft: 0 }} onClick={() => navigate({ name: "entry", id: a.entryId })}>
                        查看原记录
                        <Icon name="chevronRight" size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty title="还没有做题记录" icon="file">找 2 道这个题型的题（真题优先）做完上传，系统会给出评估。</Empty>
            )}
          </div>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="panel">
            <div className="panel-head"><h2>方法要点</h2></div>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
              {data.keyIdeas.map((k) => (
                <li key={k}><MathText text={k} /></li>
              ))}
            </ul>
            {data.notes.length ? (
              <>
                <hr className="divider" style={{ margin: "14px 0" }} />
                <b className="small">你的笔记</b>
                <div className="stack" style={{ gap: 8, marginTop: 6 }}>
                  {data.notes.map((n) => (
                    <div key={n.id}>
                      <div style={{ fontWeight: 600 }}>{n.title}</div>
                      <div className="small ink2"><MathText text={n.content} /></div>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="panel">
            <div className="panel-head"><h2>上下游</h2></div>
            <div className="stack" style={{ gap: 10 }}>
              <div>
                <div className="small muted" style={{ marginBottom: 6 }}>前置题型（地基）</div>
                {data.prereqs.length ? (
                  <div className="stack" style={{ gap: 4 }}>
                    {data.prereqs.map((p) => (
                      <div key={p.id} className="row between">
                        <NodeLink id={p.id} />
                        <LevelBadge level={p.level} mastery={p.mastery} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="small muted">这是地基题型，没有前置。</span>
                )}
              </div>
              <div>
                <div className="small muted" style={{ marginBottom: 6 }}>依赖它的题型</div>
                {data.dependents.length ? (
                  <div className="stack" style={{ gap: 4 }}>
                    {data.dependents.map((p) => (
                      <div key={p.id} className="row between">
                        <NodeLink id={p.id} />
                        <LevelBadge level={p.level} mastery={p.mastery} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="small muted">没有题型依赖它。</span>
                )}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>记忆卡</h2>
              <span className="hint">{data.cards.length} 张</span>
            </div>
            {data.cards.length ? (
              <div className="stack" style={{ gap: 0 }}>
                {data.cards.map((c) => (
                  <details key={c.id} style={{ borderTop: "1px solid var(--rule)", padding: "8px 0" }}>
                    <summary style={{ cursor: "pointer", display: "flex", gap: 8, alignItems: "baseline" }}>
                      <span className="badge">{CARD_KIND_LABEL[c.kind]}</span>
                      <span style={{ flex: 1, minWidth: 0 }}><MathText text={c.front} /></span>
                      <span className="small muted nowrap">{c.dueLabel}</span>
                    </summary>
                    <div className="small ink2" style={{ padding: "6px 0 0 4px", whiteSpace: "pre-wrap" }}>
                      <MathText text={c.back} />
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <p className="small muted">还没有这个题型的卡片。做错的题会自动生成。</p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Fact({ label, value, foot }: { label: string; value: string; foot?: ReactNode }) {
  return (
    <div className="panel" style={{ display: "grid", gap: 4 }}>
      <span className="small muted">{label}</span>
      <b style={{ fontSize: 24 }}>{value}</b>
      {foot ? <div className="small muted">{foot}</div> : null}
    </div>
  );
}
