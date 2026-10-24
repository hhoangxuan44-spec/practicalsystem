let counter = 0;

/** 生成短 id。不依赖 crypto，React Native 里也能用。 */
export function newId(prefix: string): string {
  counter = (counter + 1) % 1296;
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36).padStart(2, "0")}${rand}`;
}

/** 题目出处归一化，用来匹配同一道题：「2022 年第 14 题」「2022-14」都变成 2022-14 */
export function normalizeRef(ref: string): string {
  const s = ref.replace(/\s+/g, "").replace(/[（(].*?[)）]/g, "");
  const m = s.match(/(20\d{2})[^0-9]*?(?:第)?(\d{1,2})(?:题)?$/);
  if (m) return `${m[1]}-${Number(m[2])}`;
  return s.toLowerCase();
}
