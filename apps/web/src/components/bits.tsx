// 小组件：作答结果标签、掌握度徽章、考频星级、题型链接、进度条、空状态。

import { FREQ_LABEL, getNode, RESULT_META, type Level, type ResultCode, type TopicNode } from "@ps/core";
import type { ReactNode } from "react";
import { LEVEL_COLOR, LEVEL_LABEL, pct, RESULT_COLOR } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";
import { Icon } from "./Icon.tsx";

export function ResultChip({ result }: { result: ResultCode }) {
  return (
    <span className="chip result" style={{ ["--c" as string]: RESULT_COLOR[result] }}>
      <span className="dot" />
      {RESULT_META[result].label}
    </span>
  );
}

export const LEVEL_PATH: Record<Level, string> = {
  good: "M5 12.5l4.5 4.5L19 7.5",
  warn: "M12 6v7M12 17.5v.5",
  bad: "M7 7l10 10M17 7 7 17",
  none: "M7 12h10",
};

/** SVG 里用的掌握度图标（直径 16） */
export function SvgLevelIcon({ level, x, y }: { level: Level; x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} aria-hidden="true">
      <circle cx={8} cy={8} r={8} fill={LEVEL_COLOR[level]} />
      <g transform="translate(3,3) scale(0.42)" fill="none" stroke={level === "warn" ? "#141b2d" : "#ffffff"} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
        <path d={LEVEL_PATH[level]} />
      </g>
    </g>
  );
}

/** 掌握度：颜色 + 图标 + 文字，不只靠颜色区分 */
export function LevelIcon({ level, size = 16 }: { level: Level; size?: number }) {
  return (
    <span className={`level-icon ${level}`} style={{ ["--c" as string]: LEVEL_COLOR[level], width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round">
        <path d={LEVEL_PATH[level]} />
      </svg>
    </span>
  );
}

export function LevelBadge({ level, mastery, showValue = true }: { level: Level; mastery?: number | null; showValue?: boolean }) {
  return (
    <span className="level">
      <LevelIcon level={level} />
      <span>{LEVEL_LABEL[level]}</span>
      {showValue && mastery !== undefined && mastery !== null ? <b className="num" style={{ color: "var(--ink)" }}>{pct(mastery)}</b> : null}
    </span>
  );
}

export function Stars({ freq }: { freq: TopicNode["freq"] }) {
  const label = freq === 3 ? "几乎每年考" : freq === 2 ? "常考" : "偶尔考";
  return (
    <span className="stars" title={label} aria-label={label}>
      {FREQ_LABEL[freq]}
    </span>
  );
}

export function NodeLink({ id, compact }: { id: string; compact?: boolean }) {
  const node = getNode(id);
  if (!node) return null;
  return (
    <button type="button" className="chip link" onClick={() => navigate({ name: "node", id })} title={node.name}>
      {compact && node.name.length > 10 ? node.name.slice(0, 10) + "…" : node.name}
    </button>
  );
}

export function Meter({ value, color, label }: { value: number | null; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(1, value ?? 0));
  return (
    <div className="meter" style={{ ["--c" as string]: color ?? "var(--accent)" }} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <i style={{ width: `${v * 100}%` }} />
    </div>
  );
}

export function Empty({ title, children, icon = "sparkle" }: { title: string; children?: ReactNode; icon?: Parameters<typeof Icon>[0]["name"] }) {
  return (
    <div className="empty">
      <Icon name={icon} size={28} />
      <strong>{title}</strong>
      {children ? <div>{children}</div> : null}
    </div>
  );
}

export function ErrorBox({ error }: { error?: Error }) {
  if (!error) return null;
  return <div className="notice">{error.message}</div>;
}

export function PageHead({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div className="row">{actions}</div> : null}
    </header>
  );
}
