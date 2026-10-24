// 初始数据：你上传的 2021、2022 数二真题手写作答，已逐题对照标准答案判定。
// 通过正常的 applyIngest 通道写入，和以后 AI 处理上传内容走的是同一条路径。

import type { StudyService } from "./service.ts";
import type { IngestAttempt, IngestCard, IngestResult, ProblemKind, ResultCode } from "./types.ts";

type Row = [q: number, kind: ProblemKind, nodeIds: string[], mine: string, answer: string, result: ResultCode, diagnosis: string];

function attempts(year: string, rows: Row[]): IngestAttempt[] {
  return rows.map(([q, kind, nodeIds, mine, answer, result, diagnosis]) => ({
    ref: `${year}-${q}`,
    kind,
    nodeIds,
    mine,
    answer,
    answerSource: "key",
    result,
    diagnosis,
    confidence: 0.9,
  }));
}

const R = String.raw;

const PAPER_2022: IngestResult = {
  title: "2022 数二真题",
  source: "2022 数二真题",
  summary:
    "选择 3/10、填空 1/6，大题第 19 题（极坐标二重积分）全对。概念辨析类选择题错了 4 道（无穷小性质、二阶导与凹凸、数列反例、相似对角化条件），计算失误 4 道，第 21、22 题空白。",
  highlights: [
    "α~β ⇔ α−β=o(α)；α²~β² 推不出 α~β",
    "只在一点二阶可导，推不出邻域内的凹凸",
    "反常积分要逐个检查所有瑕点",
    "三阶常系数方程别漏 r=0 对应的常数项",
    "极坐标面积 S=½∫r²dθ，r=sin3θ 不是圆",
  ],
  attempts: attempts("2022", [
    [1, "选择", ["a1"], "B", "C", "concept", "判断③时出错：α~β 时 α−β=o(α) 是成立的。"],
    [2, "选择", ["h1"], "D", "D", "ok", "交换积分次序后凑微分，过程完整。"],
    [3, "选择", ["b1", "c2"], "C", "B", "concept", "只在一点有二阶导时，f″(x₀)>0 推不出邻域内凹；凹函数只能推出 f″(x₀)≥0。"],
    [4, "选择", ["g1", "d4"], "C", "C", "ok", "拆开变限积分再求偏导，正确。"],
    [5, "选择", ["d6"], "C", "A", "method", "只看了 x=0 端的瑕点，漏了 x=1 端（要求 p>−1）。"],
    [6, "选择", ["a4"], "A", "D", "concept", "没有用 xₙ=(−1)ⁿ 这类反例去排除选项。"],
    [7, "选择", ["d5"], "B", "A", "method", "比较被积函数时没有构造差函数，靠画图判断出错。"],
    [8, "选择", ["l7"], "C", "B", "concept", "正交相似是充分条件不是必要条件；特征值互异 ⇔ 可相似对角化为 Λ。"],
    [9, "选择", ["l5"], "C", "D", "method", "写出了增广矩阵，但没有按 a、b 是否等于 ±1 分类讨论。"],
    [10, "选择", ["l4"], "C", "C", "ok", "求秩判断向量组等价，正确。"],
    [11, "填空", ["a3"], "−1/2", "e^(1/2)", "calc", "取对数的思路对，但符号算反了，最后也忘了还原成 e 的幂。"],
    [12, "填空", ["b2"], "−3/4", "−31/32", "calc", "求出 y′(1)=−3/4 就停了，题目问的是 y″(1)。"],
    [13, "填空", ["d2", "d3"], "16/(3√3)", "8√3π/9", "calc", "拆分、配方都对，arctan 代上下限时丢了 π。"],
    [14, "填空", ["f2"], "eˣ(C₁cos2x+C₂sin x)", "C₁+eˣ(C₂cos2x+C₃sin2x)", "concept", "三阶方程漏了 r=0 对应的常数项 C₁；sin x 应为 sin 2x。"],
    [15, "填空", ["e1"], "π/4", "π/12", "method", "把 r=sin3θ 化成了圆，应直接用 S=½∫r²dθ。"],
    [16, "填空", ["l2"], "−1", "−1", "ok", "由初等矩阵反推 A⁻¹ 再求迹，正确。"],
    [17, "解答", ["b1", "a2"], "只列了式子", "f′(1)=−1", "partial", "关键是先由极限存在推出 f(1)=0，再把两项凑成导数定义。"],
    [18, "解答", ["f1", "e3"], "y 求错", "y=x²/4−(ln x)/2，弧长 (e²+1)/4", "calc", "一阶线性方程的公式用对了，但 P(x)=−2/x 写成了 −1/x。"],
    [19, "解答", ["h3", "h4"], "2π−2", "2π−2", "ok", "区域分两块、极坐标上下限都对。"],
    [20, "解答", ["g1", "g3", "g4"], "只列了链式法则", "f=(u²+v²)e^(−(u+v))，极小值 f(0,0)=0", "partial", "第 (1) 问没把 u=x、v=y−x 代回；第 (2) 问没动笔。"],
    [21, "解答", ["d8", "c2"], "空白", "泰勒展开 + 反证", "blank", "没有作答。"],
    [22, "解答", ["l8"], "空白", "标准形 4y₁²+4y₂²+2y₃²，最小值 2", "blank", "没有作答。"],
  ]),
  notes: [],
  cards: [
    { kind: "pitfall", nodeIds: ["a1"], fromRef: "2022-1", front: "α~β 时，α−β=o(α) 成立吗？α²~β² 能推出 α~β 吗？", back: "前者成立：(α−β)/α → 0。后者不成立：可能 α~−β，例如 α=x，β=−x。" },
    { kind: "pitfall", nodeIds: ["c2", "b1"], fromRef: "2022-3", front: "f 在 x₀ 处二阶可导：f′(x₀)>0 能推出邻域内单调增吗？f″(x₀)>0 能推出邻域内是凹的吗？", back: "前者能：f″(x₀) 存在 ⇒ f′ 在 x₀ 连续，由保号性邻域内 f′>0。后者不能：f″ 只在一点存在，邻域内的凹凸无从判断。" },
    { kind: "method", nodeIds: ["d6"], fromRef: "2022-5", front: R`判断 $\int_0^1 \frac{\ln x}{x^p(1-x)^{1-p}}dx$ 的敛散性，要检查哪些点？`, back: R`两个瑕点都要查。$x\to0$ 处需 $p<1$；$x\to1$ 处 $\ln x\sim x-1$，被积函数 $\sim -(1-x)^p$，需 $p>-1$。所以 $-1<p<1$。` },
    { kind: "method", nodeIds: ["a4"], fromRef: "2022-6", front: "判断「若 lim f(xₙ) 存在，则 lim xₙ 存在」这类选项，第一反应是什么？", back: "构造反例：取 xₙ=(−1)ⁿ 这类振荡数列，看 f(xₙ) 是否收敛。能举出反例就排除。" },
    { kind: "method", nodeIds: ["d5"], fromRef: "2022-7", front: "比较 ∫₀¹f 与 ∫₀¹g 的大小，标准做法？", back: "比较被积函数：令 h=f−g，判断 h 在区间上的符号，必要时求导看单调性。不要靠画图猜。" },
    { kind: "pitfall", nodeIds: ["l7"], fromRef: "2022-8", front: "3 阶矩阵 A 的特征值为 1, −1, 0 的充要条件是什么？为什么不是「存在正交矩阵 Q 使 A=QΛQ⁻¹」？", back: "充要条件是存在可逆 P 使 A=PΛP⁻¹（特征值互异必可对角化）。正交相似要求 A 是实对称矩阵，只是充分条件。" },
    { kind: "method", nodeIds: ["l5"], fromRef: "2022-9", front: "含参数的 Ax=b（如范德蒙德型系数矩阵），判断解的情况的步骤？", back: "对增广矩阵做行变换，按参数取值分类讨论 r(A) 与 r(A,b)：相等且等于 n 唯一解；相等且小于 n 无穷多解；不等则无解。" },
    { kind: "pitfall", nodeIds: ["a3"], fromRef: "2022-11", front: R`$\lim_{x\to0}\left(\frac{1+e^x}{2}\right)^{\cot x}$ 怎么算？`, back: R`1^∞ 型：$=e^{\lim \cot x\cdot\frac{e^x-1}{2}}=e^{\lim\frac{x}{2x}}=e^{1/2}$。最后要写回 e 的幂。` },
    { kind: "pitfall", nodeIds: ["b2"], fromRef: "2022-12", front: "隐函数求 y″(1) 的完整步骤？", back: "① 代 x=1 求 y(1)；② 由一阶导等式求 y′(1)；③ 对一阶导等式再求导，代入 x、y、y′ 解出 y″(1)。题目问 y″ 别停在 y′。" },
    { kind: "pitfall", nodeIds: ["d2", "d3"], fromRef: "2022-13", front: R`$\int_0^1\frac{dx}{x^2-x+1}$ 等于多少？`, back: R`配方得 $(x-\frac12)^2+\frac34$，原函数 $\frac{2}{\sqrt3}\arctan\frac{2x-1}{\sqrt3}$，代限得 $\frac{2}{\sqrt3}\cdot\frac{\pi}{3}=\frac{2\sqrt3\pi}{9}$。arctan 代值后别丢 π。` },
    { kind: "formula", nodeIds: ["f2"], fromRef: "2022-14", front: "三阶常系数齐次方程 y‴+a·y″+b·y′+c·y=0 的通解怎么写？", back: "写特征方程，求出 3 个根：单实根 r → Ce^{rx}；k 重根 → (C₁+C₂x+…)e^{rx}；共轭复根 α±βi → e^{αx}(C₁cosβx+C₂sinβx)。缺 y 项时 r=0 是根，对应常数 C，别漏。" },
    { kind: "pitfall", nodeIds: ["e1"], fromRef: "2022-15", front: R`$r=\sin3\theta\ (0\le\theta\le\frac{\pi}{3})$ 围成的面积是多少？`, back: R`它是三叶玫瑰线的一瓣，不是圆。$S=\frac12\int_0^{\pi/3}\sin^2 3\theta\,d\theta=\frac{\pi}{12}$。` },
    { kind: "method", nodeIds: ["b1", "a2"], fromRef: "2022-17", front: "已知 lim [f(e^{x²})−3f(1+sin²x)]/x² = 2，求 f′(1) 的突破口？", back: "分母→0 且极限存在 ⇒ 分子→0，得 f(1)=0。再把两项分别凑成导数定义：f′(1)−3f′(1)=2，所以 f′(1)=−1。" },
    { kind: "formula", nodeIds: ["f1"], fromRef: "2022-18", front: R`一阶线性方程 $y'+P(x)y=Q(x)$ 的通解公式？`, back: R`$y=e^{-\int P\,dx}\left(\int Q\,e^{\int P\,dx}dx+C\right)$。先化成 $y'$ 系数为 1 的形式再读 $P$：$2xy'-4y=\dots$ 中 $P=-\frac{2}{x}$。` },
    { kind: "method", nodeIds: ["g3"], fromRef: "2022-20", front: "已知 f_u−f_v=2(u−v)e^{−(u+v)} 和 f(u,0)，求 f(u,v) 的思路？", back: "令 g(x,y)=f(x,y−x)，则 g_x=f_u−f_v，变成对 x 的偏导；对 x 积分得 g，用 f(u,0) 定出任意函数，再代回 u=x、v=y−x。" },
    { kind: "method", nodeIds: ["d8"], fromRef: "2022-21", front: R`证明 $f''\ge0 \iff f\left(\frac{a+b}{2}\right)\le\frac{1}{b-a}\int_a^b f(x)dx$ 的思路？`, back: "必要性：在 (a+b)/2 处泰勒展开到二阶，积分后一次项为 0。充分性：反证，设某点 f″<0，在其附近的小区间上构造辅助函数，推出相反的不等式。" },
    { kind: "method", nodeIds: ["l8"], fromRef: "2022-22", front: "用正交变换化二次型为标准形的步骤？min f(x)/xᵀx 等于什么？", back: "写矩阵 → 求特征值 → 求特征向量 → 同一特征值的向量施密特正交化 → 单位化组成 Q。标准形系数是特征值；min f/xᵀx 等于最小特征值。" },
  ],
};

