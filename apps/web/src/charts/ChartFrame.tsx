// 图表外框：标题、图例、「图表 / 表格」切换。每个图表都有一份可直接阅读的表格。

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface TableData {
  columns: string[];
  rows: (string | number)[][];
}

export function ChartFrame({
  title,
  hint,
  legend,
  table,
  children,
}: {
  title: string;
  hint?: ReactNode;
  legend?: { label: string; color: string }[];
  table: TableData;
  children: ReactNode;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  return (
    <figure style={{ margin: 0, display: "grid", gap: 10, minWidth: 0 }}>
      <div className="row between" style={{ alignItems: "baseline" }}>
        <figcaption>
          <b style={{ fontSize: 14 }}>{title}</b>
          {hint ? <span className="small muted" style={{ marginLeft: 8 }}>{hint}</span> : null}
        </figcaption>
        <div className="seg" role="group" aria-label="切换图表或表格">
          <button aria-pressed={view === "chart"} onClick={() => setView("chart")}>图表</button>
          <button aria-pressed={view === "table"} onClick={() => setView("table")}>表格</button>
        </div>
      </div>
      {legend && legend.length >= 2 && view === "chart" ? (
        <div className="row" style={{ gap: "4px 14px" }}>
          {legend.map((l) => (
            <span key={l.label} className="small ink2" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <i style={{ width: 10, height: 10, borderRadius: 2, background: l.color, display: "inline-block" }} />
              {l.label}
            </span>
          ))}
        </div>
      ) : null}
      {view === "chart" ? (
        children
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                {table.columns.map((c, i) => (
                  <th key={c} className={i > 0 ? "num" : undefined}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => (
                    <td key={j} className={j > 0 ? "num" : undefined}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}

/** 跟随容器宽度 */
export function useWidth<T extends HTMLElement>(initial = 600) {
  const ref = useRef<T>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth || initial);
    const ro = new ResizeObserver(([e]) => setW(Math.max(200, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [initial]);
  return { ref, width: w };
}
