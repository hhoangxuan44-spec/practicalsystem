// 在地图上点开一个题型时的侧边速览。

import { getNode, RESULT_META, type NodeView } from "@ps/core";
import { CONFIDENCE_LABEL, pct } from "../lib/format.ts";
import { useQuery } from "../lib/app.tsx";
import { navigate } from "../lib/router.ts";
import { LevelBadge, NodeLink, ResultChip, Stars } from "./bits.tsx";
import { Icon } from "./Icon.tsx";
import { MathText } from "./MathText.tsx";
import { Drawer } from "./overlays.tsx";

export function NodeDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { data } = useQuery<NodeView>(`node:${id}`, (api, t) => api.node(id, t));
  const node = getNode(id);
  if (!node) return null;
  const s = data?.state;
  return (
    <Drawer onClose={onClose} label={s ? `${s.part} · ${s.chapterName}` : "题型"}>
      <div style={{ display: "grid", gap: 6 }}>
        <h2 style={{ fontFamily: "var(--f-display)", fontSize: 21 }}>{node.name}</h2>
        <div className="row" style={{ gap: 12 }}>
          {s ? <LevelBadge level={s.level} mastery={s.mastery} /> : null}
          <Stars freq={node.freq} />
          {s ? <span className="small muted">{CONFIDENCE_LABEL[s.confidence]} · {s.count} 次记录</span> : null}
        </div>
      </div>
      {data ? (
        <>
          <div className="callout accent">
            <Icon name="target" size={16} />
            <span>{data.advice}</span>
          </div>
          {data.rootChains.length ? (
            <div className="stack" style={{ gap: 6 }}>
              <b className="small">可能的根因</b>
              {data.rootChains.map((c) => (
                <RootChain key={c.join(">")} chain={c} />
              ))}
            </div>
          ) : null}
          <div className="stack" style={{ gap: 6 }}>
            <b className="small">方法要点</b>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }} className="ink2">
              {data.keyIdeas.map((k) => (
                <li key={k}><MathText text={k} /></li>
              ))}
            </ul>
          </div>
          {data.attempts.length ? (
            <div className="stack" style={{ gap: 6 }}>
              <b className="small">最近的做题记录</b>
              {data.attempts.slice(0, 4).map((a) => (
                <div key={a.id} style={{ display: "grid", gap: 2, borderTop: "1px solid var(--rule)", paddingTop: 6 }}>
                  <div className="row between">
                    <span className="mono">{a.ref}</span>
                    <ResultChip result={a.result} />
                  </div>
                  <span className="small ink2"><MathText text={a.diagnosis} /></span>
                </div>
              ))}
            </div>
          ) : (
            <p className="small muted">还没有做题记录。找 2 道这个题型的题做完上传，就能看到评估。</p>
          )}
          <div className="row" style={{ gap: 8 }}>
            <span className="small muted">记忆卡 {data.cards.length} 张{s && s.retention !== null ? ` · 平均记住 ${pct(s.retention)}%` : ""}</span>
            {s?.mainError ? <span className="small muted">主要问题：{RESULT_META[s.mainError].label}</span> : null}
          </div>
        </>
      ) : (
        <p className="muted">正在加载…</p>
      )}
      <button className="btn primary" onClick={() => navigate({ name: "node", id })}>
        打开完整档案
        <Icon name="arrowRight" size={15} />
      </button>
    </Drawer>
  );
}

/** 根因链：从最底层的前置题型画到本题型，如「不定积分 → 定积分计算 → 本题型」 */
export function RootChain({ chain }: { chain: string[] }) {
  const upstream = chain.slice(1).reverse();
  return (
    <div className="row" style={{ gap: 4 }}>
      {upstream.map((nid) => (
        <span key={nid} className="row" style={{ gap: 4 }}>
          <NodeLink id={nid} compact />
          <Icon name="arrowRight" size={12} />
        </span>
      ))}
      <span className="small muted">本题型</span>
    </div>
  );
}
