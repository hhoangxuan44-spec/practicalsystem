// 数学二 题型树：章节 → 题型
// freq：考频权重 3=几乎每年 2=常考 1=偶尔
window.TAXONOMY = [
  { id: "A", name: "函数 · 极限 · 连续", part: "高数", items: [
    { id: "a1", name: "无穷小的比较与阶", freq: 3 },
    { id: "a2", name: "函数极限计算（洛必达 / 泰勒 / 等价）", freq: 3 },
    { id: "a3", name: "1^∞ 与幂指型极限", freq: 2 },
    { id: "a4", name: "数列极限（存在性 / 单调有界 / 夹逼）", freq: 2 },
    { id: "a5", name: "连续性与间断点", freq: 2 },
  ]},
  { id: "B", name: "一元微分", part: "高数", items: [
    { id: "b1", name: "导数定义与可导性", freq: 3 },
    { id: "b2", name: "隐函数 / 参数方程求导", freq: 3 },
    { id: "b3", name: "高阶导数与泰勒公式", freq: 2 },
    { id: "b4", name: "相关变化率", freq: 1 },
  ]},
  { id: "C", name: "导数应用", part: "高数", items: [
    { id: "c1", name: "单调性与极值", freq: 3 },
    { id: "c2", name: "凹凸性与拐点", freq: 2 },
    { id: "c3", name: "渐近线", freq: 2 },
    { id: "c4", name: "方程根 / 零点个数", freq: 2 },
    { id: "c5", name: "微分不等式证明", freq: 2 },
    { id: "c6", name: "中值定理证明", freq: 3 },
    { id: "c7", name: "曲率", freq: 1 },
  ]},
  { id: "D", name: "一元积分", part: "高数", items: [
    { id: "d1", name: "不定积分（换元 / 分部）", freq: 2 },
    { id: "d2", name: "有理函数积分", freq: 2 },
    { id: "d3", name: "定积分计算与性质", freq: 3 },
    { id: "d4", name: "变限积分", freq: 3 },
    { id: "d5", name: "定积分比较大小", freq: 2 },
    { id: "d6", name: "反常积分计算与敛散", freq: 2 },
    { id: "d7", name: "定积分定义（黎曼和）", freq: 1 },
    { id: "d8", name: "积分不等式证明", freq: 2 },
  ]},
  { id: "E", name: "定积分应用", part: "高数", items: [
    { id: "e1", name: "平面面积（含极坐标）", freq: 2 },
    { id: "e2", name: "旋转体体积 / 侧面积", freq: 2 },
    { id: "e3", name: "弧长", freq: 2 },
    { id: "e4", name: "物理应用", freq: 1 },
  ]},
  { id: "F", name: "微分方程", part: "高数", items: [
    { id: "f1", name: "一阶方程（可分离 / 齐次 / 线性）", freq: 3 },
    { id: "f2", name: "高阶常系数齐次线性方程", freq: 2 },
    { id: "f3", name: "非齐次方程特解", freq: 2 },
    { id: "f4", name: "可降阶与综合应用", freq: 2 },
  ]},
  { id: "G", name: "多元微分", part: "高数", items: [
    { id: "g1", name: "偏导与全微分（复合 / 隐函数）", freq: 3 },
    { id: "g2", name: "连续 / 可偏导 / 可微判定", freq: 1 },
    { id: "g3", name: "由偏导还原函数", freq: 2 },
    { id: "g4", name: "二元极值与条件极值", freq: 3 },
  ]},
  { id: "H", name: "二重积分", part: "高数", items: [
    { id: "h1", name: "交换积分次序", freq: 2 },
    { id: "h2", name: "直角坐标计算", freq: 2 },
    { id: "h3", name: "极坐标计算", freq: 3 },
    { id: "h4", name: "积分区域识别与对称性", freq: 2 },
  ]},
  { id: "L1", name: "行列式与矩阵", part: "线代", items: [
    { id: "l1", name: "行列式计算与展开", freq: 2 },
    { id: "l2", name: "逆矩阵 / 初等变换 / 初等矩阵", freq: 2 },
    { id: "l3", name: "矩阵的秩与矩阵方程", freq: 2 },
  ]},
  { id: "L2", name: "向量组与方程组", part: "线代", items: [
    { id: "l4", name: "线性相关 / 线性表示 / 向量组等价", freq: 3 },
    { id: "l5", name: "线性方程组解的判定与结构", freq: 3 },
  ]},
  { id: "L3", name: "特征值与二次型", part: "线代", items: [
    { id: "l6", name: "特征值与特征向量", freq: 3 },
    { id: "l7", name: "相似对角化（含参）", freq: 3 },
    { id: "l8", name: "正交变换化标准形", freq: 3 },
    { id: "l9", name: "惯性指数 / 正定 / 合同", freq: 2 },
  ]},
];
