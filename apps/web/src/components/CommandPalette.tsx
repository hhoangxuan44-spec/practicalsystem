// 快速跳转（Ctrl/⌘ + K）：页面、题型。

import { TAXONOMY } from "@ps/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { navigate, type Route } from "../lib/router.ts";
import { Icon, type IconName } from "./Icon.tsx";

interface Item {
  group: string;
  label: string;
  hint?: string;
  icon: IconName;
  route: Route;
}

const PAGES: Item[] = [
  { group: "页面", label: "今日", icon: "today", route: { name: "today" } },
  { group: "页面", label: "上传学习内容", icon: "upload", route: { name: "upload" } },
  { group: "页面", label: "能力地图", icon: "map", route: { name: "map" } },
  { group: "页面", label: "记忆复习", icon: "review", route: { name: "review" } },
  { group: "页面", label: "卡片库", icon: "cards", route: { name: "cards" } },
  { group: "页面", label: "薄弱点诊断", icon: "diagnosis", route: { name: "diagnosis" } },
  { group: "页面", label: "学习记录", icon: "journal", route: { name: "journal" } },
  { group: "页面", label: "报告", icon: "reports", route: { name: "reports" } },
  { group: "页面", label: "设置", icon: "settings", route: { name: "settings" } },
];

const NODES: Item[] = TAXONOMY.flatMap((ch) =>
  ch.nodes.map((n) => ({ group: "题型", label: n.name, hint: ch.name, icon: "target" as IconName, route: { name: "node", id: n.id } as Route })),
);

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    const all = [...PAGES, ...NODES];
    return s ? all.filter((i) => i.label.toLowerCase().includes(s) || (i.hint ?? "").includes(s)).slice(0, 30) : all.slice(0, 18);
  }, [q]);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => setSel(0), [q]);

  const go = (i: Item | undefined) => {
    if (!i) return;
    navigate(i.route);
    onClose();
  };

  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="palette fade-in" role="dialog" aria-label="快速跳转">
        <input
          ref={inputRef}
          placeholder="搜索页面或题型…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="搜索"
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(items.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter") go(items[sel]);
            else if (e.key === "Escape") onClose();
          }}
        />
        <ul role="listbox">
          {items.map((it, i) => (
            <li key={it.group + it.label}>
              {i === 0 || items[i - 1].group !== it.group ? <div className="group">{it.group}</div> : null}
              <button role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(it)}>
                <Icon name={it.icon} size={16} />
                <span>{it.label}</span>
                {it.hint ? <span className="small muted" style={{ marginLeft: "auto" }}>{it.hint}</span> : null}
              </button>
            </li>
          ))}
          {!items.length ? <li className="small muted" style={{ padding: 12 }}>没有找到匹配的页面或题型</li> : null}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
