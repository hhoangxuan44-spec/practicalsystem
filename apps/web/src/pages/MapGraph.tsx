// 知识框架图：49 个题型按前置依赖分层排列，左边是地基，右边是综合题型。
// 红线表示「薄弱的前置题型 → 被它拖累的题型」，选中一个题型会高亮它的上下游。

import { ALL_NODES, TAXONOMY, type NodeState } from "@ps/core";
import { useMemo, useState } from "react";
import { SvgLevelIcon } from "../components/bits.tsx";
import { useTooltip } from "../components/overlays.tsx";
import { useWidth } from "../charts/ChartFrame.tsx";
import { shortName, tileLook, type ColorMode } from "./mapShared.ts";

const BOX_W = 168;
const BOX_H = 36;
const ROW_H = 46;
const HEAD = 30;

interface Layout {
  depth: Map<string, number>;
  columns: string[][];
}

/** 最长路径分层 + 两轮重心排序，减少连线交叉 */
function computeLayout(): Layout {
  const depth = new Map<string, number>();
  const byId = new Map(ALL_NODES.map((n) => [n.id, n]));
  const visit = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    const n = byId.get(id)!;
    const d = n.prereqs.length ? 1 + Math.max(...n.prereqs.map(visit)) : 0;
    depth.set(id, d);
    return d;
  };
  ALL_NODES.forEach((n) => visit(n.id));
  const maxD = Math.max(...depth.values());
  const order = new Map(TAXONOMY.flatMap((c) => c.nodes).map((n, i) => [n.id, i]));
  const columns: string[][] = Array.from({ length: maxD + 1 }, (_, d) =>
    ALL_NODES.filter((n) => depth.get(n.id) === d)
      .map((n) => n.id)
      .sort((a, b) => order.get(a)! - order.get(b)!),
  );
  for (let pass = 0; pass < 2; pass++) {
    const pos = new Map<string, number>();
    columns.forEach((col) => col.forEach((id, i) => pos.set(id, i / Math.max(1, col.length - 1))));
    for (let d = 1; d < columns.length; d++) {
      columns[d].sort((a, b) => bary(a) - bary(b) || order.get(a)! - order.get(b)!);
      columns[d].forEach((id, i) => pos.set(id, i / Math.max(1, columns[d].length - 1)));
    }
    function bary(id: string) {
      const ps = byId.get(id)!.prereqs;
      return ps.reduce((s, p) => s + (pos.get(p) ?? 0), 0) / ps.length;
    }
  }
  return { depth, columns };
}

const LAYOUT = computeLayout();

function ancestors(id: string, acc = new Set<string>()): Set<string> {
  for (const p of ALL_NODES.find((n) => n.id === id)?.prereqs ?? []) {
    if (!acc.has(p)) {
      acc.add(p);
      ancestors(p, acc);
    }
  }
  return acc;
}

function descendants(id: string, acc = new Set<string>()): Set<string> {
  for (const n of ALL_NODES) {
    if (n.prereqs.includes(id) && !acc.has(n.id)) {
      acc.add(n.id);
      descendants(n.id, acc);
    }
  }
  return acc;
}

