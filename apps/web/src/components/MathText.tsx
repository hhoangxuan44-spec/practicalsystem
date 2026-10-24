// 渲染含 $...$ 公式的文字。公式用 KaTeX 排版，出错时原样显示。

import { splitMath } from "@ps/core";
import katex from "katex";
import "katex/dist/katex.min.css";
import { memo, useMemo } from "react";

const cache = new Map<string, string>();

function render(tex: string, display: boolean): string {
  const key = (display ? "D" : "I") + tex;
  let html = cache.get(key);
  if (html === undefined) {
    try {
      html = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", output: "html" });
    } catch {
      html = "";
    }
    if (cache.size > 2000) cache.clear();
    cache.set(key, html);
  }
  return html;
}

export const MathText = memo(function MathText({ text, as: Tag = "span", className }: { text: string; as?: "span" | "div" | "p"; className?: string }) {
  const parts = useMemo(() => splitMath(text ?? ""), [text]);
  return (
    <Tag className={`math-text${className ? " " + className : ""}`}>
      {parts.map((p, i) => {
        if (!p.math) return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{p.value}</span>;
        const html = render(p.value, p.display);
        return html ? <span key={i} dangerouslySetInnerHTML={{ __html: html }} /> : <code key={i}>{p.value}</code>;
      })}
    </Tag>
  );
});
