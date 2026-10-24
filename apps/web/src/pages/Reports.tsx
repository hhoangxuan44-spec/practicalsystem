// 报告：日报和周报，可以前后翻看。

import { addDays, formatDateCn, levelOf, RESULT_META, type DailyReport, type WeeklyReport } from "@ps/core";
import { useState } from "react";
import { DayColumns } from "../charts/DayColumns.tsx";
import { StackedBars } from "../charts/StackedBars.tsx";
import { Empty, ErrorBox, LevelBadge, PageHead } from "../components/bits.tsx";
import { Icon } from "../components/Icon.tsx";
import { MathText } from "../components/MathText.tsx";
import { useApp, useQuery } from "../lib/app.tsx";
import { pct, RESULT_COLOR, RESULT_DISPLAY, signed } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";

export function ReportsPage() {
  const { today } = useApp();
  const [tab, setTab] = useState<"day" | "week">("day");
  const [date, setDate] = useState(today);
  const step = tab === "day" ? 1 : 7;

  return (
    <>
      <PageHead
        title="报告"
        sub="每天学了什么、做对多少、哪些题型变好或变差。"
        actions={
          <div className="seg" role="group" aria-label="报告类型">
            <button aria-pressed={tab === "day"} onClick={() => setTab("day")}>日报</button>
            <button aria-pressed={tab === "week"} onClick={() => setTab("week")}>周报</button>
          </div>
        }
      />
      <div className="row" style={{ gap: 8 }}>
        <button className="icon-btn" aria-label="往前" onClick={() => setDate(addDays(date, -step))}><Icon name="chevronLeft" /></button>
        <b>{tab === "day" ? formatDateCn(date) : `${formatDateCn(addDays(date, -6), false)} – ${formatDateCn(date, false)}`}</b>
        <button className="icon-btn" aria-label="往后" disabled={date >= today} onClick={() => setDate(addDays(date, step) > today ? today : addDays(date, step))}><Icon name="chevronRight" /></button>
        {date !== today ? <button className="btn sm" onClick={() => setDate(today)}>回到今天</button> : null}
      </div>
      {tab === "day" ? <Daily date={date} /> : <Weekly date={date} />}
    </>
  );
}