const PAPER_2021: IngestResult = {
  title: "2021 数二真题",
  source: "2021 数二真题",
  summary:
    "选择 5/10、填空 2/6，第 20 题（微分方程与法线截距）两问全对。计算失误 6 道（泰勒展开符号、参数方程二阶导、行列式符号、特征多项式），高阶常系数方程漏了复根，双纽线 θ 范围取错。",
  highlights: [
    "变限积分的阶 =（被积函数阶 + 1）× 上限阶",
    "sec x = 1 + x²/2 + o(x²)",
    "参数方程二阶导：先化简一阶导再求导",
    "r³=1 有一个实根和一对共轭复根",
    "双纽线 r²=cos2θ 的 θ 范围是 [0, π/4]",
  ],
  attempts: attempts("2021", [
    [1, "选择", ["a1", "d4"], "D", "C", "method", "eᵗ³−1 应先等价成 t³，积分得 x⁸/4，是高阶无穷小。"],
    [2, "选择", ["b1", "a5"], "C", "D", "calc", "用导数定义的思路对，(eˣ−1−x)/x² 的极限是 1/2 不是 0。"],
    [3, "选择", ["b4"], "B", "C", "method", "应直接对 V=πr²h、S 关于 t 求导再代值，不必解出 r(t)。"],
    [4, "选择", ["c4"], "A", "A", "ok", "分离参数后看图像交点，正确。"],
    [5, "选择", ["b3"], "C", "D", "calc", "sec x = 1/cos x = 1 + x²/2 + …，系数符号弄反。"],
    [6, "选择", ["g1"], "C", "C", "ok", "两次代入求出 f₁′、f₂′，正确。"],
    [7, "选择", ["d7"], "B", "B", "ok", "黎曼和对应正确。"],
    [8, "选择", ["l9"], "D", "B", "method", "应先展开写出矩阵，再用特征值或配方判断正负个数。"],
    [9, "选择", ["l4", "l5"], "D", "D", "ok", "由线性表示关系推出方程组解的包含关系，正确。"],
    [10, "选择", ["l2"], "C", "C", "ok", "初等变换对应正确。"],
    [11, "填空", ["d6"], "1/ln3", "1/ln3", "ok", "利用奇偶性化为两倍积分，正确。"],
    [12, "填空", ["b2"], "4", "2/3", "calc", "dy/dx 可以先化简成 2t，再求二阶导会简单很多。"],
    [13, "填空", ["g1"], "1", "1", "ok", "隐函数求偏导，正确。"],
    [14, "填空", ["d4", "h1"], "π/2", "(π/2)cos(2/π)", "method", "交换积分次序时区域画错，下限应为 1。"],
    [15, "填空", ["f2"], "(C₁+C₂x)e⁻ˣ", "C₁eˣ+e^(−x/2)(C₂cos(√3x/2)+C₃sin(√3x/2))", "concept", "r³=1 的两个复根没求出来。"],
    [16, "填空", ["l1"], "5", "−5", "calc", "找对了含 x³ 的项，排列的逆序数符号错了。"],
    [17, "解答", ["a2"], "−1/2", "1/2", "calc", "通分 + 泰勒的思路对，展开时符号出错。"],
    [18, "解答", ["c2", "c3"], "凹凸做了大半", "斜渐近线 y=x−1 与 y=−x+1，铅直渐近线 x=−1", "partial", "斜渐近线漏了截距 b，铅直渐近线没写。"],
    [19, "解答", ["e3", "e2"], "只求出 f(x)", "S=22/3，A=425π/9", "partial", "弧长和旋转曲面面积都没算。"],
    [20, "解答", ["f1", "c1"], "P(1, 4/3)", "P(1, 4/3)", "ok", "两问都对。"],
    [21, "解答", ["h3", "h4"], "−5/24", "1/48", "method", "θ 范围应为 0~π/4（r²=cos2θ≥0）；被积函数为正却得到负值，也没察觉。"],
    [22, "解答", ["l6", "l7"], "特征多项式算错", "a=1,b=1 或 a=−1,b=3", "calc", "|λE−A| 展开错了，应为 (λ−b)(λ−1)(λ−3)。"],
  ]),
  notes: [],
  cards: [
    { kind: "method", nodeIds: ["a1", "d4"], fromRef: "2021-1", front: R`$\int_0^{x^2}(e^{t^3}-1)dt$ 是 $x$ 的几阶无穷小？`, back: R`被积函数 $\sim t^3$，积分 $\sim \frac{(x^2)^4}{4}=\frac{x^8}{4}$，是 8 阶，比 $x^7$ 高阶。变限积分的阶 =（被积函数阶 + 1）× 上限阶。` },
    { kind: "pitfall", nodeIds: ["b1"], fromRef: "2021-2", front: R`$\lim_{x\to0}\frac{e^x-1-x}{x^2}$ 等于多少？`, back: R`$\frac12$（$e^x=1+x+\frac{x^2}{2}+o(x^2)$）。所以 $f(x)=\frac{e^x-1}{x}$ 在 0 处的导数是 $\frac12$，不为 0。` },
    { kind: "method", nodeIds: ["b4"], fromRef: "2021-3", front: "相关变化率题（如圆柱体积随时间的变化率）的标准步骤？", back: "写出关系式 V=πr²h、S=2πr²+2πrh，两边对 t 求导，再代入当前时刻 r、h、r′、h′ 的值。不需要解出 r(t)。" },
    { kind: "formula", nodeIds: ["b3"], fromRef: "2021-5", front: "sec x 在 x=0 处的二阶泰勒展开？", back: "sec x = 1 + x²/2 + o(x²)。cos x = 1 − x²/2 + …，取倒数后二次项变成正号。" },
    { kind: "method", nodeIds: ["l9"], fromRef: "2021-8", front: "二次型的正负惯性指数怎么求？", back: "展开写出对称矩阵，求特征值的正负个数（或配方）。用迹、行列式、二阶主子式之和可以快速判断特征值的符号。" },
    { kind: "formula", nodeIds: ["b2"], fromRef: "2021-12", front: R`参数方程的二阶导 $\frac{d^2y}{dx^2}$ 公式？`, back: R`$\frac{d^2y}{dx^2}=\frac{\frac{d}{dt}\left(\frac{dy}{dx}\right)}{\frac{dx}{dt}}$。先把 $\frac{dy}{dx}$ 化简（2021-12 化简后是 $2t$），再求导。` },
    { kind: "method", nodeIds: ["d4", "h1"], fromRef: "2021-14", front: R`$f(t)=\int_1^{t^2}dx\int_{\sqrt x}^{t}\sin\frac{x}{y}dy$，求 $f'(t)$ 的第一步？`, back: R`交换积分次序：区域为 $1\le y\le t,\ 1\le x\le y^2$，化为 $\int_1^t dy\int_1^{y^2}\sin\frac{x}{y}dx$，再对变限积分求导。` },
    { kind: "pitfall", nodeIds: ["f2"], fromRef: "2021-15", front: R`$y'''-y=0$ 的通解？`, back: R`特征方程 $r^3=1$：$r=1$，$r=-\frac12\pm\frac{\sqrt3}{2}i$。通解 $C_1e^x+e^{-x/2}\left(C_2\cos\frac{\sqrt3}{2}x+C_3\sin\frac{\sqrt3}{2}x\right)$。` },
    { kind: "pitfall", nodeIds: ["l1"], fromRef: "2021-16", front: "行列式展开式中某一项的正负号怎么确定？", back: "项 a₁ⱼ₁a₂ⱼ₂…aₙⱼₙ 的符号是 (−1)^τ，τ 为列标排列 j₁j₂…jₙ 的逆序数。" },
    { kind: "pitfall", nodeIds: ["a2"], fromRef: "2021-17", front: R`$\int_0^x e^{t^2}dt$ 在 $x\to0$ 时展开到 $x^3$？`, back: R`$x+\frac{x^3}{3}+o(x^3)$。2021-17 通分后分子展开到 $x^2$ 项即可，结果是 $\frac12$。` },
    { kind: "pitfall", nodeIds: ["c3"], fromRef: "2021-18", front: "斜渐近线 y=kx+b 怎么求？要注意什么？", back: "k=lim f(x)/x，b=lim [f(x)−kx]，x→+∞ 和 x→−∞ 分开求；别漏掉铅直渐近线（如分母为 0 的点）。" },
    { kind: "formula", nodeIds: ["e3", "e2"], fromRef: "2021-19", front: "曲线 y=f(x) 的弧长、绕 x 轴的旋转曲面面积公式？", back: R`$s=\int_a^b\sqrt{1+f'^2}\,dx$，$A=2\pi\int_a^b |f|\sqrt{1+f'^2}\,dx$。根号里常能配成完全平方。` },
    { kind: "pitfall", nodeIds: ["h3"], fromRef: "2021-21", front: "双纽线 (x²+y²)²=x²−y²（x≥0, y≥0）用极坐标时 θ 的范围？", back: "r²=cos2θ，要求 cos2θ≥0，所以 θ∈[0, π/4]，不是 [0, π/2]。被积函数为正时结果必须为正，可以用来检查。" },
    { kind: "pitfall", nodeIds: ["l6"], fromRef: "2021-22", front: R`$A=\begin{pmatrix}2&1&0\\1&2&0\\1&a&b\end{pmatrix}$ 的特征多项式？`, back: R`按第 3 列展开：$(\lambda-b)[(\lambda-2)^2-1]=(\lambda-b)(\lambda-1)(\lambda-3)$。` },
  ] satisfies IngestCard[],
};

/** 写入初始数据（只在数据库为空时调用） */
export function seedInitialData(service: StudyService, date: string): void {
  if (service.store.list("entries").length > 0) return;
  for (const paper of [PAPER_2021, PAPER_2022]) {
    const entry = service.createEntry(
      { date, title: paper.title, source: paper.source, text: "手写作答的整卷 PDF，已对照标准答案逐题判定。" },
      [],
    );
    service.applyIngest(entry.id, paper);
  }
}
