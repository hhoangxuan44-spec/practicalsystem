// 能力地图：题型网格（按章节）和知识框架（按依赖关系）两种视图，三种着色视角，可筛选。

import { RESULT_META, type MapView, type NodeState, type ResultCode } from "@ps/core";
import { useMemo, useState } from "react";
import { ErrorBox, LevelIcon, PageHead, Stars } from "../components/bits.tsx";
import { Icon } from "../components/Icon.tsx";
import { NodeDrawer } from "../components/NodeDrawer.tsx";
import { useQuery } from "../lib/app.tsx";
import { LEVEL_COLOR, pct, RESULT_COLOR, RESULT_DISPLAY } from "../lib/format.ts";
import { MapGraph } from "./MapGraph.tsx";
import { COLOR_MODES, EVIDENCE_LEGEND, tileLook, type ColorMode } from "./mapShared.ts";

type View = "grid" | "graph";
type Part = "all" | "高数" | "线代";

export function MapPage() {
  const { data, error } = useQuery<MapView>("map", (api, t) => api.map(t));
  const [view, setView] = useState<View>("grid");
  const [mode, setMode] = useState<ColorMode>("mastery");
  const [part, setPart] = useState<Part>("all");
  const [onlyWeak, setOnlyWeak] = useState(false);
  const [onlyKey, setOnlyKey] = useState(false);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const states = useMemo(() => Object.fromEntries((data?.chapters ?? []).flatMap((c) => c.nodes).map((n) => [n.id, n])), [data]);
  const visible = (s: NodeState) =>
    (part === "all" || s.part === part) &&
    (!onlyWeak || s.level === "bad" || s.level === "warn") &&
    (!onlyKey || s.isKey) &&
    (!q.trim() || s.name.includes(q.trim()) || s.chapterName.includes(q.trim()));

  if (!data) return error ? <ErrorBox error={error} /> : <div className="skeleton">正在加载…</div>;
  const o = data.overview;
  const modeInfo = COLOR_MODES.find((m) => m.key === mode)!;

  return (
    <>
      <PageHead
        title="能力地图"
        sub="数二全部 49 个题型。颜色由做题记录算出，不靠自评；虚线框表示证据还少，斜纹表示还没测过。点任意题型看详情。"
        actions={
          <div className="seg" role="group" aria-label="视图">
            <button aria-pressed={view === "grid"} onClick={() => setView("grid")}>题型网格</button>
            <button aria-pressed={view === "graph"} onClick={() => setView("graph")}>知识框架</button>
          </div>
        }
      />

      <section className="grid-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <MiniStat label="已测题型" value={`${o.tested}/${o.total}`} />
        <MiniStat label="平均掌握度" value={pct(o.avgMastery)} />
        <MiniStat label="重点题型（★★★）" value={`${o.key.good} 掌握 / ${o.key.total}`} />
        <MiniStat label="做题记录" value={`${o.attempts} 题`} />
      </section>

      <div className="panel" style={{ padding: "12px 14px", display: "grid", gap: 10 }}>
        <div className="row" style={{ gap: 10 }}>
          <div className="seg" role="group" aria-label="着色视角">
            {COLOR_MODES.map((m) => (
              <button key={m.key} aria-pressed={mode === m.key} onClick={() => setMode(m.key)}>{m.label}</button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="范围">
            {(["all", "高数", "线代"] as Part[]).map((p) => (
              <button key={p} aria-pressed={part === p} onClick={() => setPart(p)}>{p === "all" ? "全部" : p}</button>
            ))}
          </div>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={onlyWeak} onChange={(e) => setOnlyWeak(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
            只看薄弱
          </label>
          <label className="row small" style={{ gap: 6 }}>
            <input type="checkbox" checked={onlyKey} onChange={(e) => setOnlyKey(e.target.checked)} style={{ accentColor: "var(--accent)" }} />
            只看重点
          </label>
          <div className="row" style={{ marginLeft: "auto", gap: 6, flexWrap: "nowrap", minWidth: 0 }}>
            <Icon name="search" size={16} />
            <input className="input" style={{ width: 180, padding: "5px 8px" }} placeholder="找题型" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜索题型" />
          </div>
        </div>
        <Legend mode={mode} hint={modeInfo.hint} graph={view === "graph"} />
      </div>

      {view === "grid" ? (
        <div className="stack" style={{ gap: 18 }}>
          {(["高数", "线代"] as const).map((pt) => {
            const chapters = data.chapters.filter((c) => c.part === pt && (part === "all" || part === pt));
            if (!chapters.length) return null;
            return (
              <section key={pt} className="stack" style={{ gap: 14 }}>
                <div className="small muted" style={{ letterSpacing: "0.1em", borderBottom: "1px solid var(--rule)", paddingBottom: 4 }}>
                  {pt === "高数" ? "高等数学 · 约 120 分" : "线性代数 · 约 30 分"}
                </div>
                {chapters.map((ch) => {
                  const nodes = ch.nodes.filter(visible);
                  if (!nodes.length) return null;
                  return (
                    <div key={ch.id} className="stack" style={{ gap: 8 }}>
                      <div className="row" style={{ gap: 10 }}>
                        <h3 style={{ fontSize: 15 }}>{ch.name}</h3>
                        <span className="small muted">
                          平均 {pct(ch.avg)} · 已测 {ch.tested}/{ch.total}
                          {ch.weak ? ` · 薄弱 ${ch.weak}` : ""}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(196px, 1fr))", gap: 8 }}>
                        {nodes.map((s) => (
                          <Tile key={s.id} s={s} mode={mode} selected={selected === s.id} onClick={() => setSelected(s.id)} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="panel" style={{ padding: 14 }}>
          <MapGraph states={states} mode={mode} visible={visible} selected={selected} onSelect={setSelected} />
          <p className="small muted" style={{ marginTop: 10 }}>
            左边是地基题型，右边是综合题型，线表示「左边是右边的前置」。红线：前置题型也没掌握，可能是右边题型出错的根因。悬停或选中一个题型，蓝线是它依赖的上游，灰线是依赖它的下游。
          </p>
        </div>
      )}

      {selected ? <NodeDrawer id={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel" style={{ padding: "12px 16px" }}>
      <div className="small muted">{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function Legend({ mode, hint, graph }: { mode: ColorMode; hint: string; graph: boolean }) {
  const items =
    mode === "evidence"
      ? EVIDENCE_LEGEND.map((l) => ({ label: l.label, color: l.color }))
      : mode === "retention"
        ? [
            { label: "记得牢 ≥85%", color: LEVEL_COLOR.good },
            { label: "开始忘 70–85%", color: LEVEL_COLOR.warn },
            { label: "快忘了 <70%", color: LEVEL_COLOR.bad },
          ]
        : [
            { label: "掌握", color: LEVEL_COLOR.good },
            { label: "不稳", color: LEVEL_COLOR.warn },
            { label: "薄弱", color: LEVEL_COLOR.bad },
          ];
  return (
    <div className="row small ink2" style={{ gap: "6px 16px" }}>
      {items.map((i) => (
        <span key={i.label} className="row" style={{ gap: 6 }}>
          <i style={{ width: 14, height: 14, borderRadius: 4, background: `color-mix(in srgb, ${i.color} 18%, var(--surface))`, border: `1.5px solid ${i.color}`, display: "inline-block" }} />
          {i.label}
        </span>
      ))}
      {mode === "mastery" ? (
        <span className="row" style={{ gap: 6 }}>
          <i style={{ width: 14, height: 14, borderRadius: 4, border: "1.5px dashed var(--ink-2)", display: "inline-block" }} />
          证据少
        </span>
      ) : null}
      <span className="row" style={{ gap: 6 }}>
        <i style={{ width: 14, height: 14, borderRadius: 4, border: "1.5px solid var(--rule-strong)", background: "repeating-linear-gradient(135deg, var(--surface) 0 3px, var(--rule-strong) 3px 4px)", display: "inline-block" }} />
        没有数据
      </span>
      {graph ? (
        <span className="row" style={{ gap: 6 }}>
          <i style={{ width: 18, height: 2, background: "var(--bad)", display: "inline-block" }} />
          根因关系
        </span>
      ) : null}
      <span className="muted" style={{ marginLeft: "auto" }}>{hint}</span>
    </div>
  );
}

function Tile({ s, mode, selected, onClick }: { s: NodeState; mode: ColorMode; selected: boolean; onClick: () => void }) {
  const look = tileLook(s, mode);
  const errors = RESULT_DISPLAY.filter((r) => (s.errorCounts[r] ?? 0) > 0);
  const total = errors.reduce((n, r) => n + (s.errorCounts[r] ?? 0), 0);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      aria-label={`${s.name}，${look.value}`}
      className="fade-in"
      style={{
        textAlign: "left",
        cursor: "pointer",
        display: "grid",
        gap: 8,
        padding: "10px 12px",
        borderRadius: 10,
        minWidth: 0,
        border: `1.5px ${look.dashed ? "dashed" : "solid"} ${look.empty ? "var(--rule-strong)" : look.color}`,
        background: look.empty
          ? "repeating-linear-gradient(135deg, var(--surface) 0 7px, var(--surface-3) 7px 8px)"
          : `color-mix(in srgb, ${look.color} 13%, var(--surface))`,
        boxShadow: selected ? "0 0 0 2px var(--accent)" : undefined,
      }}
    >
      <span style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
        <span style={{ fontSize: 13, lineHeight: 1.35, color: "var(--ink)" }}>{s.name}</span>
        <Stars freq={s.freq} />
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <LevelIcon level={look.level} />
        <b style={{ fontSize: 15 }}>{look.value}</b>
        <span className="small muted">{s.count ? `${s.count} 次` : ""}</span>
        {total ? (
          <span style={{ marginLeft: "auto", display: "flex", gap: 2, width: 64, height: 6 }} title={errors.map((r) => `${RESULT_META[r as ResultCode].label} ${s.errorCounts[r]}`).join("，")}>
            {errors.map((r) => (
              <i key={r} style={{ flex: s.errorCounts[r], background: RESULT_COLOR[r], borderRadius: 2 }} />
            ))}
          </span>
        ) : null}
      </span>
    </button>
  );
}
