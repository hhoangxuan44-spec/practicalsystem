// 全局状态：API、启动数据、今天的日期、数据版本（任何修改后让页面重新取数）、提示条。

import { ApiError, toDateStr, type BootstrapView, type StudyApi } from "@ps/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export interface Toast {
  id: number;
  message: string;
  tone?: "error";
  action?: { label: string; run: () => void };
}

interface AppState {
  api: StudyApi;
  boot: BootstrapView | null;
  today: string;
  version: number;
  invalidate: () => void;
  toast: (message: string, opts?: Omit<Toast, "id" | "message">) => void;
  toasts: Toast[];
  needToken: boolean;
  setNeedToken: (v: boolean) => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ api, children }: { api: StudyApi; children: ReactNode }) {
  const [boot, setBoot] = useState<BootstrapView | null>(null);
  const [version, setVersion] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [needToken, setNeedToken] = useState(false);
  const [today, setToday] = useState(() => toDateStr(new Date()));
  const seq = useRef(0);

  const invalidate = useCallback(() => setVersion((v) => v + 1), []);
  const toast = useCallback((message: string, opts?: Omit<Toast, "id" | "message">) => {
    const id = ++seq.current;
    setToasts((t) => [...t.slice(-2), { id, message, ...opts }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), opts?.action ? 6000 : 3200);
  }, []);

  // 跨过午夜时自动切到新的一天
  useEffect(() => {
    const t = setInterval(() => setToday(toDateStr(new Date())), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    api.bootstrap(today).then(setBoot, (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) setNeedToken(true);
      else toast(e instanceof Error ? e.message : String(e), { tone: "error" });
    });
  }, [api, today, version, toast]);

  const value = useMemo(
    () => ({ api, boot, today, version, invalidate, toast, toasts, needToken, setNeedToken }),
    [api, boot, today, version, invalidate, toast, toasts, needToken],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp 必须在 AppProvider 里使用");
  return v;
}

const cache = new Map<string, unknown>();

/** 取数：先显示缓存，再后台刷新；数据版本变化时自动重新取 */
export function useQuery<T>(key: string, fn: (api: StudyApi, today: string) => Promise<T>) {
  const { api, today, version, setNeedToken } = useApp();
  const fullKey = `${key}|${today}`;
  const [data, setData] = useState<T | undefined>(() => cache.get(fullKey) as T | undefined);
  const [error, setError] = useState<Error | undefined>();
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    if (cache.has(fullKey)) setData(cache.get(fullKey) as T);
    fnRef.current(api, today).then(
      (d) => {
        if (!alive) return;
        cache.set(fullKey, d);
        setData(d);
        setError(undefined);
        setLoading(false);
      },
      (e: unknown) => {
        if (!alive) return;
        if (e instanceof ApiError && e.status === 401) setNeedToken(true);
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [api, fullKey, today, version, setNeedToken]);

  return { data, error, loading };
}

/** 执行一个修改操作：成功后刷新所有页面数据，失败时弹出原因 */
export function useAction() {
  const { invalidate, toast, setNeedToken } = useApp();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>, success?: string): Promise<T | undefined> => {
      setBusy(true);
      try {
        const out = await fn();
        invalidate();
        if (success) toast(success);
        return out;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) setNeedToken(true);
        toast(e instanceof Error ? e.message : String(e), { tone: "error" });
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [invalidate, toast, setNeedToken],
  );
  return { run, busy };
}

export function useInterval(cb: () => void, ms: number | null) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (ms === null) return;
    const t = setInterval(() => ref.current(), ms);
    return () => clearInterval(t);
  }, [ms]);
}
