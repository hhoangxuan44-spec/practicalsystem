// 题型选择器：搜索 49 个题型，多选。用于修正 AI 的归类、新建卡片、手动记录。

import { TAXONOMY } from "@ps/core";
import { useMemo, useState } from "react";
import { Icon } from "./Icon.tsx";

export function NodePicker({ value, onChange, max = 3 }: { value: string[]; onChange: (ids: string[]) => void; max?: number }) {
  const [q, setQ] = useState("");
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    return TAXONOMY.map((ch) => ({ ch, nodes: ch.nodes.filter((n) => !s || n.name.toLowerCase().includes(s) || ch.name.includes(s) || n.id === s) })).filter((g) => g.nodes.length);
  }, [q]);
  const toggle = (id: string) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange(max === 1 ? [id] : [...value, id].slice(-max));
  };
  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row" style={{ gap: 6 }}>
        {value.length ? (
          value.map((id, i) => {
            const n = TAXONOMY.flatMap((c) => c.nodes).find((x) => x.id === id);
            return (
              <button key={id} type="button" className="chip link" onClick={() => toggle(id)} title="点击移除">
                {i === 0 ? <b>主</b> : null}
                {n?.name ?? id}
                <Icon name="x" size={12} />
              </button>
            );
          })
        ) : (
          <span className="small muted">还没有选择题型</span>
        )}
      </div>
      <input className="input" placeholder="搜索题型，如「极坐标」「特征值」" value={q} onChange={(e) => setQ(e.target.value)} aria-label="搜索题型" />
      <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid var(--rule)", borderRadius: 8, padding: 6 }}>
        {groups.map(({ ch, nodes }) => (
          <div key={ch.id}>
            <div className="small muted" style={{ padding: "6px 6px 2px" }}>
              {ch.part} · {ch.name}
            </div>
            <div className="row" style={{ gap: 6, padding: "2px 6px 6px" }}>
              {nodes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className="chip link"
                  aria-pressed={value.includes(n.id)}
                  style={value.includes(n.id) ? { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
                  onClick={() => toggle(n.id)}
                >
                  {n.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
