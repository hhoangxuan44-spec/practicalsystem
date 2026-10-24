// 本地日期工具。日期串统一为 YYYY-MM-DD（使用运行环境的本地时区）。

const pad = (n: number) => String(n).padStart(2, "0");

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 解析为本地时区当天 0 点 */
export function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(date: string, n: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** b − a 的天数（按日历日） */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86_400_000);
}

/** ISO 时间串对应的本地日期 */
export function isoToDateStr(iso: string): string {
  return toDateStr(new Date(iso));
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfDay(date: string): Date {
  const d = parseDate(date);
  d.setDate(d.getDate() + 1);
  return new Date(d.getTime() - 1);
}

/** 最近 n 天（含 today），从早到晚 */
export function lastNDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1));
}

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

/** 10月24日 周六 */
export function formatDateCn(date: string, withWeekday = true): string {
  const d = parseDate(date);
  const s = `${d.getMonth() + 1}月${d.getDate()}日`;
  return withWeekday ? `${s} 周${WEEK[d.getDay()]}` : s;
}

/** 把一段时长（毫秒）写成「10 分钟」「3 天」「2 个月」 */
export function formatDuration(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  if (min < 60) return `${min} 分钟`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} 小时`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} 天`;
  const mo = Math.round(d / 30);
  return mo < 12 ? `${mo} 个月` : `${(d / 365).toFixed(1)} 年`;
}
