import { daysBetween, formatDateCn, type DashboardView } from "@ps/core";
import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "./components/CommandPalette.tsx";
import { Icon, type IconName } from "./components/Icon.tsx";
import { Modal, Toasts } from "./components/overlays.tsx";
import { isDemo, saveToken } from "./lib/api.ts";
import { useApp, useInterval, useQuery } from "./lib/app.tsx";
import { navigate, useRoute, type Route } from "./lib/router.ts";
import { CardsPage } from "./pages/Cards.tsx";
import { DiagnosisPage } from "./pages/Diagnosis.tsx";
import { EntryPage } from "./pages/Entry.tsx";
import { JournalPage } from "./pages/Journal.tsx";
import { MapPage } from "./pages/Map.tsx";
import { NodePage } from "./pages/Node.tsx";
import { ReportsPage } from "./pages/Reports.tsx";
import { ReviewPage } from "./pages/Review.tsx";
import { SettingsPage } from "./pages/Settings.tsx";
import { TodayPage } from "./pages/Today.tsx";
import { UploadPage } from "./pages/Upload.tsx";

const NAV: { route: Route["name"]; label: string; icon: IconName }[] = [
  { route: "today", label: "今日", icon: "today" },
  { route: "upload", label: "上传", icon: "upload" },
  { route: "map", label: "能力地图", icon: "map" },
  { route: "review", label: "记忆复习", icon: "review" },
  { route: "diagnosis", label: "薄弱点", icon: "diagnosis" },
  { route: "journal", label: "学习记录", icon: "journal" },
  { route: "cards", label: "卡片库", icon: "cards" },
  { route: "reports", label: "报告", icon: "reports" },
  { route: "settings", label: "设置", icon: "settings" },
];

/** 子页面归属的导航项 */
function section(r: Route): Route["name"] {
  if (r.name === "node") return "map";
  if (r.name === "entry") return "journal";
  return r.name;
}

