// 连接：本机模式（数据存在手机里，开箱即用）或连接自己的服务器（可以 AI 分析上传内容）。

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ApiError,
  CORE_VERSION,
  createHttpApi,
  createLocalApi,
  loadSnapshot,
  MemoryStore,
  seedInitialData,
  snapshotOf,
  StudyService,
  toDateStr,
  type Snapshot,
  type StudyApi,
} from "@ps/core";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert } from "react-native";

export interface ConnConfig {
  mode: "local" | "server";
  url: string;
  token: string;
}

const CONN_KEY = "ps.conn";
const LOCAL_KEY = "ps.local.v1";
const DEFAULT: ConnConfig = { mode: "local", url: "", token: "" };

interface ConnState {
  ready: boolean;
  config: ConnConfig;
  api: StudyApi;
  today: string;
  version: number;
  aiEnabled: boolean;
  invalidate: () => void;
  saveConfig: (c: ConnConfig) => Promise<void>;
  resetLocal: () => Promise<void>;
}

const Ctx = createContext<ConnState | null>(null);

async function buildLocalApi(): Promise<StudyApi> {
  const store = new MemoryStore();
  let restored = false;
  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (raw) {
      loadSnapshot(store, JSON.parse(raw) as Snapshot);
      restored = true;
    }
  } catch {
    restored = false;
  }
  const service = new StudyService(store, { server: { aiEnabled: false, demo: true, version: CORE_VERSION } });
  if (!restored) seedInitialData(service, toDateStr(new Date()));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const persist = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(snapshotOf(store))).catch(() => undefined);
    }, 400);
  };
  store.onChange = persist;
  if (!restored) persist();
  return createLocalApi(service);
}

export function ConnProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ConnConfig>(DEFAULT);
  const [api, setApi] = useState<StudyApi | null>(null);
  const [version, setVersion] = useState(0);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [today, setToday] = useState(toDateStr(new Date()));

  const connect = useCallback(async (c: ConnConfig) => {
    const next = c.mode === "server" && c.url ? createHttpApi({ baseUrl: c.url, token: c.token || undefined }) : await buildLocalApi();
    setApi(next);
    setVersion((v) => v + 1);
    next.settings().then((s) => setAiEnabled(s.server.aiEnabled), () => setAiEnabled(false));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(CONN_KEY)
      .then((raw) => (raw ? { ...DEFAULT, ...(JSON.parse(raw) as ConnConfig) } : DEFAULT))
      .catch(() => DEFAULT)
      .then((c) => {
        setConfig(c);
        return connect(c);
      });
    const t = setInterval(() => setToday(toDateStr(new Date())), 60_000);
    return () => clearInterval(t);
  }, [connect]);

  const saveConfig = useCallback(
    async (c: ConnConfig) => {
      setConfig(c);
      await AsyncStorage.setItem(CONN_KEY, JSON.stringify(c)).catch(() => undefined);
      await connect(c);
    },
    [connect],
  );

  const resetLocal = useCallback(async () => {
    await AsyncStorage.removeItem(LOCAL_KEY).catch(() => undefined);
    if (config.mode === "local") await connect(config);
  }, [config, connect]);

  const value = useMemo<ConnState | null>(
    () =>
      api
        ? { ready: true, config, api, today, version, aiEnabled, invalidate: () => setVersion((v) => v + 1), saveConfig, resetLocal }
        : null,
    [api, config, today, version, aiEnabled, saveConfig, resetLocal],
  );
  if (!value) return null;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConn(): ConnState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useConn 必须在 ConnProvider 里使用");
  return v;
}

/** 取数：显示上一次的结果，同时后台刷新 */
export function useQuery<T>(key: string, fn: (api: StudyApi, today: string) => Promise<T>) {
  const { api, today, version } = useConn();
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | undefined>();
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fnRef.current(api, today).then(
      (d) => {
        if (!alive) return;
        setData(d);
        setError(undefined);
        setLoading(false);
      },
      (e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [api, key, today, version]);
  return { data, error, loading };
}

/** 执行修改，成功后刷新所有数据；失败弹窗说明原因 */
export function useAction() {
  const { invalidate } = useConn();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true);
      try {
        const out = await fn();
        invalidate();
        return out;
      } catch (e) {
        const msg = e instanceof ApiError && e.status === 401 ? "服务器需要访问口令，请在设置里填写" : e instanceof Error ? e.message : String(e);
        Alert.alert("操作没有完成", msg);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [invalidate],
  );
  return { run, busy };
}
