// 上传：拖入或粘贴照片、PDF，写一句说明，交给 AI 识别评估。没有 AI 时可以手动补记录。

import { addDays, RESULT_META, type BootstrapView, type EntryListItem, type ManualAttemptInput, type ProblemKind, type ResultCode, type UploadFile } from "@ps/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { ErrorBox, PageHead } from "../components/bits.tsx";
import { Icon } from "../components/Icon.tsx";
import { NodePicker } from "../components/NodePicker.tsx";
import { isDemo } from "../lib/api.ts";
import { useAction, useApp, useQuery } from "../lib/app.tsx";
import { dateLabel, fileSize, RESULT_DISPLAY, RESULT_COLOR } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";
import { StatusBadge } from "./Today.tsx";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.md,.txt";
const MAX_FILE = 25 * 1024 * 1024;

interface Picked {
  id: string;
  file: File;
  preview?: string;
}

export function UploadPage() {
  const { api, today, boot, toast } = useApp();
  const { run, busy } = useAction();
  const [files, setFiles] = useState<Picked[]>([]);
  const [date, setDate] = useState(today);
  const [source, setSource] = useState("");
  const [text, setText] = useState("");
  const [drag, setDrag] = useState(false);
  const [mode, setMode] = useState<"upload" | "manual">("upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const entries = useQuery<EntryListItem[]>("entries", (a) => a.entries());
  const aiReady = !!boot?.server.aiEnabled;

  const addFiles = (list: FileList | File[]) => {
    const next: Picked[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_FILE) {
        toast(`「${f.name}」超过 25MB，请压缩或拆开`, { tone: "error" });
        continue;
      }
      if (/heic|heif/i.test(f.type) || /\.hei[cf]$/i.test(f.name)) {
        toast(`「${f.name}」是 iPhone 的 HEIC 格式，请在相机设置里选「兼容性最佳」，或截图后上传`, { tone: "error" });
        continue;
      }
      next.push({ id: `${f.name}-${f.size}-${f.lastModified}-${Math.random()}`, file: f, preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined });
    }
    setFiles((cur) => [...cur, ...next]);
  };

  // 支持直接粘贴截图
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.files ?? []);
      if (items.length) {
        e.preventDefault();
        addFiles(items);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  // 离开页面时释放预览图占用的内存
  const filesRef = useRef(files);
  filesRef.current = files;
  useEffect(() => () => filesRef.current.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)), []);
  const removeFile = (p: Picked) => {
    if (p.preview) URL.revokeObjectURL(p.preview);
    setFiles((cur) => cur.filter((x) => x.id !== p.id));
  };

  const sources = useMemo(() => suggestSources(entries.data ?? [], boot), [entries.data, boot]);

  const submit = async () => {
    const upload: UploadFile[] = [];
    for (const p of files) {
      upload.push({ name: p.file.name, type: p.file.type, size: p.file.size, blob: p.file, dataUrl: isDemo && p.file.size < 600_000 && p.preview ? await toDataUrl(p.file) : undefined });
    }
    const entry = await run(() => api.createEntry({ date, source: source.trim() || undefined, text: text.trim() || undefined }, upload));
    if (entry) {
      files.forEach((p) => p.preview && URL.revokeObjectURL(p.preview));
      setFiles([]);
      setText("");
      navigate({ name: "entry", id: entry.id });
    }
  };

  return (
    <>
      <PageHead
        title="上传学习内容"
        sub="把今天做的题（手写过程的照片或 PDF，最好连答案页一起）、笔记或一段说明放上来。系统会识别每道题、判定对错和错因、归到题型、生成记忆卡，再更新你的能力地图。"
        actions={
          <div className="seg" role="group" aria-label="上传方式">
            <button aria-pressed={mode === "upload"} onClick={() => setMode("upload")}>上传文件</button>
            <button aria-pressed={mode === "manual"} onClick={() => setMode("manual")}>手动补一条</button>
          </div>
        }
      />
      {!aiReady && mode === "upload" ? (
        <div className="notice">
          {isDemo
            ? "演示版不能调用 AI：上传的内容会保存下来，但不会自动分析。可以用「手动补一条」体验记录如何影响地图和计划。"
            : "服务器还没有配置 AI（ANTHROPIC_API_KEY），上传的内容会先保存，配置后在记录页点「重新分析」即可。"}
        </div>
      ) : null}

      {mode === "upload" ? (
        <section className="split">
          <div className="panel stack" style={{ gap: 16 }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                addFiles(e.dataTransfer.files);
              }}
              style={{
                border: `2px dashed ${drag ? "var(--accent)" : "var(--rule-strong)"}`,
                background: drag ? "var(--accent-soft)" : "var(--surface-2)",
                borderRadius: 12,
                padding: "34px 16px",
                display: "grid",
                justifyItems: "center",
                gap: 8,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              <Icon name="upload" size={30} />
              <b>拖入照片或 PDF，或点击选择</b>
              <span className="small muted">也可以直接 Ctrl+V 粘贴截图 · 支持 JPG、PNG、WEBP、PDF、TXT，单个不超过 25MB</span>
              <input ref={inputRef} type="file" multiple accept={ACCEPT} hidden onChange={(e) => e.target.files && addFiles(e.target.files)} />
            </div>

            {files.length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                {files.map((p) => (
                  <div key={p.id} style={{ border: "1px solid var(--rule)", borderRadius: 10, overflow: "hidden", background: "var(--surface)", position: "relative" }}>
                    {p.preview ? (
                      <img src={p.preview} alt={p.file.name} style={{ width: "100%", height: 96, objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ height: 96, display: "grid", placeItems: "center", background: "var(--surface-2)" }}>
                        <Icon name="file" size={30} />
                      </div>
                    )}
                    <div style={{ padding: "6px 8px" }}>
                      <div className="small" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.file.name}>{p.file.name}</div>
                      <div className="small muted">{fileSize(p.file.size)}</div>
                    </div>
                    <button className="icon-btn" aria-label={`移除 ${p.file.name}`} style={{ position: "absolute", top: 4, right: 4, background: "var(--surface)" }} onClick={() => removeFile(p)}>
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid-2">
              <label className="field">
                <span>学习日期</span>
                <div className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
                  <input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} />
                  <button className="btn sm" onClick={() => setDate(today)}>今天</button>
                  <button className="btn sm" onClick={() => setDate(addDays(today, -1))}>昨天</button>
                </div>
              </label>
              <label className="field">
                <span>资料来源（可不填，AI 会自己判断）</span>
                <input className="input" list="source-suggest" placeholder="如：2023 数二真题、张宇强化 第 5 讲" value={source} onChange={(e) => setSource(e.target.value)} />
                <datalist id="source-suggest">
                  {sources.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
            </div>
            <label className="field">
              <span>补充说明</span>
              <textarea className="textarea" placeholder="例如：做了第 5 讲例题 1-12，第 7、9 题不会；最后一页是答案。" value={text} onChange={(e) => setText(e.target.value)} />
            </label>
            <div className="row between">
              <span className="small muted">{files.length ? `${files.length} 个文件` : "可以只写说明，不传文件"}</span>
              <button className="btn primary lg" disabled={busy || (!files.length && !text.trim())} onClick={submit}>
                <Icon name="sparkle" size={16} />
                {aiReady ? "上传并分析" : "上传保存"}
              </button>
            </div>
          </div>

          <div className="stack" style={{ gap: 18 }}>
            <div className="panel">
              <div className="panel-head"><h2>上传后会发生什么</h2></div>
              <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }} className="ink2">
                <li>识别材料里你做过的每道题和你的答案</li>
                <li>对照答案页（没有就由 AI 自己解）判定对错</li>
                <li>写出错在哪一步：计算失误、方法错、概念不清…</li>
                <li>归到 49 个题型里，更新掌握度和能力地图</li>
                <li>为每道错题生成记忆卡和重做提醒</li>
                <li>写今天的总结，调整明天的训练计划</li>
              </ol>
            </div>
            <RecentList entries={entries.data} today={today} />
          </div>
        </section>
      ) : (
        <section className="split">
          <ManualForm />
          <div className="panel">
            <div className="panel-head"><h2>什么时候用手动记录</h2></div>
            <p className="ink2">服务器没有配置 AI，或者想快速补一条结果时。判定请以答案为准：做对、计算失误、方法错、概念不清、没做完、空白。手动记录和 AI 识别走同一条通道，同样会更新掌握度、生成重做提醒。</p>
          </div>
        </section>
      )}
    </>
  );
}

function RecentList({ entries, today }: { entries?: EntryListItem[]; today: string }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>最近上传</h2>
      </div>
      {entries?.length ? (
        <div className="stack" style={{ gap: 2 }}>
          {entries.slice(0, 6).map((e) => (
            <button key={e.id} className="nav-link" onClick={() => navigate({ name: "entry", id: e.id })}>
              <span style={{ display: "grid", minWidth: 0 }}>
                <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</span>
                <span className="small muted">{dateLabel(e.date, today)}</span>
              </span>
              <StatusBadge status={e.status} progress={e.progress} />
            </button>
          ))}
        </div>
      ) : (
        <p className="small muted">还没有上传记录。</p>
      )}
    </div>
  );
}

