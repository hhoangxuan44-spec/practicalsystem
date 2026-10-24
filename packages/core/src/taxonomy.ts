import type { Chapter, TopicNode } from "./types.ts";

type NodeSeed = Omit<TopicNode, "chapterId">;

function chapter(id: string, name: string, part: Chapter["part"], nodes: NodeSeed[]): Chapter {
  return { id, name, part, nodes: nodes.map((n) => ({ ...n, chapterId: id })) };
}

/**
 * 数学二题型体系：章节 → 题型。
 * prereqs 是前置题型，用来找薄弱点的根因；keyIdeas 是每个题型的标准方法要点。
 */
export const TAXONOMY: Chapter[] = [
  chapter("A", "函数 · 极限 · 连续", "高数", [
    { id: "a1", name: "无穷小的比较与阶", freq: 3, prereqs: ["a2"], keyIdeas: [
      "求 lim α/βᵏ，极限为非零常数时 α 是 β 的 k 阶无穷小",
      "变限积分 $\\int_0^{g(x)} f(t)dt$ 的阶 =（f 的阶 + 1）× g 的阶",
      "α~β ⇔ α−β=o(α)；α²~β² 推不出 α~β",
    ] },
    { id: "a2", name: "函数极限计算（洛必达 / 泰勒 / 等价）", freq: 3, prereqs: [], keyIdeas: [
      "先化简：等价无穷小只替换乘除因子，提出极限非零的因子",
      "0/0、∞/∞ 用洛必达或泰勒；加减项多时优先泰勒展开到同阶",
      "常用展开：eˣ、sin x、cos x、ln(1+x)、(1+x)ᵃ 记到 x³",
    ] },
    { id: "a3", name: "1^∞ 与幂指型极限", freq: 2, prereqs: ["a2"], keyIdeas: [
      "幂指函数统一写成 $e^{v\\ln u}$",
      "$1^\\infty$ 型：$\\lim u^v = e^{\\lim v(u-1)}$",
      "算完指数后别忘了写回 e 的幂",
    ] },
    { id: "a4", name: "数列极限（存在性 / 单调有界 / 夹逼）", freq: 2, prereqs: ["a2"], keyIdeas: [
      "单调有界准则：先证有界，再证单调（作差或作商）",
      "夹逼：放缩成两个极限相同的数列",
      "判断命题真假先找反例，如 xₙ=(−1)ⁿ",
    ] },
    { id: "a5", name: "连续性与间断点", freq: 2, prereqs: ["a2"], keyIdeas: [
      "间断点只可能出现在无定义点和分段点",
      "按左右极限分类：可去、跳跃属第一类；无穷、振荡属第二类",
    ] },
  ]),
  chapter("B", "一元微分", "高数", [
    { id: "b1", name: "导数定义与可导性", freq: 3, prereqs: ["a2"], keyIdeas: [
      "f′(x₀)=lim [f(x₀+h)−f(x₀)]/h，分段点必须用定义",
      "左右导数都存在且相等才可导；可导一定连续",
      "已知含 f 的极限求 f′：先由分母→0 推出分子→0，再凑导数定义",
    ] },
    { id: "b2", name: "隐函数 / 参数方程求导", freq: 3, prereqs: ["b1"], keyIdeas: [
      "隐函数：两边对 x 求导，把 y 看作 x 的函数",
      "参数方程：dy/dx = y′(t)/x′(t)，d²y/dx² = [d(dy/dx)/dt] / x′(t)",
      "先把一阶导化简再求二阶导；题目问 y″ 别停在 y′",
    ] },
    { id: "b3", name: "高阶导数与泰勒公式", freq: 2, prereqs: ["b1"], keyIdeas: [
      "n 阶导用莱布尼茨公式，或与已知展开式比较系数",
      "f⁽ⁿ⁾(0) = n! × xⁿ 的系数",
      "皮亚诺余项用于求极限，拉格朗日余项用于证明",
    ] },
    { id: "b4", name: "相关变化率", freq: 1, prereqs: ["b2"], keyIdeas: [
      "写出变量之间的关系式，两边对 t 求导",
      "代入当前时刻的数值，不必解出各量关于 t 的表达式",
    ] },
  ]),
  chapter("C", "导数应用", "高数", [
    { id: "c1", name: "单调性与极值", freq: 3, prereqs: ["b1"], keyIdeas: [
      "求 f′ 的零点和不存在点，列表看符号变化",
      "驻点处可用 f″ 的符号判定极值",
      "最值：比较端点值和所有极值",
    ] },
    { id: "c2", name: "凹凸性与拐点", freq: 2, prereqs: ["c1", "b3"], keyIdeas: [
      "f″>0 曲线是凹的（开口向上），f″<0 是凸的",
      "拐点在 f″ 变号处，要检查 f″=0 和 f″ 不存在的点",
      "只在一点二阶可导时，推不出邻域内的凹凸",
    ] },
    { id: "c3", name: "渐近线", freq: 2, prereqs: ["a2"], keyIdeas: [
      "铅直：找使 f→∞ 的点（分母为 0、ln 的零点）",
      "水平：x→±∞ 时 f 的极限",
      "斜：k = lim f(x)/x，b = lim [f(x)−kx]，x→+∞ 与 −∞ 分别求",
    ] },
    { id: "c4", name: "方程根 / 零点个数", freq: 2, prereqs: ["c1"], keyIdeas: [
      "构造函数：零点定理证存在，单调性证唯一",
      "含参数时分离参数，看水平线与 g(x) 图像的交点个数",
    ] },
    { id: "c5", name: "微分不等式证明", freq: 2, prereqs: ["c1", "c2"], keyIdeas: [
      "移项构造 F(x)，证 F 单调且端点值满足条件",
      "一阶导定不了号时，再求二阶导",
    ] },
    { id: "c6", name: "中值定理证明", freq: 3, prereqs: ["b1"], keyIdeas: [
      "由结论倒推辅助函数：$f\'(\\xi)+\\lambda f(\\xi)=0 \\Rightarrow F = e^{\\lambda x}f(x)$",
      "需要两个中值点时，把区间分成两段分别用拉格朗日",
      "用罗尔定理前，先找两个函数值相等的点",
    ] },
    { id: "c7", name: "曲率", freq: 1, prereqs: ["b2"], keyIdeas: [
      "$K = \\dfrac{|y\'\'|}{(1+y\'^2)^{3/2}}$，曲率半径 $R = 1/K$",
    ] },
  ]),
  chapter("D", "一元积分", "高数", [
    { id: "d1", name: "不定积分（换元 / 分部）", freq: 2, prereqs: [], keyIdeas: [
      "凑微分优先；根式用三角代换或根式代换",
      "分部积分按「反对幂指三」选 u",
      "出现循环时移项求解",
    ] },
    { id: "d2", name: "有理函数积分", freq: 2, prereqs: ["d1"], keyIdeas: [
      "假分式先做多项式除法",
      "分母因式分解后拆成部分分式",
      "二次不可约因式先配方，再用 arctan 公式",
    ] },
    { id: "d3", name: "定积分计算与性质", freq: 3, prereqs: ["d1", "d2"], keyIdeas: [
      "换元必须换限",
      "对称区间先看奇偶性；周期函数可平移积分区间",
      "华里士公式：$\\int_0^{\\pi/2} \\sin^n x\\,dx$",
    ] },
    { id: "d4", name: "变限积分", freq: 3, prereqs: ["b1", "d3"], keyIdeas: [
      "$\\dfrac{d}{dx}\\int_a^{g(x)} f(t)dt = f(g(x))\\,g\'(x)$",
      "被积函数含 x 时先换元或拆开，把 x 提到积分号外",
      "累次积分形式的变限函数，先交换积分次序",
    ] },
    { id: "d5", name: "定积分比较大小", freq: 2, prereqs: ["d3", "c1"], keyIdeas: [
      "同一区间上比较被积函数，构造差函数判断符号",
      "区间不同时先换元，变成同一区间",
    ] },
    { id: "d6", name: "反常积分计算与敛散", freq: 2, prereqs: ["d3", "a1"], keyIdeas: [
      "找出所有瑕点和无穷限，逐个拆开判断",
      "与 1/xᵖ 比较：无穷限 p>1 收敛，瑕点处 p<1 收敛",
      "x→1 时 ln x ~ x−1",
    ] },
    { id: "d7", name: "定积分定义（黎曼和）", freq: 1, prereqs: ["d3"], keyIdeas: [
      "lim Σ f(k/n)·(1/n) = ∫₀¹ f(x)dx",
      "先提出 1/n，把剩余部分写成 f(k/n) 的形式",
    ] },
    { id: "d8", name: "积分不等式证明", freq: 2, prereqs: ["d3", "c6", "b3"], keyIdeas: [
      "变上限法：把一端换成 x，构造 F(x) 证单调",
      "利用泰勒展开或凹凸性",
      "柯西-施瓦茨不等式",
    ] },
  ]),
  chapter("E", "定积分应用", "高数", [
    { id: "e1", name: "平面面积（含极坐标）", freq: 2, prereqs: ["d3"], keyIdeas: [
      "直角坐标 S = ∫|f−g|dx",
      "极坐标 S = ½∫r²(θ)dθ，先画图确定 θ 范围",
      "r=sin3θ 是三叶玫瑰线，不是圆",
    ] },
    { id: "e2", name: "旋转体体积 / 侧面积", freq: 2, prereqs: ["d3"], keyIdeas: [
      "绕 x 轴 V = π∫y²dx；绕 y 轴用柱壳法 V = 2π∫x|f(x)|dx",
      "旋转曲面面积 A = 2π∫|y|√(1+y′²)dx",
    ] },
    { id: "e3", name: "弧长", freq: 2, prereqs: ["d3"], keyIdeas: [
      "s = ∫√(1+y′²)dx；参数式 ∫√(x′²+y′²)dt；极坐标 ∫√(r²+r′²)dθ",
      "根号内常能配成完全平方",
    ] },
    { id: "e4", name: "物理应用", freq: 1, prereqs: ["d3"], keyIdeas: [
      "微元法：取 [x, x+dx]，写出功、压力或引力的微元再积分",
    ] },
  ]),
  chapter("F", "微分方程", "高数", [
    { id: "f1", name: "一阶方程（可分离 / 齐次 / 线性）", freq: 3, prereqs: ["d1"], keyIdeas: [
      "先判类型：可分离、齐次（y/x）、一阶线性",
      "$y\'+P(x)y=Q(x)$：$y = e^{-\\int P}\\left(\\int Q e^{\\int P}dx + C\\right)$",
      "先化成 y′ 系数为 1 的标准形，再读 P(x)",
    ] },
    { id: "f2", name: "高阶常系数齐次线性方程", freq: 3, prereqs: [], keyIdeas: [
      "写特征方程，n 阶方程有 n 个根（含重根、复根）",
      "单根 $Ce^{rx}$；k 重根乘 x 的多项式；复根 $\\alpha\\pm\\beta i \\to e^{\\alpha x}(C_1\\cos\\beta x+C_2\\sin\\beta x)$",
      "r=0 对应常数项 C，三阶方程别漏",
    ] },
    { id: "f3", name: "非齐次方程特解", freq: 2, prereqs: ["f2"], keyIdeas: [
      "$f = P_m(x)e^{\\lambda x}$：特解设为 $x^kQ_m(x)e^{\\lambda x}$，k 是 λ 作为特征根的重数",
      "f 含 cos、sin 时，用 α±βi 是否为特征根来定 k",
    ] },
    { id: "f4", name: "可降阶与综合应用", freq: 2, prereqs: ["f1", "f2"], keyIdeas: [
      "y″=f(x,y′) 令 p=y′；y″=f(y,y′) 令 p=y′，y″=p·dp/dy",
      "应用题先由几何或物理条件列出方程，再求解",
    ] },
  ]),
  chapter("G", "多元微分", "高数", [
    { id: "g1", name: "偏导与全微分（复合 / 隐函数）", freq: 3, prereqs: ["b1"], keyIdeas: [
      "复合函数先画链式图，按路径求导",
      "隐函数 F(x,y,z)=0：∂z/∂x = −F_x/F_z",
      "抽象函数的 f₁′、f₂′ 仍是复合函数，求二阶偏导时要继续链式求导",
    ] },
    { id: "g2", name: "连续 / 可偏导 / 可微判定", freq: 1, prereqs: ["g1", "a2"], keyIdeas: [
      "可微：Δz − (AΔx+BΔy) = o(ρ)",
      "偏导存在推不出可微；偏导连续一定可微",
    ] },
    { id: "g3", name: "由偏导还原函数", freq: 2, prereqs: ["g1", "d1"], keyIdeas: [
      "对一个变量积分，积分常数换成另一个变量的函数",
      "变量代换题：用链式法则把方程写成新变量的形式",
    ] },
    { id: "g4", name: "二元极值与条件极值", freq: 3, prereqs: ["g1"], keyIdeas: [
      "无条件极值：解 f_x=f_y=0，用 AC−B² 判定",
      "条件极值用拉格朗日乘数法；闭区域最值还要比较边界",
    ] },
  ]),
  chapter("H", "二重积分", "高数", [
    { id: "h1", name: "交换积分次序", freq: 2, prereqs: ["h4"], keyIdeas: [
      "先根据上下限画出积分区域",
      "换序后先定外层的常数范围，再定内层",
    ] },
    { id: "h2", name: "直角坐标计算", freq: 2, prereqs: ["d3", "h4"], keyIdeas: [
      "选积分次序：看哪个方向的积分更简单",
      "被积函数含 $e^{x^2}$、$\\frac{\\sin x}{x}$ 等，只能按某一顺序积分",
    ] },
    { id: "h3", name: "极坐标计算", freq: 3, prereqs: ["d3", "h4"], keyIdeas: [
      "区域含圆弧、被积函数含 x²+y² 时用极坐标",
      "θ 范围由 r≥0 和区域边界确定，如 r²=cos2θ 要求 cos2θ≥0",
      "被积函数非负时结果必须为正，可用来检查",
    ] },
    { id: "h4", name: "积分区域识别与对称性", freq: 2, prereqs: [], keyIdeas: [
      "区域关于 x 轴对称、被积函数对 y 为奇函数时，积分为 0",
      "区域关于 y=x 对称时，x 与 y 可以互换（轮换对称）",
    ] },
  ]),
  chapter("L1", "行列式与矩阵", "线代", [
    { id: "l1", name: "行列式计算与展开", freq: 2, prereqs: [], keyIdeas: [
      "先化出 0 再展开；各行和相等时把各列加到第一列",
      "展开式中某项的符号由列标排列的逆序数决定",
      "范德蒙德行列式公式",
    ] },
    { id: "l2", name: "逆矩阵 / 初等变换 / 初等矩阵", freq: 2, prereqs: ["l1"], keyIdeas: [
      "左乘初等矩阵是行变换，右乘是列变换",
      "(A|E) → (E|A⁻¹)；A* = |A|A⁻¹",
      "由 B = PAQ 反推 A = P⁻¹BQ⁻¹",
    ] },
    { id: "l3", name: "矩阵的秩与矩阵方程", freq: 2, prereqs: ["l2"], keyIdeas: [
      "r(AB) ≤ min(r(A), r(B))；AB=O 时 r(A)+r(B) ≤ n",
      "矩阵方程先化成 AX=B，再用逆矩阵或初等行变换",
    ] },
  ]),
  chapter("L2", "向量组与方程组", "线代", [
    { id: "l4", name: "线性相关 / 线性表示 / 向量组等价", freq: 3, prereqs: ["l3"], keyIdeas: [
      "向量组排成矩阵，转化为求秩",
      "β 可由 α 组线性表示 ⇔ r(α) = r(α, β)",
      "两组等价 ⇔ r(Ⅰ) = r(Ⅱ) = r(Ⅰ, Ⅱ)",
    ] },
    { id: "l5", name: "线性方程组解的判定与结构", freq: 3, prereqs: ["l3", "l4"], keyIdeas: [
      "r(A)=r(A,b)=n 唯一解；=r<n 无穷多解；r(A)≠r(A,b) 无解",
      "含参数时对增广矩阵行变换，按参数取值分类讨论",
      "通解 = 特解 + 基础解系的线性组合",
    ] },
  ]),
  chapter("L3", "特征值与二次型", "线代", [
    { id: "l6", name: "特征值与特征向量", freq: 3, prereqs: ["l1"], keyIdeas: [
      "|λE−A| 按含 0 最多的行或列展开，先提公因式",
      "Σλᵢ = tr A，Πλᵢ = |A|",
      "f(A) 的特征值是 f(λ)",
    ] },
    { id: "l7", name: "相似对角化（含参）", freq: 3, prereqs: ["l6", "l3"], keyIdeas: [
      "可对角化 ⇔ 有 n 个线性无关的特征向量；k 重特征值要有 k 个",
      "特征值互不相同时一定可以对角化",
      "实对称矩阵一定可以正交相似对角化",
    ] },
    { id: "l8", name: "正交变换化标准形", freq: 3, prereqs: ["l7"], keyIdeas: [
      "二次型矩阵 → 特征值与特征向量 → 同一特征值的向量施密特正交化 → 单位化组成 Q",
      "标准形系数就是特征值；f/xᵀx 的最小值是最小特征值",
    ] },
    { id: "l9", name: "惯性指数 / 正定 / 合同", freq: 2, prereqs: ["l6"], keyIdeas: [
      "正负惯性指数 = 正负特征值的个数（或配方后系数的正负个数）",
      "正定 ⇔ 特征值全正 ⇔ 顺序主子式全正",
      "两个实对称矩阵合同 ⇔ 正负惯性指数相同",
    ] },
  ]),
];

const NODE_INDEX = new Map<string, TopicNode>();
const CHAPTER_INDEX = new Map<string, Chapter>();
for (const ch of TAXONOMY) {
  CHAPTER_INDEX.set(ch.id, ch);
  for (const n of ch.nodes) NODE_INDEX.set(n.id, n);
}

export const ALL_NODES: TopicNode[] = TAXONOMY.flatMap((c) => c.nodes);

export function getNode(id: string): TopicNode | undefined {
  return NODE_INDEX.get(id);
}

export function getChapter(id: string): Chapter | undefined {
  return CHAPTER_INDEX.get(id);
}

export function isNodeId(id: string): boolean {
  return NODE_INDEX.has(id);
}

/** 依赖本题型的下游题型 */
export function dependentsOf(id: string): TopicNode[] {
  return ALL_NODES.filter((n) => n.prereqs.includes(id));
}

/** 考频折算成权重 */
export function examWeight(freq: TopicNode["freq"]): number {
  return freq === 3 ? 1 : freq === 2 ? 0.65 : 0.35;
}

export const FREQ_LABEL: Record<TopicNode["freq"], string> = { 3: "★★★", 2: "★★", 1: "★" };
