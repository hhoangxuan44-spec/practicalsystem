// 外观：跟随系统 / 浅色 / 深色，保存在本浏览器。

export type ThemeChoice = "system" | "light" | "dark";
const KEY = "ps.theme";

export function readTheme(): ThemeChoice {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(t: ThemeChoice) {
  const root = document.documentElement;
  if (t === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
}

export function saveTheme(t: ThemeChoice) {
  applyTheme(t);
  try {
    window.localStorage.setItem(KEY, t);
  } catch {
    // 无法保存时只在本次生效
  }
}
