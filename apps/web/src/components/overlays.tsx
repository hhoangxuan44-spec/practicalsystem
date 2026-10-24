// 浮层：对话框、侧边抽屉、提示条、悬停提示。

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../lib/app.tsx";
import { Icon } from "./Icon.tsx";

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEscape(onClose);
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal fade-in" role="dialog" aria-modal="true" aria-label={title} style={wide ? { width: "min(760px, 100%)" } : undefined}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ onClose, children, label }: { onClose: () => void; children: ReactNode; label: string }) {
  useEscape(onClose);
  return createPortal(
    <>
      <div className="overlay" style={{ background: "rgba(10,14,24,0.18)" }} onMouseDown={onClose} />
      <aside className="drawer fade-in" role="dialog" aria-label={label}>
        <div className="row between">
          <span className="small muted">{label}</span>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </aside>
    </>,
    document.body,
  );
}

export function Toasts() {
  const { toasts } = useApp();
  return createPortal(
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast fade-in${t.tone === "error" ? " error" : ""}`}>
          <span>{t.message}</span>
          {t.action ? <button onClick={t.action.run}>{t.action.label}</button> : null}
        </div>
      ))}
    </div>,
    document.body,
  );
}

export interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

/** 图表悬停提示：跟随指针，靠近屏幕边缘时翻到另一侧 */
export function useTooltip() {
  const [tip, setTip] = useState<TipState | null>(null);
  const node = tip ? <TooltipBox tip={tip} /> : null;
  return { tip, show: (x: number, y: number, content: ReactNode) => setTip({ x, y, content }), hide: () => setTip(null), node };
}

function TooltipBox({ tip }: { tip: TipState }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: tip.x + 14, top: tip.y + 14 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let left = tip.x + 14;
    let top = tip.y + 14;
    if (left + w > window.innerWidth - 8) left = tip.x - w - 14;
    if (top + h > window.innerHeight - 8) top = tip.y - h - 14;
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [tip.x, tip.y]);
  return createPortal(
    <div ref={ref} className="tooltip" style={pos} role="tooltip">
      {tip.content}
    </div>,
    document.body,
  );
}
