// 选择数据来源：连接服务器（正式使用），或演示模式（数据存在浏览器里，不能 AI 分析）。

import {
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

const TOKEN_KEY = "ps.token";
const DEMO_KEY = "ps.demo.v1";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readToken(): string | undefined {
  try {
    return storage()?.getItem(TOKEN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function saveToken(token: string) {
  try {
    storage()?.setItem(TOKEN_KEY, token);
  } catch {
    // 无法保存时只在本次会话有效
  }
}

export const isDemo = __DEMO__;

export function createApi(): StudyApi {
  if (isDemo) return createDemoApi();
  return createHttpApi({ baseUrl: "", token: readToken() });
}

function createDemoApi(): StudyApi {
  const store = new MemoryStore();
  let restored = false;
  try {
    const raw = storage()?.getItem(DEMO_KEY);
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
  store.onChange = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        storage()?.setItem(DEMO_KEY, JSON.stringify(snapshotOf(store)));
      } catch {
        // 存储已满或被禁用：数据只保留到页面关闭
      }
    }, 300);
  };
  return createLocalApi(service);
}

export function resetDemo() {
  try {
    storage()?.removeItem(DEMO_KEY);
  } catch {
    // 忽略
  }
  window.location.reload();
}
