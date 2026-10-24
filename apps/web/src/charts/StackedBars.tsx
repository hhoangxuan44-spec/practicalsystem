// 横向堆叠条：每一行是一个整体（如一个章节），各段是作答结果的构成。段与段之间留 2px 间隙。

import { useState } from "react";
import { useTooltip } from "../components/overlays.tsx";
import { ChartFrame, useWidth } from "./ChartFrame.tsx";

export interface StackSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface StackRow {
  label: string;
  segments: StackSegment[];
}

const ROW_H = 22;
const BAR_H = 14;
const GAP = 2;

export function StackedBars({
  title,
  hint,
  rows,
  legend,
  labelWidth = 128,
  normalize = false,
}: {
  title: string;
  hint?: string;
  rows: StackRow[];
  legend: { key: string; label: string; color: string }[];
  labelWidth?: number;
  /** true 时每行按占比画满 */
  normalize?: boolean;
}) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const tip = useTooltip();
  const [active, setActive] = useState<string | null>(null);
  const narrow = width < 420;
  const lw = narrow ? 0 : labelWidth;
  const totalW = Math.max(...rows.map((r) => r.segments.reduce((s, x) => s + x.value, 0)), 1);
  const plotW = width - lw - 44;
  const rowH = narrow ? ROW_H + 18 : ROW_H + 8;
  const height = rows.length * rowH;

  return (
    <ChartFrame
      title={title}
      hint={hint}
      legend={legend.map((l) => ({ label: l.label, color: l.color }))}
      table={{
        columns: ["", ...legend.map((l) => l.label), "合计"],
        rows: rows.map((r) => [
          r.label,
          ...legend.map((l) => r.segments.find((s) => s.key === l.key)?.value ?? 0),
          r.segments.reduce((s, x) => s + x.value, 0),
        ]),
      }}
    >
      <div ref={ref} style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
        <svg width={width} height={height} role="img" aria-label={title} style={{ display: "block" }}>
          {rows.map((r, ri) => {
            const total = r.segments.reduce((s, x) => s + x.value, 0);
            const scale = normalize ? (total ? plotW / total : 0) : plotW / totalW;
            const y0 = ri * rowH + (narrow ? 18 : 4);
            let x0 = lw;
            const visible = r.segments.filter((s) => s.value > 0);
            return (
              <g key={r.label}>
                <text x={narrow ? 0 : lw - 10} y={narrow ? ri * rowH + 12 : y0 + BAR_H / 2} dy={narrow ? 0 : "0.35em"} textAnchor={narrow ? "start" : "end"} fontSize={12} fill="var(--ink-2)">
                  {r.label}
                </text>
                {total === 0 ? (
                  <line x1={lw} x2={lw + plotW} y1={y0 + BAR_H / 2} y2={y0 + BAR_H / 2} stroke="var(--rule)" />
                ) : null}
                {visible.map((s, si) => {
                  const w = Math.max(0, s.value * scale - (si < visible.length - 1 ? GAP : 0));
                  const x = x0;
                  x0 += s.value * scale;
                  const isLast = si === visible.length - 1;
                  const dim = active && active !== `${ri}-${s.key}` ? 0.55 : 1;
                  return (
                    <g key={s.key} opacity={dim}>
                      {isLast ? (
                        <path d={roundedRight(x, y0, w, BAR_H, 4)} fill={s.color} />
                      ) : (
                        <rect x={x} y={y0} width={w} height={BAR_H} fill={s.color} />
                      )}
                      <rect
                        x={x}
                        y={y0 - 4}
                        width={Math.max(w + GAP, 6)}
                        height={BAR_H + 8}
                        fill="transparent"
                        tabIndex={0}
                        aria-label={`${r.label} ${s.label} ${s.value}`}
                        onPointerMove={(e) => {
                          setActive(`${ri}-${s.key}`);
                          tip.show(e.clientX, e.clientY, <Tip value={s.value} total={total} label={s.label} row={r.label} color={s.color} />);
                        }}
                        onPointerLeave={() => {
                          setActive(null);
                          tip.hide();
                        }}
                        onFocus={(e) => {
                          const b = e.currentTarget.getBoundingClientRect();
                          setActive(`${ri}-${s.key}`);
                          tip.show(b.right, b.top, <Tip value={s.value} total={total} label={s.label} row={r.label} color={s.color} />);
                        }}
                        onBlur={() => {
                          setActive(null);
                          tip.hide();
                        }}
                      />
                    </g>
                  );
                })}
                <text x={lw + (normalize ? plotW : total * scale) + 8} y={y0 + BAR_H / 2} dy="0.35em" fontSize={12} fill="var(--muted)" className="num">
                  {total}
                </text>
              </g>
            );
          })}
        </svg>
        {tip.node}
      </div>
    </ChartFrame>
  );
}

function Tip({ value, total, label, row, color }: { value: number; total: number; label: string; row: string; color: string }) {
  return (
    <div>
      <div className="tt-value num">
        {value} 题 <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>{total ? Math.round((value / total) * 100) : 0}%</span>
      </div>
      <div className="tt-row">
        <span className="tt-key" style={{ ["--c" as string]: color }} />
        {label} · {row}
      </div>
    </div>
  );
}

function roundedRight(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, w / 2, h / 2);
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}
