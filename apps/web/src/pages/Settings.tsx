// 设置：考试日期、每天时间、复习量、外观、服务器状态、数据导入导出。

import type { Settings, SettingsView, Snapshot } from "@ps/core";
import { useEffect, useRef, useState } from "react";
import { ErrorBox, PageHead } from "../components/bits.tsx";
import { Icon } from "../components/Icon.tsx";
import { Modal } from "../components/overlays.tsx";
import { isDemo, readToken, resetDemo, saveToken } from "../lib/api.ts";
import { useAction, useApp, useQuery } from "../lib/app.tsx";
import { readTheme, saveTheme, type ThemeChoice } from "../lib/theme.ts";

export function SettingsPage() {
  const { api } = useApp();
  const { run, busy } = useAction();
  const { data, error } = useQuery<SettingsView>("settings", (a) => a.settings());
  const [f, setF] = useState<Settings | null>(null);
  const [theme, setTheme] = useState<ThemeChoice>(readTheme());
  const [exported, setExported] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data && !f) setF(data.settings);
  }, [data, f]);

  if (!data || !f) return error ? <ErrorBox error={error} /> : <div className="skeleton">正在加载…</div>;
  const server = data.server;
  const dirty = JSON.stringify(f) !== JSON.stringify(data.settings);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setF({ ...f, [k]: v });

  const doExport = async () => {
    const snap = await run(() => api.exportData());
    if (!snap) return;
    setExported(JSON.stringify(snap, null, 1));
  };

  const doImport = async (file: File) => {
    let snap: Snapshot;
    try {
      snap = JSON.parse(await file.text()) as Snapshot;
    } catch {
      await run(() => Promise.reject(new Error("文件不是有效的 JSON")));
      return;
    }
    await run(() => api.importData(snap), "已导入");
  };

  return (
    <>
      <PageHead title="设置" sub="这些设置会影响训练计划和记忆复习的安排。" />
      <section className="split">
        <div className="panel stack" style={{ gap: 16 }}>
          <div className="panel-head" style={{ marginBottom: 0 }}><h2>备考</h2></div>
          <label className="field">
            <span>考试日期（初试第一天，以官方公布为准）</span>
            <input className="input" type="date" value={f.examDate} onChange={(e) => set("examDate", e.target.value)} />
          </label>
          <div className="field">
            <span>每天给数学的时间：{f.dailyMinutes} 分钟（约 {(f.dailyMinutes / 60).toFixed(1)} 小时）</span>
            <input type="range" min={60} max={600} step={30} value={f.dailyMinutes} onChange={(e) => set("dailyMinutes", Number(e.target.value))} style={{ accentColor: "var(--accent)" }} />
          </div>
          <div className="grid-2">
            <label className="field">
              <span>每天新卡上限</span>
              <input className="input" type="number" min={0} max={200} value={f.newCardsPerDay} onChange={(e) => set("newCardsPerDay", Number(e.target.value))} />
            </label>
            <label className="field">
              <span>每天复习上限</span>
              <input className="input" type="number" min={10} max={1000} value={f.maxReviewsPerDay} onChange={(e) => set("maxReviewsPerDay", Number(e.target.value))} />
            </label>
          </div>
          <label className="field">
            <span>正在用的强化书或课程（上传时作为来源建议）</span>
            <input className="input" placeholder="如：张宇强化 36 讲" value={f.book ?? ""} onChange={(e) => set("book", e.target.value || undefined)} />
          </label>
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <button className="btn" disabled={!dirty} onClick={() => setF(data.settings)}>还原</button>
            <button className="btn primary" disabled={!dirty || busy} onClick={() => run(() => api.updateSettings(f), "已保存，今天的计划会重新安排")}>保存</button>
          </div>
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="panel stack" style={{ gap: 10 }}>
            <div className="panel-head" style={{ marginBottom: 0 }}><h2>外观</h2></div>
            <div className="seg" role="group" aria-label="外观">
              {([
                ["system", "跟随系统"],
                ["light", "浅色"],
                ["dark", "深色"],
              ] as [ThemeChoice, string][]).map(([k, l]) => (
                <button
                  key={k}
                  aria-pressed={theme === k}
                  onClick={() => {
                    setTheme(k);
                    saveTheme(k);
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="panel stack" style={{ gap: 10 }}>
            <div className="panel-head" style={{ marginBottom: 0 }}><h2>连接状态</h2></div>
            <Row label="模式" value={isDemo ? "演示版（数据在本浏览器）" : "服务器"} />
            <Row label="AI 自动分析" value={server.aiEnabled ? `已开启 · ${server.model ?? ""}` : "未开启"} />
            <Row label="版本" value={server.version} />
            {!server.aiEnabled && !isDemo ? (
              <p className="small muted">在服务器上设置环境变量 ANTHROPIC_API_KEY 后重启，就能自动分析上传的内容。</p>
            ) : null}
            {!isDemo ? <TokenField /> : null}
          </div>

          <div className="panel stack" style={{ gap: 10 }}>
            <div className="panel-head" style={{ marginBottom: 0 }}><h2>数据</h2></div>
            <p className="small muted">导出全部记录（题目、卡片、复习历史、设置）为 JSON，可以备份或迁移到另一台服务器。</p>
            <div className="row">
              <button className="btn" onClick={doExport}><Icon name="external" size={15} />导出</button>
              <button className="btn" onClick={() => fileRef.current?.click()}><Icon name="upload" size={15} />导入</button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
              {isDemo ? <button className="btn danger" onClick={() => setConfirmReset(true)}>重置演示数据</button> : null}
            </div>
          </div>
        </div>
      </section>

      {exported ? (
        <Modal
          title="导出的数据"
          wide
          onClose={() => setExported(null)}
          footer={
            <button
              className="btn primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(exported);
                  setExported(null);
                } catch {
                  document.getElementById("export-text")?.focus();
                }
              }}
            >
              复制
            </button>
          }
        >
          <p className="small muted">复制下面的内容保存成 .json 文件。导入时选择这个文件。</p>
          <textarea id="export-text" className="textarea mono" style={{ minHeight: 260 }} readOnly value={exported} onFocus={(e) => e.currentTarget.select()} />
        </Modal>
      ) : null}
      {confirmReset ? (
        <Modal
          title="重置演示数据？"
          onClose={() => setConfirmReset(false)}
          footer={
            <>
              <button className="btn" onClick={() => setConfirmReset(false)}>取消</button>
              <button className="btn primary" style={{ background: "var(--bad)", borderColor: "var(--bad)", color: "#fff" }} onClick={resetDemo}>重置</button>
            </>
          }
        >
          <p className="ink2">清掉你在演示版里做的所有操作，恢复到初始的 2021、2022 真题数据。</p>
        </Modal>
      ) : null}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="row between">
      <span className="muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function TokenField() {
  const [token, setToken] = useState(readToken() ?? "");
  return (
    <label className="field">
      <span>访问口令（服务器设置了 ACCESS_TOKEN 时填写）</span>
      <div className="row" style={{ flexWrap: "nowrap" }}>
        <input className="input" type="password" value={token} onChange={(e) => setToken(e.target.value)} />
        <button
          className="btn"
          onClick={() => {
            saveToken(token.trim());
            window.location.reload();
          }}
        >
          保存
        </button>
      </div>
    </label>
  );
}
