// 记忆复习：先自己回忆，再翻面对照，按记得的程度评分。系统据此安排下次复习时间。
// 键盘：空格翻面，1-4 评分，U 撤销上一张。

import { getNode, RATING_LABEL, type Rating, type ReviewLog, type ReviewQueueView } from "@ps/core";
import { useCallback, useEffect, useState } from "react";
import { Empty, ErrorBox, PageHead } from "../components/bits.tsx";
import { Icon } from "../components/Icon.tsx";
import { MathText } from "../components/MathText.tsx";
import { useApp, useQuery } from "../lib/app.tsx";
import { CARD_KIND_LABEL, pct } from "../lib/format.ts";
import { navigate } from "../lib/router.ts";

const RATING_HINT: Record<Rating, string> = { 1: "完全想不起来", 2: "想起来了，但很吃力", 3: "正常想起来", 4: "不用想就知道" };

export function ReviewPage() {
  const { api, today, invalidate, toast } = useApp();
  const initial = useQuery<ReviewQueueView>("review", (a, t) => a.reviewQueue(t));
  const [queue, setQueue] = useState<ReviewQueueView | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<ReviewLog[]>([]);
  const [session, setSession] = useState({ done: 0, remembered: 0 });

  useEffect(() => {
    if (initial.data && !queue) setQueue(initial.data);
  }, [initial.data, queue]);

  const card = queue?.cards[0];

  const rate = useCallback(
    async (rating: Rating) => {
      if (!card || busy) return;
      setBusy(true);
      try {
        const res = await api.review(card.id, rating, today);
        setQueue(res.queue);
        setHistory((h) => [...h.slice(-19), res.log]);
        setSession((s) => ({ done: s.done + 1, remembered: s.remembered + (rating >= 2 ? 1 : 0) }));
        setRevealed(false);
        invalidate();
      } catch (e) {
        toast(e instanceof Error ? e.message : String(e), { tone: "error" });
      } finally {
        setBusy(false);
      }
    },
    [api, card, busy, today, invalidate, toast],
  );

  const undo = useCallback(async () => {
    const last = history.at(-1);
    if (!last || busy) return;
    setBusy(true);
    try {
      const q = await api.undoReview(last.id, today);
      setQueue(q);
      setHistory((h) => h.slice(0, -1));
      setSession((s) => ({ done: Math.max(0, s.done - 1), remembered: Math.max(0, s.remembered - (last.rating >= 2 ? 1 : 0)) }));
      setRevealed(false);
      invalidate();
      toast("已撤销上一张");
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), { tone: "error" });
    } finally {
      setBusy(false);
    }
  }, [api, history, busy, today, invalidate, toast]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!revealed && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        void rate(Number(e.key) as Rating);
      } else if (e.key.toLowerCase() === "u") {
        void undo();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [revealed, rate, undo]);

  if (!queue) return initial.error ? <ErrorBox error={initial.error} /> : <div className="skeleton">正在加载…</div>;
  const left = queue.cards.length;

  return (
    <>
      <PageHead
        title="记忆复习"
        sub="先在脑子里回答，再翻面对照。按真实记住的程度评分，系统用 FSRS 算法安排下次复习：记得牢的间隔变长，忘了的很快再出现。"
        actions={
          <>
            <button className="btn" onClick={undo} disabled={!history.length || busy}>
              <Icon name="undo" size={15} />
              撤销 <span className="kbd">U</span>
            </button>
            <button className="btn" onClick={() => navigate({ name: "cards" })}>
              <Icon name="cards" size={15} />
              卡片库
            </button>
          </>
        }
      />
      <section className="row" style={{ gap: 18 }}>
        <span>本轮已复习 <b className="num">{session.done}</b> 张{session.done ? `，记住 ${pct(session.remembered / session.done)}%` : ""}</span>
        <span className="muted">今天共复习 {queue.counts.doneToday} 张 · 还剩 {left} 张（到期 {queue.counts.due}，新卡 {queue.counts.fresh}）</span>
      </section>

      {card ? (
        <section style={{ display: "grid", gap: 16, maxWidth: 760, width: "100%", margin: "0 auto" }}>
          <div className="panel fade-in" key={card.id} style={{ padding: "26px 28px", display: "grid", gap: 18, minHeight: 280, boxShadow: "var(--shadow)" }}>
            <div className="row between">
              <span className="row" style={{ gap: 6 }}>
                <span className="badge">{CARD_KIND_LABEL[card.kind]}</span>
                {card.nodeIds.map((id) => (
                  <span key={id} className="small muted">{getNode(id)?.name}</span>
                ))}
              </span>
              <span className="small muted">{card.srs.state === 0 ? "新卡" : card.retention !== null ? `预计还记得 ${pct(card.retention)}%` : ""}</span>
            </div>
            <div style={{ fontSize: 19, lineHeight: 1.7 }}>
              <MathText text={card.front} />
            </div>
            {revealed ? (
              <div className="fade-in" style={{ borderTop: "1px solid var(--rule)", paddingTop: 16, fontSize: 16, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                <MathText text={card.back} />
              </div>
            ) : (
              <button className="btn lg" style={{ justifySelf: "center", marginTop: "auto" }} onClick={() => setRevealed(true)}>
                想好了，看答案 <span className="kbd">空格</span>
              </button>
            )}
          </div>
          {revealed ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }} role="group" aria-label="评分">
              {([1, 2, 3, 4] as Rating[]).map((r) => (
                <button
                  key={r}
                  className={`btn${r === 3 ? " primary" : ""}`}
                  disabled={busy}
                  onClick={() => rate(r)}
                  title={RATING_HINT[r]}
                  style={{ display: "grid", gap: 2, padding: "10px 6px", whiteSpace: "normal" }}
                >
                  <span style={{ fontWeight: 700 }}>{RATING_LABEL[r]} <span className="kbd">{r}</span></span>
                  <span className="small" style={{ opacity: 0.8 }}>{card.intervals[r]}后</span>
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : (
        <div className="panel">
          <Empty title={queue.counts.doneToday ? "今天的复习完成了" : "现在没有要复习的卡"} icon="check">
            <div className="stack" style={{ justifyItems: "center", gap: 10 }}>
              <span>
                {queue.counts.doneToday ? `今天复习了 ${queue.counts.doneToday} 张。` : ""}
                刚学的卡会在几分钟后回来，到期的卡明天再来。
              </span>
              <div className="row">
                <button className="btn" onClick={() => navigate({ name: "today" })}>回到今日</button>
                <button className="btn" onClick={() => navigate({ name: "upload" })}>上传新内容</button>
              </div>
            </div>
          </Empty>
        </div>
      )}
    </>
  );
}