export function App() {
  const route = useRoute();
  const { boot, today, invalidate, needToken } = useApp();
  const [palette, setPalette] = useState(false);
  const [more, setMore] = useState(false);
  const dash = useQuery<DashboardView>("dashboard", (api, t) => api.dashboard(t));

  // 有内容在分析时，每 2.5 秒刷新一次
  useInterval(invalidate, dash.data?.processing.length ? 2500 : null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const current = section(route);
  const due = dash.data ? dash.data.review.due + dash.data.review.fresh : 0;
  const processing = dash.data?.processing.length ?? 0;
  const examDate = boot?.settings.examDate;
  const daysLeft = examDate ? daysBetween(today, examDate) : null;

  let page: ReactNode;
  switch (route.name) {
    case "today": page = <TodayPage />; break;
    case "upload": page = <UploadPage />; break;
    case "map": page = <MapPage />; break;
    case "node": page = <NodePage id={route.id} />; break;
    case "review": page = <ReviewPage />; break;
    case "cards": page = <CardsPage />; break;
    case "diagnosis": page = <DiagnosisPage />; break;
    case "journal": page = <JournalPage />; break;
    case "entry": page = <EntryPage id={route.id} />; break;
    case "reports": page = <ReportsPage />; break;
    case "settings": page = <SettingsPage />; break;
  }

  return (
    <div className="shell">
      <nav className="nav" aria-label="主导航">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">数</div>
          <div>
            <div className="brand-name">数二备考</div>
            <div className="brand-sub">评估 · 记忆 · 训练</div>
          </div>
        </div>
        {NAV.map((n) => (
          <button key={n.route} className="nav-link" aria-current={current === n.route ? "page" : undefined} onClick={() => navigate({ name: n.route } as Route)}>
            <Icon name={n.icon} />
            {n.label}
            {n.route === "review" && due ? <span className="count">{due}</span> : null}
            {n.route === "journal" && processing ? <span className="count">{processing}</span> : null}
          </button>
        ))}
        <div className="nav-foot">
          <button className="btn sm" onClick={() => setPalette(true)} style={{ justifyContent: "space-between" }}>
            <span className="row" style={{ gap: 6 }}><Icon name="search" size={14} />快速跳转</span>
            <span className="kbd">⌘K</span>
          </button>
          <span>{isDemo ? "演示版 · 数据存在本浏览器" : boot?.server.aiEnabled ? `AI 已连接 · ${boot.server.model ?? ""}` : "AI 未配置"}</span>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <div className="countdown">
            <span className="muted small">距考试</span>
            <b className="num">{daysLeft ?? "—"}</b>
            <span className="muted small">天</span>
          </div>
          {dash.data ? <span className="badge accent">{dash.data.phase.label}</span> : null}
          {dash.data && dash.data.streak > 0 ? (
            <span className="badge" title="连续有学习记录的天数">
              <Icon name="flame" size={13} />连续 {dash.data.streak} 天
            </span>
          ) : null}
          {processing ? (
            <button className="badge accent" style={{ border: 0, cursor: "pointer" }} onClick={() => navigate({ name: "entry", id: dash.data!.processing[0].id })}>
              <Icon name="sparkle" size={13} />
              {dash.data!.processing[0].progress ?? "正在分析"}
            </button>
          ) : null}
          <span className="grow" />
          <span className="small muted" style={{ display: "none" }}>{formatDateCn(today)}</span>
          <button className="icon-btn" onClick={() => setPalette(true)} aria-label="快速跳转">
            <Icon name="search" />
          </button>
          <button className="btn primary sm" onClick={() => navigate({ name: "upload" })}>
            <Icon name="upload" size={15} />
            上传
          </button>
        </header>
        {isDemo ? (
          <div className="notice" style={{ margin: "12px max(16px, env(safe-area-inset-right, 0px)) 0 max(16px, env(safe-area-inset-left, 0px))", borderRadius: 8 }}>
            演示版：已载入你的 2021、2022 真题判卷结果，可以随意操作，数据只存在这个浏览器里。AI 自动分析上传内容需要部署服务器后使用。
          </div>
        ) : null}
        <main className="content" key={route.name + ("id" in route ? route.id : "")}>
          {page}
        </main>
      </div>

      <nav className="tabbar" aria-label="底部导航">
        {([
          ["today", "今日", "today"],
          ["map", "地图", "map"],
          ["upload", "上传", "upload"],
          ["review", "复习", "review"],
        ] as const).map(([r, label, icon]) => (
          <button key={r} aria-current={current === r ? "page" : undefined} onClick={() => navigate({ name: r } as Route)}>
            {r === "upload" ? (
              <span className="fab"><Icon name="plus" size={22} /></span>
            ) : (
              <Icon name={icon} size={20} />
            )}
            {r === "upload" ? null : label}
          </button>
        ))}
        <button aria-current={["diagnosis", "journal", "cards", "reports", "settings"].includes(current) ? "page" : undefined} onClick={() => setMore(true)}>
          <Icon name="more" size={20} />
          更多
        </button>
      </nav>

      {more ? (
        <Modal title="更多" onClose={() => setMore(false)}>
          <div className="stack" style={{ gap: 4 }}>
            {NAV.filter((n) => !["today", "map", "upload", "review"].includes(n.route)).map((n) => (
              <button
                key={n.route}
                className="nav-link"
                aria-current={current === n.route ? "page" : undefined}
                onClick={() => {
                  setMore(false);
                  navigate({ name: n.route } as Route);
                }}
              >
                <Icon name={n.icon} />
                {n.label}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
      {palette ? <CommandPalette onClose={() => setPalette(false)} /> : null}
      {needToken ? <TokenDialog /> : null}
      <Toasts />
    </div>
  );
}

function TokenDialog() {
  const [token, setToken] = useState("");
  return (
    <Modal
      title="需要访问口令"
      onClose={() => undefined}
      footer={
        <button
          className="btn primary"
          disabled={!token.trim()}
          onClick={() => {
            saveToken(token.trim());
            window.location.reload();
          }}
        >
          保存并重新连接
        </button>
      }
    >
      <p className="ink2">服务器设置了访问口令（ACCESS_TOKEN）。填写后会保存在这个浏览器里。</p>
      <label className="field">
        <span>访问口令</span>
        <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} autoFocus />
      </label>
    </Modal>
  );
}
