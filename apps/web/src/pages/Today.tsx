// 今日：倒计时、今日训练计划、需要注意的事、薄弱点、今天的学习总结。

import { formatDateCn, levelOf, RESULT_META, type DashboardView, type PlanTask } from "@ps/core";
import { useState, type ReactNode } from "react";
import { Empty, ErrorBox, LevelBadge, LevelIcon, Meter, NodeLink, PageHead, ResultChip, Stars } from "../components/bits.tsx";
import { Icon, type IconName } from "../components/Icon.tsx";
import { MathText } from "../components/MathText.tsx";
import { useAction, useApp, useQuery } from "../lib/app.tsx";
import { dateLabel, pct, signed } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";

const TASK_ICON: Record<PlanTask["kind"], IconName> = { review: "review", redo: "refresh", study: "target", diagnose: "search", exam: "file" };
const TASK_LABEL: Record<PlanTask["kind"], string> = { review: "记忆复习", redo: "错题重做", study: "专项补强", diagnose: "盲区摸底", exam: "真题套卷" };

export function TodayPage() {
  const { today, boot } = useApp();
  const { data, error } = useQuery<DashboardView>("dashboard", (api, t) => api.dashboard(t));
  if (!data) return error ? <ErrorBox error={error} /> : <div className="skeleton">正在加载…</div>;
  const d = data;
  const due = d.review.due + d.review.fresh;
  const doneTasks = d.plan.tasks.filter((t) => t.done).length;

  return (
    <>
      <PageHead
        title={`今天 · ${formatDateCn(today)}`}
        sub={`${d.phase.label}：${d.phase.advice}`}
        actions={
          <>
            <button className="btn" onClick={() => navigate({ name: "review" })} disabled={!due}>
              <Icon name="review" size={16} />
              {due ? `开始复习 ${due} 张` : "今天的卡复习完了"}
            </button>
            <button className="btn primary" onClick={() => navigate({ name: "upload" })}>
              <Icon name="upload" size={16} />
              上传今天学的内容
            </button>
          </>
        }
      />

      <section className="grid-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }} aria-label="概况">
        <Stat label="距考试" value={`${d.phase.daysLeft}`} unit="天" foot={boot ? `${d.phase.label} · 考试日 ${formatDateCn(boot.settings.examDate, false)}` : d.phase.label} />
        <Stat
          label="今日计划"
          value={`${doneTasks}/${d.plan.tasks.length}`}
          unit="项完成"
          foot={<Meter value={d.plan.totalMinutes ? d.plan.doneMinutes / d.plan.totalMinutes : 0} label="今日计划完成度" />}
        />
        <Stat label="待复习记忆卡" value={`${due}`} unit="张" foot={`今天已复习 ${d.review.doneToday} 张`} />
        <Stat
          label="题型覆盖"
          value={`${d.overview.tested}/${d.overview.total}`}
          unit="已测"
          foot={`平均掌握度 ${pct(d.overview.avgMastery)} · 重点题型掌握 ${d.overview.key.good}/${d.overview.key.total}`}
        />
      </section>

      <section className="split">
        <PlanPanel data={d} />
        <div className="stack" style={{ gap: 18 }}>
          {d.insights.length ? (
            <div className="panel">
              <div className="panel-head">
                <h2>需要注意</h2>
                <span className="hint">根据全部做题记录</span>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                {d.insights.slice(0, 4).map((s) => (
                  <div key={s} className="callout">
                    <Icon name="alert" size={16} />
                    <span className="ink2">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="panel">
            <div className="panel-head">
              <h2>最该补的题型</h2>
              <a href="#diagnosis" onClick={(e) => (e.preventDefault(), navigate({ name: "diagnosis" }))} className="small">完整诊断</a>
            </div>
            {d.weak.length ? (
              <div className="stack" style={{ gap: 2 }}>
                {d.weak.slice(0, 5).map((s, i) => (
                  <button key={s.id} className="nav-link" style={{ alignItems: "flex-start" }} onClick={() => navigate({ name: "node", id: s.id })}>
                    <span className="num muted" style={{ width: 16 }}>{i + 1}</span>
                    <LevelIcon level={s.level} />
                    <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
                      <span style={{ color: "var(--ink)" }}>{s.name}</span>
                      <span className="small muted">
                        掌握度 {pct(s.mastery)} · {s.count} 次记录{s.mainError ? ` · ${RESULT_META[s.mainError].label}` : ""}
                      </span>
                    </span>
                    <Stars freq={s.freq} />
                  </button>
                ))}
              </div>
            ) : (
              <Empty title="还没有薄弱点" icon="target">上传做过的题之后，这里会列出最需要补的题型。</Empty>
            )}
            {d.blind.length ? (
              <>
                <hr className="divider" />
                <div className="small muted" style={{ marginBottom: 6 }}>几乎每年考、但还没测过</div>
                <div className="row" style={{ gap: 6 }}>
                  {d.blind.map((s) => (
                    <NodeLink key={s.id} id={s.id} />
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="split">
        <TodayReport data={d} />
        <div className="panel">
          <div className="panel-head">
            <h2>最近上传</h2>
            <a href="#journal" onClick={(e) => (e.preventDefault(), navigate({ name: "journal" }))} className="small">全部记录</a>
          </div>
          {d.recentEntries.length ? (
            <div className="stack" style={{ gap: 2 }}>
              {d.recentEntries.map((e) => (
                <button key={e.id} className="nav-link" onClick={() => navigate({ name: "entry", id: e.id })}>
                  <Icon name={e.attachmentCount ? "file" : "edit"} size={16} />
                  <span style={{ display: "grid", minWidth: 0 }}>
                    <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                    <span className="small muted">
                      {dateLabel(e.date, d.today)}
                      {e.stats ? ` · ${e.stats.attempts} 题，对 ${e.stats.ok}` : ""}
                    </span>
                  </span>
                  <StatusBadge status={e.status} progress={e.progress} />
                </button>
              ))}
            </div>
          ) : (
            <Empty title="还没有上传过内容" icon="upload">
              <button className="btn primary sm" onClick={() => navigate({ name: "upload" })}>上传第一份</button>
            </Empty>
          )}
        </div>
      </section>
    </>
  );
}

function Stat({ label, value, unit, foot }: { label: string; value: string; unit?: string; foot?: ReactNode }) {
  return (
    <div className="panel" style={{ display: "grid", gap: 6 }}>
      <span className="small muted">{label}</span>
      <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <b style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{value}</b>
        {unit ? <span className="muted">{unit}</span> : null}
      </span>
      {foot ? <div className="small muted">{foot}</div> : null}
    </div>
  );
}

export function StatusBadge({ status, progress }: { status: string; progress?: string }) {
  switch (status) {
    case "done":
      return <span className="badge good">已归档</span>;
    case "queued":
    case "analyzing":
      return (
        <span className="badge accent">
          <Icon name="sparkle" size={12} />
          {progress ?? "分析中"}
        </span>
      );
    case "failed":
      return <span className="badge bad">分析失败</span>;
    case "needs_ai":
      return <span className="badge warn">待分析</span>;
    default:
      return null;
  }
}

function PlanPanel({ data }: { data: DashboardView }) {
  const { api } = useApp();
  const { run, busy } = useAction();
  const [open, setOpen] = useState<string | null>(null);
  const plan = data.plan;
  const over = plan.totalMinutes > plan.budget;

  const openTask = (t: PlanTask) => {
    if (t.kind === "review") navigate({ name: "review" });
    else if (t.kind === "exam") navigate({ name: "upload" });
    else if (t.nodeId) navigate({ name: "node", id: t.nodeId });
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <h2>今日训练计划</h2>
          <div className="small muted" style={{ marginTop: 2 }}>
            约 {plan.totalMinutes} 分钟（每日预算 {plan.budget} 分钟{over ? "，今天的复习量超出预算" : ""}）。题目在自己的本子上做，做完上传，系统会自动勾选。
          </div>
        </div>
        <button className="btn sm" disabled={busy} onClick={() => run(() => api.regeneratePlan(data.today), "已按最新数据重新安排")}>
          <Icon name="refresh" size={14} />
          重新安排
        </button>
      </div>
      {plan.tasks.length ? (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {plan.tasks.map((t) => (
            <li key={t.id} style={{ border: "1px solid var(--rule)", borderRadius: 10, padding: "10px 12px", display: "grid", gap: 6, background: t.done ? "var(--surface-2)" : "var(--surface)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 10, alignItems: "start" }}>
                <input
                  type="checkbox"
                  checked={t.done}
                  aria-label={`标记「${t.title}」${t.done ? "未完成" : "已完成"}`}
                  style={{ width: 18, height: 18, marginTop: 2, accentColor: "var(--accent)" }}
                  onChange={(e) => run(() => api.setTaskDone(plan.date, t.id, e.target.checked))}
                />
                <div style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="badge"><Icon name={TASK_ICON[t.kind]} size={12} />{TASK_LABEL[t.kind]}</span>
                    <button className="btn ghost" style={{ padding: 0, fontWeight: 600, textDecoration: t.done ? "line-through" : "none", color: t.done ? "var(--muted)" : "var(--ink)" }} onClick={() => openTask(t)}>
                      {t.title}
                    </button>
                    {t.doneAuto ? <span className="badge good">自动完成</span> : null}
                  </div>
                  <div className="small ink2" style={{ marginTop: 4 }}>
                    <MathText text={t.detail} />
                  </div>
                  {open === t.id ? <div className="small muted" style={{ marginTop: 4 }}><MathText text={`为什么：${t.reason}`} /></div> : null}
                </div>
                <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
                  <span className="small muted nowrap">{t.minutes} 分钟</span>
                  <button className="btn ghost sm" style={{ padding: "0 4px" }} onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id}>
                    {open === t.id ? "收起" : "为什么"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <Empty title="今天没有安排" icon="today">先上传一些做过的题，系统会根据你的薄弱点安排训练。</Empty>
      )}
    </div>
  );
}

function TodayReport({ data }: { data: DashboardView }) {
  const r = data.report;
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>今天的学习</h2>
        <a href="#reports" onClick={(e) => (e.preventDefault(), navigate({ name: "reports" }))} className="small">日报与周报</a>
      </div>
      <p style={{ fontSize: 15 }}>{r.headline}</p>
      {r.summaries.length ? (
        <div className="stack" style={{ marginTop: 12, gap: 8 }}>
          {r.summaries.map((s, i) => (
            <div key={i} className="callout accent">
              <Icon name="sparkle" size={16} />
              <MathText text={s} />
            </div>
          ))}
        </div>
      ) : null}
      {r.highlights.length ? (
        <>
          <div className="small muted" style={{ margin: "14px 0 6px" }}>今天要记住的</div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
            {r.highlights.map((h, i) => (
              <li key={i}><MathText text={h} /></li>
            ))}
          </ul>
        </>
      ) : null}
      {r.nodes.length ? (
        <>
          <div className="small muted" style={{ margin: "14px 0 6px" }}>今天碰到的题型</div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>题型</th>
                  <th>现在</th>
                  <th className="num">变化</th>
                </tr>
              </thead>
              <tbody>
                {r.nodes.slice(0, 8).map((n) => (
                  <tr key={n.nodeId} className="clickable" onClick={() => navigate({ name: "node", id: n.nodeId })}>
                    <td>{n.name}</td>
                    <td><LevelBadge level={levelOf(n.after)} mastery={n.after} /></td>
                    <td className="num">{n.before === null ? "新" : signed(n.delta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
      {r.attempts ? (
        <div className="row" style={{ marginTop: 12, gap: 6 }}>
          {(Object.entries(r.counts) as [keyof typeof r.counts, number][]).filter(([, v]) => v > 0).map(([k, v]) => (
            <span key={k} className="row" style={{ gap: 4 }}>
              <ResultChip result={k} />
              <span className="small num">{v}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

