// 掌握度变化折线：单一序列，0~100，标出「掌握」「不稳」两条分界线。悬停有十字线和读数。

import { formatDateCn, GOOD_THRESHOLD, WARN_THRESHOLD } from "@ps/core";
import { useMemo, useState } from "react";
import { useTooltip } from "../components/overlays.tsx";
import { ChartFrame, useWidth } from "./ChartFrame.tsx";

const H = 180;
const PAD = { top: 14, right: 44, bottom: 26, left: 32 };

export function MasteryLine({ points, title = "掌握度变化" }: { points: { date: string; mastery: number | null }[]; title?: string }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const tip = useTooltip();
  const [hover, setHover] = useState<number | null>(null);
  const iw = width - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length <= 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => PAD.top + (1 - v) * ih;

  const segments = useMemo(() => {
    const segs: string[] = [];
    let cur = "";
    points.forEach((p, i) => {
      if (p.mastery === null) {
        if (cur) segs.push(cur);
        cur = "";
      } else cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(p.mastery).toFixed(1)}`;
    });
    if (cur) segs.push(cur);
    return segs;
  }, [points, width]);

  let lastIdx = -1;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].mastery !== null) {
      lastIdx = i;
      break;
    }
  }
  const last = lastIdx >= 0 ? points[lastIdx] : undefined;
  const hasData = points.some((p) => p.mastery !== null);
  const ticks = [0, 0.5, 1];
  const xTicks = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round(((px - PAD.left) / iw) * (points.length - 1));
    const idx = Math.max(0, Math.min(points.length - 1, i));
    setHover(idx);
    const p = points[idx];
    tip.show(
      e.clientX,
      e.clientY,
      <div>
        <div className="tt-value">{p.mastery === null ? "无记录" : Math.round(p.mastery * 100)}</div>
        <div className="muted">{formatDateCn(p.date)}</div>
      </div>,
    );
  };

  return (
    <ChartFrame
      title={title}
      hint="最近 30 天，每天的估计值"
      table={{ columns: ["日期", "掌握度"], rows: points.filter((p) => p.mastery !== null).map((p) => [p.date, Math.round(p.mastery! * 100)]) }}
    >
      <div ref={ref} style={{ width: "100%", minWidth: 0, overflow: "hidden" }}>
        {hasData ? (
          <svg width={width} height={H} role="img" aria-label={`${title}折线图`} style={{ display: "block", overflow: "visible" }}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={1} />
                <text x={PAD.left - 8} y={y(t)} dy="0.35em" textAnchor="end" fontSize={11} fill="var(--muted)" className="num">
                  {t * 100}
                </text>
              </g>
            ))}
            {[
              { v: GOOD_THRESHOLD, label: "掌握" },
              { v: WARN_THRESHOLD, label: "不稳" },
            ].map((th) => (
              <g key={th.label}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(th.v)} y2={y(th.v)} stroke="var(--rule-strong)" strokeWidth={1} />
                <text x={width - PAD.right + 6} y={y(th.v)} dy="0.35em" fontSize={11} fill="var(--muted)">
                  {th.label}
                </text>
              </g>
            ))}
            {xTicks.map((i) => (
              <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={11} fill="var(--muted)">
                {formatDateCn(points[i].date, false)}
              </text>
            ))}
            {segments.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="var(--series-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {last && last.mastery !== null ? (
              <g>
                <circle cx={x(lastIdx)} cy={y(last.mastery)} r={5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
                <text x={x(lastIdx) + 9} y={y(last.mastery) - 9} fontSize={12} fontWeight={700} fill="var(--ink)">
                  {Math.round(last.mastery * 100)}
                </text>
              </g>
            ) : null}
            {hover !== null ? (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--ink-2)" strokeWidth={1} />
                {points[hover].mastery !== null ? (
                  <circle cx={x(hover)} cy={y(points[hover].mastery!)} r={4.5} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
                ) : null}
              </g>
            ) : null}
            <rect
              x={PAD.left}
              y={PAD.top}
              width={iw}
              height={ih}
              fill="transparent"
              onPointerMove={onMove}
              onPointerLeave={() => {
                setHover(null);
                tip.hide();
              }}
            />
          </svg>
        ) : (
          <p className="small muted" style={{ padding: "24px 0" }}>还没有记录，上传这个题型的题目后会出现曲线。</p>
        )}
        {tip.node}
      </div>
    </ChartFrame>
  );
}
