// 薄弱点诊断：排名、根因、错因画像、盲区、证据不足的题型、反复出错。

import { getNode, RESULT_META, type DiagnosisView } from "@ps/core";
import { StackedBars } from "../charts/StackedBars.tsx";
import { Empty, ErrorBox, LevelBadge, Meter, NodeLink, PageHead, ResultChip, Stars } from "../components/bits.tsx";
import { Icon } from "../components/Icon.tsx";
import { useQuery } from "../lib/app.tsx";
import { CONFIDENCE_LABEL, pct, RESULT_COLOR, RESULT_DISPLAY } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";

export function DiagnosisPage() {
  const { data, error } = useQuery<DiagnosisView>("diagnosis", (api, t) => api.diagnosis(t));
  if (!data) return error ? <ErrorBox error={error} /> : <div className="skeleton">正在加载…</div>;
  const d = data;
  const maxPrio = Math.max(...d.weak.map((w) => w.priority), 0.01);
  const legend = RESULT_DISPLAY.map((r) => ({ key: r, label: RESULT_META[r].label, color: RESULT_COLOR[r] }));
  const rowOf = (label: string, counts: Record<string, number>) => ({
    label,
    segments: RESULT_DISPLAY.map((r) => ({ key: r, label: RESULT_META[r].label, value: counts[r] ?? 0, color: RESULT_COLOR[r] })),
  });

  return (
    <>
      <PageHead
        title="薄弱点诊断"
        sub="排序依据：考频 × 薄弱程度 × 证据可信度，再加上「是不是别的薄弱题型的前置」。先补排在前面的，收益最大。"
      />

      {d.insights.length ? (
        <section className="grid-2">
          {d.insights.map((s) => (
            <div key={s} className="callout">
              <Icon name="alert" size={16} />
              <span className="ink2">{s}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="split">
        <div className="panel">
          <div className="panel-head">
            <h2>先补这些</h2>
            <span className="hint">点题型看档案</span>
          </div>
          {d.weak.length ? (
            <div className="tbl-wrap" style={{ border: 0 }}>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>题型</th>
                    <th>掌握度</th>
                    <th>主要问题</th>
                    <th style={{ width: 120 }}>优先级</th>
                  </tr>
                </thead>
                <tbody>
                  {d.weak.map((w, i) => (
                    <tr key={w.id} className="clickable" onClick={() => navigate({ name: "node", id: w.id })}>
                      <td className="num muted">{i + 1}</td>
                      <td>
                        <div>{w.name}</div>
                        <div className="small muted">
                          <Stars freq={w.freq} /> {w.chapterName} · {CONFIDENCE_LABEL[w.confidence]}
                        </div>
                        {w.rootCauses.length ? (
                          <div className="small" style={{ color: "var(--bad-ink)", marginTop: 2 }}>
                            根因可能在：{w.rootCauses.map((r) => getNode(r)?.name).join("、")}
                          </div>
                        ) : null}
                      </td>
                      <td><LevelBadge level={w.level} mastery={w.mastery} /></td>
                      <td>{w.mainError ? <ResultChip result={w.mainError} /> : <span className="muted">—</span>}</td>
                      <td>
                        <Meter value={w.priority / maxPrio} label="优先级" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="还没有薄弱点" icon="target">上传做过的题之后会出现排名。</Empty>
          )}
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="panel">
            <div className="panel-head">
              <h2>重点题型覆盖</h2>
              <span className="hint">★★★ 几乎每年考</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <b style={{ fontSize: 34 }}>{d.key.good}</b>
              <span className="muted">/ {d.key.total} 个已掌握</span>
            </div>
            <div style={{ marginTop: 8 }}><Meter value={d.key.total ? d.key.good / d.key.total : 0} color="var(--good)" label="重点题型掌握比例" /></div>
            <p className="small muted" style={{ marginTop: 8 }}>已测 {d.key.tested} 个，未测 {d.key.total - d.key.tested} 个。</p>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>盲区</h2>
              <span className="hint">常考但没有任何记录</span>
            </div>
            {d.blind.length ? (
              <div className="row" style={{ gap: 6 }}>
                {d.blind.map((b) => (
                  <span key={b.id} className="row" style={{ gap: 2 }}>
                    <NodeLink id={b.id} />
                    <Stars freq={b.freq} />
                  </span>
                ))}
              </div>
            ) : (
              <p className="small muted">常考题型都至少测过一次。</p>
            )}
          </div>

          {d.roots.length ? (
            <div className="panel">
              <div className="panel-head">
                <h2>拖累最多的前置题型</h2>
              </div>
              <div className="stack" style={{ gap: 8 }}>
                {d.roots.slice(0, 5).map((r) => (
                  <div key={r.nodeId}>
                    <NodeLink id={r.nodeId} />
                    <span className="small muted" style={{ marginLeft: 6 }}>
                      影响 {r.dependents.map((x) => getNode(x)?.name).join("、")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <StackedBars
          title="错因画像"
          hint={`最近 ${d.errorProfile.sinceDays} 天，按主题型所在章节统计`}
          legend={legend}
          rows={[
            rowOf("全部", d.errorProfile.counts),
            ...d.chapters.filter((c) => Object.values(c.counts).some((v) => v > 0)).map((c) => rowOf(c.name, c.counts)),
          ]}
          labelWidth={150}
        />
        {d.errorProfile.dominant ? (
          <div className="callout accent" style={{ marginTop: 14 }}>
            <Icon name="target" size={16} />
            <span>
              做错的题里最多的是「{RESULT_META[d.errorProfile.dominant].label}」（{pct(d.errorProfile.dominantShare)}%）。{d.errorProfile.advice}
            </span>
          </div>
        ) : null}
      </section>

      <section className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <h2>反复出错</h2>
            <span className="hint">同一题型在不同材料里都错了</span>
          </div>
          {d.repeated.length ? (
            <div className="stack" style={{ gap: 8 }}>
              {d.repeated.map((r) => (
                <div key={r.nodeId} className="row between">
                  <NodeLink id={r.nodeId} />
                  <span className="small mono muted">{r.refs.join("、")}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="small muted">还没有反复出错的题型。</p>
          )}
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>证据不足</h2>
            <span className="hint">只有零星记录，颜色还不可信</span>
          </div>
          {d.uncertain.length ? (
            <div className="row" style={{ gap: 6 }}>
              {d.uncertain.map((u) => (
                <NodeLink key={u.id} id={u.id} />
              ))}
            </div>
          ) : (
            <p className="small muted">每个已测题型都有足够的记录。</p>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>再做一两道这些题型的题并上传，评估会更准。</p>
        </div>
      </section>
    </>
  );
}
