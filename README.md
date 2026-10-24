# 数二备考系统

每天把学习内容（做题照片、PDF、笔记）上传上来，系统自动**评估、归档、总结、记忆**，找出薄弱点，安排第二天的训练。题目在自己的本子上做，系统不出题。

- **网页版**：能力地图、知识框架图、诊断、报告、卡片管理，适合在电脑上看全局。
- **App**（iOS / 安卓）：拍照上传、今日计划、刷记忆卡。
- 架构和算法说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 快速开始

需要 Node.js 22.13 或更高版本。

```bash
npm install

# 1. 构建网页版
npm run build:web

# 2. 启动服务器（网页版也由它提供）
export ANTHROPIC_API_KEY=你的密钥      # 不设置也能用，只是不能 AI 分析
export TZ=Asia/Shanghai
npm start
```

打开 http://localhost:8787 。第一次启动会写入你 2021、2022 数二真题的判卷结果作为初始数据（设置 `SEED=0` 可跳过）。

### 服务器配置（环境变量）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 无 | 有了它才能 AI 分析上传内容 |
| `PORT` | 8787 | 端口 |
| `DATA_DIR` | apps/server/data | 数据库和上传文件的位置 |
| `ACCESS_TOKEN` | 无 | 设置后访问需要口令（部署到公网时一定要设） |
| `AI_MODEL` | claude-opus-5-5 | 分析用的模型 |
| `AI_EFFORT` | high | 分析的思考强度：low / medium / high / xhigh / max |
| `SEED` | 1 | 设为 0 不写入初始数据 |
| `TZ` | 系统时区 | 建议设为 Asia/Shanghai，「今天」按北京时间算 |

## App

```bash
npm run dev:mobile
```

用手机上的 Expo Go 扫终端里的二维码即可打开。App 默认是**本机模式**：数据存在手机里，开箱就能用，但不能 AI 分析。要启用 AI，在 App 的「诊断 → 设置」里选「我的服务器」，填服务器启动时显示的局域网地址（例如 `http://192.168.1.10:8787`，手机和电脑要在同一个 Wi-Fi），或者部署到云服务器上的地址。

## 开发

```bash
npm run dev:server     # 服务器（自动重启）
npm run dev:web        # 网页版开发服务器 http://localhost:5173 ，/api 转发到 8787
npm run build:demo     # 构建不需要服务器的网页演示版（数据存在浏览器里）
npm test               # 核心算法测试
npm run typecheck      # 全部类型检查
```
