import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 开发时把 /api 转发到本机服务器；演示版（--mode demo）不需要服务器，数据存在浏览器里
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react()],
  define: { __DEMO__: JSON.stringify(mode === "demo") },
  build: { outDir: mode === "demo" ? "dist-demo" : "dist", chunkSizeWarningLimit: 1500 },
  server: {
    port: 5173,
    proxy: { "/api": process.env.API_URL ?? "http://localhost:8787" },
  },
}));
