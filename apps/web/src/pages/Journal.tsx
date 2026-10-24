// 学习记录：每天上传的内容，按日期排列。

import { formatDateCn, type EntryListItem } from "@ps/core";
import { useMemo, useState } from "react";
import { Empty, ErrorBox, PageHead } from "../components/bits.tsx";
import { Icon } from "../components/Icon.tsx";
import { MathText } from "../components/MathText.tsx";
import { useApp, useQuery } from "../lib/app.tsx";
import { dateLabel } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";
import { StatusBadge } from "./Today.tsx";

type Filter = "all" | "done" | "pending" | "attention";

export function JournalPage() {
  const { today } = useApp();
  const { data, error } = useQuery<EntryListItem[]>("entries", (api) => api.entries());
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const list = (data ?? []).filter((e) => {
      if (filter === "done" && e.status !== "done") return false;
      if (filter === "pending" && !(e.status === "queued" || e.status === "analyzing")) return false;
      if (filter === "attention" && !(e.status === "failed" || e.status === "needs_ai")) return false;
      const s = q.trim();
      return !s || e.title.includes(s) || (e.source ?? "").includes(s) || (e.summary ?? "").includes(s);
    });
    const m = new Map<string, EntryListItem[]>();
    for (const e of list) m.set(e.date, [...(m.get(e.date) ?? []), e]);
    return [...m.entries()];
  }, [data, filter, q]);

  return (
    <>
      <PageHead
        title="学习记录"
        sub="每次上传都会留档：原件、识别出的题目、判定结果、生成的卡片和总结。"
        actions={
          <button className="btn primary" onClick={() => navigate({ name: "upload" })}>
            <Icon name="upload" size={16} />
            上传
          </button>
        }
      />
      <div className="panel row" style={{ padding: "12px 14px", gap: 10 }}>
        <div className="seg" role="group" aria-label="筛选">
          {([
            ["all", "全部"],
            ["done", "已归档"],
            ["pending", "分析中"],
            ["attention", "需要处理"],
          ] as [Filter, string][]).map(([k, l]) => (
            <button key={k} aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
          ))}
        </div>
        <div className="row" style={{ marginLeft: "auto", gap: 6, flexWrap: "nowrap" }}>
          <Icon name="search" size={16} />
          <input className="input" style={{ width: 200, padding: "5px 8px" }} placeholder="搜索标题、来源、总结" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜索记录" />
        </div>
      </div>
      <ErrorBox error={error} />
      {!data ? (
        <div className="skeleton">正在加载…</div>
      ) : groups.length ? (
        groups.map(([date, items]) => (
          <section key={date} className="stack" style={{ gap: 10 }}>
            <h2 style={{ fontSize: 15 }}>
              {dateLabel(date, today)} <span className="small muted" style={{ fontWeight: 400 }}>{formatDateCn(date)}</span>
            </h2>
            <div className="grid-2">
              {items.map((e) => (
                <button key={e.id} className="panel" style={{ textAlign: "left", cursor: "pointer", display: "grid", gap: 8 }} onClick={() => navigate({ name: "entry", id: e.id })}>
                  <div className="row between" style={{ flexWrap: "nowrap" }}>
                    <b style={{ fontSize: 15, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</b>
                    <StatusBadge status={e.status} progress={e.progress} />
                  </div>
                  <div className="row small muted" style={{ gap: 12 }}>
                    {e.source ? <span>{e.source}</span> : null}
                    {e.attachmentCount ? <span><Icon name="file" size={12} /> {e.attachmentCount} 个文件</span> : null}
                    {e.stats ? <span>{e.stats.attempts} 道题 · 对 {e.stats.ok} · {e.stats.cards} 张卡</span> : null}
                  </div>
                  {e.summary ? (
                    <div className="small ink2" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      <MathText text={e.summary} />
                    </div>
                  ) : e.error ? (
                    <div className="error-text">{e.error}</div>
                  ) : null}
                </button>
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="panel"><Empty title="没有符合条件的记录" icon="journal" /></div>
      )}
    </>
  );
}
