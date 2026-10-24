// 极简路由：用 #token 记录当前页面（演示版发布后只支持字母、数字和 . _ ~ - 组成的锚点）。
import { useEffect, useState } from "react";

export type Route =
  | { name: "today" }
  | { name: "upload" }
  | { name: "map" }
  | { name: "node"; id: string }
  | { name: "review" }
  | { name: "cards" }
  | { name: "diagnosis" }
  | { name: "journal" }
  | { name: "entry"; id: string }
  | { name: "reports" }
  | { name: "settings" };

const SIMPLE = ["today", "upload", "map", "review", "cards", "diagnosis", "journal", "reports", "settings"] as const;

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, "");
  const [name, id] = h.split(".");
  if ((name === "node" || name === "entry") && id) return { name, id };
  if ((SIMPLE as readonly string[]).includes(name)) return { name } as Route;
  return { name: "today" };
}

export function routeToHash(r: Route): string {
  return "#" + ("id" in r ? `${r.name}.${r.id}` : r.name);
}

let current: Route = typeof window === "undefined" ? { name: "today" } : parseHash(window.location.hash);
const listeners = new Set<(r: Route) => void>();

export function navigate(r: Route) {
  current = r;
  const hash = routeToHash(r);
  if (window.location.hash !== hash) {
    try {
      window.history.pushState(null, "", hash);
    } catch {
      window.location.hash = hash;
    }
  }
  listeners.forEach((l) => l(r));
  window.scrollTo({ top: 0 });
}

if (typeof window !== "undefined") {
  window.addEventListener("hashchange", () => {
    current = parseHash(window.location.hash);
    listeners.forEach((l) => l(current));
  });
  window.addEventListener("popstate", () => {
    current = parseHash(window.location.hash);
    listeners.forEach((l) => l(current));
  });
}

export function useRoute(): Route {
  const [r, setR] = useState(current);
  useEffect(() => {
    listeners.add(setR);
    return () => {
      listeners.delete(setR);
    };
  }, []);
  return r;
}