function Daily({ date }: { date: string }) {
  const { data, error } = useQuery<DailyReport>(`daily:${date}`, (api) => api.dailyReport(date));
  if (!data) return error ? <ErrorBox error={error} /> : <div className="skeleton">正在加载…</div>;
  const r = data;
  const legend = RESULT_DISPLAY.map((k) => ({ key: k, label: RESULT_META[k].label, color: RESULT_COLOR[k] }));
  return (
    <>
      <section className="panel">
        <p style={{ fontSize: 17 }}>{r.headline}</p>
        <div className="row" style={{ gap: 18, marginTop: 12 }}>
          <Kpi label="做题" value={`${r.attempts}`} />
          <Kpi label="做对" value={`${r.ok}`} />
          <Kpi label="正确率" value={r.attempts ? `${pct(r.ok / r.attempts)}%` : "—"} />
          <Kpi label="复习卡片" value={`${r.reviews}`} />
          <Kpi label="记住" value={r.reviews ? `${pct(r.remembered / r.reviews)}%` : "—"} />
          <Kpi label="新卡" value={`${r.cardsCreated}`} />
        </div>
      </section>
      {r.attempts || r.summaries.length ? (
        <section className="split">
          <div className="stack" style={{ gap: 18 }}>
            {r.attempts ? (
              <div className="panel">
                <StackedBars title="作答结果" legend={legend} rows={[{ label: "当天", segments: legend.map((l) => ({ ...l, value: r.counts[l.key] })) }]} labelWidth={50} />
              </div>
            ) : null}
            {r.summaries.length ? (
              <div className="panel">
                <div className="panel-head"><h2>AI 总结</h2></div>
                <div className="stack">
                  {r.summaries.map((s, i) => (
                    <p key={i}><MathText text={s} /></p>
                  ))}
                </div>
                {r.highlights.length ? (
                  <ul style={{ margin: "12px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
                    {r.highlights.map((h, i) => (
                      <li key={i}><MathText text={h} /></li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="panel">
            <div className="panel-head"><h2>碰到的题型</h2></div>
            {r.nodes.length ? (
              <div className="tbl-wrap" style={{ border: 0 }}>
                <table className="tbl">
                  <thead>
                    <tr><th>题型</th><th>之前</th><th>现在</th><th className="num">变化</th></tr>
                  </thead>
                  <tbody>
                    {r.nodes.map((n) => (
                      <tr key={n.nodeId} className="clickable" onClick={() => navigate({ name: "node", id: n.nodeId })}>
                        <td>{n.name}</td>
                        <td className="num">{n.before === null ? "未测" : pct(n.before)}</td>
                        <td><LevelBadge level={levelOf(n.after)} mastery={n.after} /></td>
                        <td className="num">{n.before === null ? "新" : signed(n.delta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="small muted">这一天没有做题记录。</p>
            )}
          </div>
        </section>
      ) : (
        <div className="panel"><Empty title="这一天没有学习记录" icon="journal" /></div>
      )}
    </>
  );
}

function Weekly({ date }: { date: string }) {
  const { data, error } = useQuery<WeeklyReport>(`weekly:${date}`, (api) => api.weeklyReport(date));
  if (!data) return error ? <ErrorBox error={error} /> : <div className="skeleton">正在加载…</div>;
  const w = data;
  return (
    <>
      <section className="panel row" style={{ gap: 18 }}>
        <Kpi label="上传" value={`${w.entries} 份`} />
        <Kpi label="做题" value={`${w.attempts}`} />
        <Kpi label="正确率" value={w.attempts ? `${pct(w.ok / w.attempts)}%` : "—"} />
        <Kpi label="复习卡片" value={`${w.reviews}`} />
        <Kpi label="记住" value={w.reviews ? `${pct(w.remembered / w.reviews)}%` : "—"} />
      </section>
      <section className="grid-2">
        <div className="panel">
          <DayColumns
            title="每天做题"
            unit="题"
            series={[
              { key: "ok", label: "做对", color: "var(--series-1)" },
              { key: "wrong", label: "没做对", color: "var(--series-2)" },
            ]}
            days={w.days.map((d) => ({ date: d.date, values: { ok: d.ok, wrong: d.attempts - d.ok } }))}
          />
        </div>
        <div className="panel">
          <DayColumns
            title="每天复习"
            unit="张"
            series={[
              { key: "remembered", label: "记住", color: "var(--series-1)" },
              { key: "forgot", label: "忘了", color: "var(--series-2)" },
            ]}
            days={w.days.map((d) => ({ date: d.date, values: { remembered: d.remembered, forgot: d.reviews - d.remembered } }))}
          />
        </div>
      </section>
      <section className="grid-3">
        <ChangeList title="进步了" items={w.improved} empty="这周没有明显进步的题型" />
        <ChangeList title="退步了" items={w.declined} empty="这周没有退步的题型" />
        <ChangeList title="仍然薄弱" items={w.stillWeak} empty="没有反复薄弱的题型" />
      </section>
    </>
  );
}

function ChangeList({ title, items, empty }: { title: string; items: WeeklyReport["improved"]; empty: string }) {
  return (
    <div className="panel">
      <div className="panel-head"><h2>{title}</h2></div>
      {items.length ? (
        <div className="stack" style={{ gap: 6 }}>
          {items.map((n) => (
            <button key={n.nodeId} className="nav-link" onClick={() => navigate({ name: "node", id: n.nodeId })}>
              <span style={{ flex: 1, minWidth: 0, color: "var(--ink)" }}>{n.name}</span>
              <span className="small num muted">{n.before === null ? "未测" : pct(n.before)} → {pct(n.after)}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="small muted">{empty}</p>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid" }}>
      <span className="small muted">{label}</span>
      <b style={{ fontSize: 20 }}>{value}</b>
    </div>
  );
}