export function MapGraph({
  states,
  mode,
  visible,
  selected,
  onSelect,
}: {
  states: Record<string, NodeState>;
  mode: ColorMode;
  visible: (s: NodeState) => boolean;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const { ref, width } = useWidth<HTMLDivElement>(900);
  const tip = useTooltip();
  const [hover, setHover] = useState<string | null>(null);
  const cols = LAYOUT.columns;
  const W = Math.max(width, cols.length * BOX_W + (cols.length - 1) * 40);
  const gapX = (W - cols.length * BOX_W) / Math.max(1, cols.length - 1);
  const maxRows = Math.max(...cols.map((c) => c.length));
  const H = HEAD + maxRows * ROW_H;

  const pos = useMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    cols.forEach((col, d) => {
      const offset = ((maxRows - col.length) * ROW_H) / 2;
      col.forEach((id, i) => m.set(id, { x: d * (BOX_W + gapX), y: HEAD + offset + i * ROW_H + (ROW_H - BOX_H) / 2 }));
    });
    return m;
  }, [cols, gapX, maxRows]);

  const focus = hover ?? selected;
  const related = useMemo(() => {
    if (!focus) return null;
    return { up: ancestors(focus), down: descendants(focus) };
  }, [focus]);

  const colLabels = cols.map((_, d) => (d === 0 ? "地基" : d === cols.length - 1 ? "综合" : `第 ${d + 1} 层`));

  return (
    <div ref={ref} style={{ width: "100%", overflowX: "auto" }}>
      <svg width={W} height={H} role="img" aria-label="题型依赖关系图" style={{ display: "block" }}>
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--rule-strong)" strokeWidth="1" />
          </pattern>
        </defs>
        {colLabels.map((l, d) => (
          <text key={l} x={d * (BOX_W + gapX)} y={16} fontSize={12} fill="var(--muted)">
            {l}
          </text>
        ))}
        {ALL_NODES.flatMap((n) =>
          n.prereqs.map((p) => {
            const a = pos.get(p)!;
            const b = pos.get(n.id)!;
            const x1 = a.x + BOX_W;
            const y1 = a.y + BOX_H / 2;
            const x2 = b.x;
            const y2 = b.y + BOX_H / 2;
            const dx = (x2 - x1) / 2;
            const isRoot = states[n.id]?.rootCauses.includes(p);
            let stroke = isRoot ? "var(--bad)" : "var(--rule-strong)";
            let opacity = 1;
            let w = isRoot ? 1.8 : 1.2;
            if (related && focus) {
              const up = (related.up.has(p) || p === focus) && (related.up.has(n.id) || n.id === focus);
              const down = (related.down.has(n.id) || n.id === focus) && (related.down.has(p) || p === focus);
              if (up) {
                stroke = "var(--accent)";
                w = 2;
              } else if (down) {
                stroke = "var(--ink-2)";
                w = 1.6;
              } else opacity = 0.15;
            }
            return (
              <path key={`${p}-${n.id}`} d={`M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`} fill="none" stroke={stroke} strokeWidth={w} opacity={opacity} />
            );
          }),
        )}
        {ALL_NODES.map((n) => {
          const s = states[n.id];
          if (!s) return null;
          const p = pos.get(n.id)!;
          const look = tileLook(s, mode);
          const show = visible(s);
          const inFocus = !related || !focus || n.id === focus || related.up.has(n.id) || related.down.has(n.id);
          const label = shortName(n.name);
          return (
            <g
              key={n.id}
              transform={`translate(${p.x},${p.y})`}
              opacity={show && inFocus ? 1 : 0.28}
              style={{ cursor: "pointer" }}
              tabIndex={0}
              role="button"
              aria-label={`${n.name}，${look.value}`}
              onClick={() => onSelect(n.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(n.id)}
              onPointerEnter={(e) => {
                setHover(n.id);
                tip.show(e.clientX, e.clientY, <GraphTip s={s} value={look.value} />);
              }}
              onPointerMove={(e) => tip.show(e.clientX, e.clientY, <GraphTip s={s} value={look.value} />)}
              onPointerLeave={() => {
                setHover(null);
                tip.hide();
              }}
            >
              <rect
                width={BOX_W}
                height={BOX_H}
                rx={8}
                fill={look.empty ? "url(#hatch)" : `color-mix(in srgb, ${look.color} 16%, var(--surface))`}
                stroke={selected === n.id ? "var(--accent)" : look.empty ? "var(--rule-strong)" : look.color}
                strokeWidth={selected === n.id ? 2.5 : 1.5}
                strokeDasharray={look.dashed ? "4 3" : undefined}
              />
              {look.empty ? <rect width={BOX_W} height={BOX_H} rx={8} fill="var(--surface)" opacity={0.6} /> : null}
              <SvgLevelIcon level={look.level} x={8} y={10} />
              <text x={30} y={BOX_H / 2} dy="0.35em" fontSize={12} fill="var(--ink)">
                {label.length > 9 ? label.slice(0, 9) + "…" : label}
              </text>
              <text x={BOX_W - 8} y={BOX_H / 2} dy="0.35em" textAnchor="end" fontSize={11.5} fontWeight={700} fill="var(--ink-2)" className="num">
                {look.value}
              </text>
            </g>
          );
        })}
      </svg>
      {tip.node}
    </div>
  );
}

function GraphTip({ s, value }: { s: NodeState; value: string }) {
  return (
    <div style={{ display: "grid", gap: 2 }}>
      <b>{s.name}</b>
      <span className="tt-value">{value}</span>
      <span className="muted">
        {s.chapterName} · {s.count} 次记录{s.rootCauses.length ? ` · 根因 ${s.rootCauses.length} 个` : ""}
      </span>
    </div>
  );
}