const KINDS: ProblemKind[] = ["选择", "填空", "解答", "例题", "练习"];

function ManualForm() {
  const { api, today } = useApp();
  const { run, busy } = useAction();
  const blank: ManualAttemptInput = { date: today, ref: "", kind: "例题", nodeIds: [], result: "ok", mine: "", answer: "", diagnosis: "" };
  const [f, setF] = useState<ManualAttemptInput>(blank);
  const [error, setError] = useState<Error>();
  const set = <K extends keyof ManualAttemptInput>(k: K, v: ManualAttemptInput[K]) => setF((cur) => ({ ...cur, [k]: v }));

  const submit = async () => {
    if (!f.ref.trim()) return setError(new Error("请填写题目出处，如「张宇强化 例5.3」「2023-17」"));
    if (!f.nodeIds.length) return setError(new Error("请选择题型"));
    setError(undefined);
    const out = await run(() => api.addManualAttempt(f), "已记录，地图和计划已更新");
    if (out) setF({ ...blank, kind: f.kind, date: f.date });
  };

  return (
    <div className="panel stack" style={{ gap: 14 }}>
      <div className="grid-2">
        <label className="field">
          <span>题目出处</span>
          <input className="input" placeholder="如：张宇强化 例5.3、2023-17" value={f.ref} onChange={(e) => set("ref", e.target.value)} />
        </label>
        <label className="field">
          <span>日期</span>
          <input className="input" type="date" value={f.date} max={today} onChange={(e) => set("date", e.target.value || today)} />
        </label>
      </div>
      <div className="field">
        <span>题目类型</span>
        <div className="seg" role="group" aria-label="题目类型">
          {KINDS.map((k) => (
            <button key={k} aria-pressed={f.kind === k} onClick={() => set("kind", k)}>{k}</button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>结果（对照答案）</span>
        <div className="row" style={{ gap: 6 }}>
          {RESULT_DISPLAY.map((r: ResultCode) => (
            <button
              key={r}
              className="chip link"
              aria-pressed={f.result === r}
              onClick={() => set("result", r)}
              style={f.result === r ? { borderColor: "var(--accent)", background: "var(--accent-soft)", color: "var(--ink)" } : undefined}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: RESULT_COLOR[r], display: "inline-block" }} />
              {RESULT_META[r].label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span>题型</span>
        <NodePicker value={f.nodeIds} onChange={(v) => set("nodeIds", v)} />
      </div>
      <div className="grid-2">
        <label className="field">
          <span>你的答案</span>
          <input className="input" value={f.mine} onChange={(e) => set("mine", e.target.value)} />
        </label>
        <label className="field">
          <span>标准答案</span>
          <input className="input" value={f.answer} onChange={(e) => set("answer", e.target.value)} />
        </label>
      </div>
      <label className="field">
        <span>错在哪（可不填）</span>
        <input className="input" placeholder="如：θ 范围定错，应为 [0, π/4]" value={f.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} />
      </label>
      <ErrorBox error={error} />
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn primary" disabled={busy} onClick={submit}>记录</button>
      </div>
    </div>
  );
}

function suggestSources(entries: EntryListItem[], boot: BootstrapView | null): string[] {
  const out = new Set<string>();
  if (boot?.settings.book) out.add(boot.settings.book);
  for (const e of entries) if (e.source && e.source !== "手动记录") out.add(e.source);
  for (let y = 2025; y >= 2009; y--) out.add(`${y} 数二真题`);
  return [...out];
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => resolve("");
    r.readAsDataURL(file);
  });
}
