import { addDays, formatDateCn, type CardKind, type Level, type ResultCode } from "@ps/core";

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(Math.round(v * 100)));

export const LEVEL_LABEL: Record<Level, string> = { good: "掌握", warn: "不稳", bad: "薄弱", none: "未测" };
export const LEVEL_COLOR: Record<Level, string> = { good: "var(--good)", warn: "var(--warn)", bad: "var(--bad)", none: "var(--none)" };

/** 图表和图例里作答结果的固定顺序（颜色按这个顺序分配，已做色盲校验） */
export const RESULT_DISPLAY: ResultCode[] = ["ok", "calc", "method", "concept", "partial", "blank"];
export const RESULT_COLOR: Record<ResultCode, string> = {
  ok: "var(--r-ok)",
  calc: "var(--r-calc)",
  method: "var(--r-method)",
  concept: "var(--r-concept)",
  partial: "var(--r-partial)",
  blank: "var(--r-blank)",
};

export const CARD_KIND_LABEL: Record<CardKind, string> = { formula: "公式", method: "方法", pitfall: "易错", redo: "重做" };

export const CONFIDENCE_LABEL = { none: "无记录", low: "证据少", medium: "证据一般", high: "证据充分" } as const;

export function dateLabel(date: string, today: string): string {
  if (date === today) return "今天";
  if (date === addDays(today, -1)) return "昨天";
  return formatDateCn(date);
}

export function fileSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function signed(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const n = Math.round(v * 100);
  return n > 0 ? `+${n}` : String(n);
}
