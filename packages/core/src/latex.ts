// 把 $...$ 里的 LaTeX 转成可读的纯文本（App 列表、搜索、摘要用；网页版用 KaTeX 正式渲染）。

const SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", varepsilon: "ε", theta: "θ", lambda: "λ",
  mu: "μ", xi: "ξ", eta: "η", pi: "π", rho: "ρ", sigma: "σ", tau: "τ", varphi: "φ", phi: "φ", omega: "ω",
  Delta: "Δ", Sigma: "Σ", Omega: "Ω", Lambda: "Λ",
  int: "∫", iint: "∬", oint: "∮", sum: "Σ", prod: "Π", infty: "∞", partial: "∂", nabla: "∇",
  le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈", sim: "~", equiv: "≡",
  to: "→", rightarrow: "→", Rightarrow: "⇒", iff: "⇔", Leftrightarrow: "⇔", leftarrow: "←",
  cdot: "·", times: "×", div: "÷", pm: "±", mp: "∓", in: "∈", notin: "∉", subset: "⊂", cup: "∪", cap: "∩",
  forall: "∀", exists: "∃", cdots: "⋯", ldots: "…", dots: "…", circ: "°", prime: "′",
  lim: "lim", ln: "ln", log: "log", sin: "sin", cos: "cos", tan: "tan", cot: "cot", sec: "sec", csc: "csc",
  arcsin: "arcsin", arccos: "arccos", arctan: "arctan", max: "max", min: "min", det: "det", exp: "exp",
  quad: " ", qquad: "  ", ",": " ", ";": " ", "!": "", " ": " ",
};

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "-": "⁻", n: "ⁿ", k: "ᵏ", x: "ˣ", T: "ᵀ", "(": "⁽", ")": "⁾" };
const SUB: Record<string, string> = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉", n: "ₙ", k: "ₖ", i: "ᵢ", j: "ⱼ", "+": "₊", "-": "₋" };

function script(text: string, map: Record<string, string>, marker: string): string {
  const chars = [...text];
  return chars.every((c) => map[c]) ? chars.map((c) => map[c]).join("") : `${marker}(${text})`;
}

/** 读取从 i 开始的一个参数：{...} 或单个字符 */
function readArg(s: string, i: number): [string, number] {
  while (s[i] === " ") i++;
  if (s[i] !== "{") return [s[i] ?? "", i + 1];
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    if (s[j] === "{") depth++;
    else if (s[j] === "}" && --depth === 0) return [s.slice(i + 1, j), j + 1];
  }
  return [s.slice(i + 1), s.length];
}

export function latexToPlain(tex: string): string {
  let out = "";
  let i = 0;
  while (i < tex.length) {
    const ch = tex[i];
    if (ch === "\\") {
      const m = tex.slice(i + 1).match(/^([a-zA-Z]+|.)/);
      const name = m ? m[1] : "";
      i += 1 + name.length;
      if (name === "frac" || name === "dfrac" || name === "tfrac") {
        const [a, j] = readArg(tex, i);
        const [b, k] = readArg(tex, j);
        i = k;
        const A = latexToPlain(a);
        const B = latexToPlain(b);
        out += `${A.length > 1 ? `(${A})` : A}/${B.length > 1 ? `(${B})` : B}`;
      } else if (name === "sqrt") {
        const [a, j] = readArg(tex, i);
        i = j;
        const A = latexToPlain(a);
        out += A.length > 1 ? `√(${A})` : `√${A}`;
      } else if (["left", "right", "big", "Big", "bigg", "Bigg", "displaystyle", "limits", "mathrm", "text", "mathbf", "boldsymbol", "operatorname"].includes(name)) {
        // 只去掉命令本身，保留后面的内容
      } else if (name === "begin" || name === "end") {
        const [, j] = readArg(tex, i);
        i = j;
        out += name === "begin" ? "(" : ")";
      } else if (name === "\\") {
        out += "; ";
      } else {
        out += SYMBOLS[name] ?? name;
      }
    } else if (ch === "^" || ch === "_") {
      const [a, j] = readArg(tex, i + 1);
      i = j;
      out += script(latexToPlain(a), ch === "^" ? SUP : SUB, ch);
    } else if (ch === "{" || ch === "}") {
      i++;
    } else if (ch === "&") {
      out += " ";
      i++;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/** 把一段含 $...$ 的文字整体转成纯文本 */
export function mathTextToPlain(text: string): string {
  return text.replace(/\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g, (_, block, inline) => latexToPlain(block ?? inline));
}

/** 把文字切成普通文本和公式片段（网页版逐段渲染） */
export function splitMath(text: string): { math: boolean; display: boolean; value: string }[] {
  const parts: { math: boolean; display: boolean; value: string }[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ math: false, display: false, value: text.slice(last, m.index) });
    parts.push({ math: true, display: m[1] !== undefined, value: m[1] ?? m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ math: false, display: false, value: text.slice(last) });
  return parts;
}
