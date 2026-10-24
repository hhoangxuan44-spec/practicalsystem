// 按天的柱状图（周报）：可堆叠两个序列，柱宽不超过 24px，顶端圆角，底部平直。

import { formatDateCn } from "@ps/core";
import { useState } from "react";
import { useTooltip } from "../components/overlays.tsx";
import { ChartFrame, useWidth } from "./ChartFrame.tsx";

export interface ColumnSeries {
  key: string;
  label: string;
  color: string;
}

const H = 170;
const PAD = { top: 16, right: 8, bottom: 26, left: 30 };

export function DayColumns({
  title,
  hint,
  days,
  series,
  unit,
}: {
  title: string;
  hint?: string;
  days: { date: string; values: Record<string, number> }[];
  series: ColumnSeries[];
  unit: string;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const tip = useTooltip();
  const [hover, setHover] = useState<number | null>(null);
  const totals = days.map((d) => series.reduce((s, x) => s + (d.values[x.key] ?? 0), 0));
  const max = niceMax(Math.max(...totals, 1));
  const iw = width - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const band = iw / Math.max(days.length, 1);
  const bw = Math.min(24, band * 0.55);
  const y = (v: number) => PAD.top + ih - (v / max) * ih;
  const ticks = [0, max / 2, max];

  return (
    <ChartFrame
      title={title}
      hint={hint}
      legend={series.length >= 2 ? series.map((s) => ({ label: s.label, color: s.color })) : undefined}
      table={{ columns: ["日期", ...series.map((s) => s.label), "合计"], rows: days.map((d, i) => [d.date, ...series.map((s) => d.values[s.key] ?? 0), totals[i]]) }}
    >
      <div ref={ref} style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
        <svg width={width} height={H} role="img" aria-label={title} style={{ display: "block" }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--rule-strong)" : "var(--rule)"} />
              <text x={PAD.left - 6} y={y(t)} dy="0.35em" textAnchor="end" fontSize={11} fill="var(--muted)" className="num">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {days.map((d, i) => {
            const cx = PAD.left + band * i + band / 2;
            let acc = 0;
            const segs = series.filter((s) => (d.values[s.key] ?? 0) > 0);
            return (
              <g key={d.date} opacity={hover !== null && hover !== i ? 0.55 : 1}>
                {segs.map((s, si) => {
                  const v = d.values[s.key] ?? 0;
                  const top = y(acc + v);
                  const bottom = y(acc) - (si > 0 ? 2 : 0);
                  acc += v;
                  const h = Math.max(0, bottom - top);
                  return si === segs.length - 1 ? (
                    <path key={s.key} d={roundedTop(cx - bw / 2, top, bw, h, 4)} fill={s.color} />
                  ) : (
                    <rect key={s.key} x={cx - bw / 2} y={top} width={bw} height={h} fill={s.color} />
                  );
                })}
                <text x={cx} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">
                  {formatDateCn(d.date, false).replace(/^\d+月/, "")}
                </text>
                <rect
                  x={cx - band / 2}
                  y={PAD.top}
                  width={band}
                  height={ih}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.date} 合计 ${totals[i]} ${unit}`}
                  onPointerMove={(e) => {
                    setHover(i);
                    tip.show(e.clientX, e.clientY, <DayTip date={d.date} series={series} values={d.values} unit={unit} />);
                  }}
                  onPointerLeave={() => {
                    setHover(null);
                    tip.hide();
                  }}
                  onFocus={(e) => {
                    const b = e.currentTarget.getBoundingClientRect();
                    setHover(i);
                    tip.show(b.right, b.top + 20, <DayTip date={d.date} series={series} values={d.values} unit={unit} />);
                  }}
                  onBlur={() => {
                    setHover(null);
                    tip.hide();
                  }}
                />
              </g>
            );
          })}
        </svg>
        {tip.node}
      </div>
    </ChartFrame>
  );
}

function DayTip({ date, series, values, unit }: { date: string; series: ColumnSeries[]; values: Record<string, number>; unit: string }) {
  return (
    <div style={{ display: "grid", gap: 3 }}>
      <div className="muted">{formatDateCn(date)}</div>
      {series.map((s) => (
        <div key={s.key} className="tt-row">
          <span className="tt-key" style={{ ["--c" as string]: s.color }} />
          <b className="num">{values[s.key] ?? 0}</b>
          <span className="muted">{unit} · {s.label}</span>
        </div>
      ))}
    </div>
  );
}

function niceMax(v: number): number {
  const steps = [2, 4, 6, 10, 20, 30, 40, 60, 80, 100, 150, 200, 300, 500, 1000];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 100) * 100;
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
