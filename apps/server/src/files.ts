// 附件存储：保存在 DATA_DIR/uploads/<学习记录 id>/ 下。

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config.ts";

const SUPPORTED = new Set(["application/pdf", "image/jpeg", "image/png", "image/gif", "image/webp", "text/plain", "text/markdown"]);

export function isSupported(mime: string, name: string): boolean {
  return SUPPORTED.has(normalizeMime(mime, name));
}

/** 浏览器有时给不出类型，按扩展名补全 */
export function normalizeMime(mime: string, name: string): string {
  if (mime && mime !== "application/octet-stream") return mime === "image/jpg" ? "image/jpeg" : mime;
  const ext = path.extname(name).toLowerCase();
  const byExt: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".txt": "text/plain",
    ".md": "text/markdown",
  };
  return byExt[ext] ?? mime ?? "application/octet-stream";
}

function safeName(name: string): string {
  const base = path.basename(name).replace(/[^\p{L}\p{N}._-]+/gu, "_");
  return base.slice(-80) || "file";
}

/** 保存一个上传的文件，返回相对于数据目录的路径 */
export async function saveUpload(folder: string, name: string, data: Buffer): Promise<string> {
  const rel = path.join("uploads", folder, `${Date.now().toString(36)}-${safeName(name)}`);
  const abs = path.join(config.dataDir, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);
  return rel;
}

function resolveInside(rel: string): string {
  const abs = path.resolve(config.dataDir, rel);
  if (!abs.startsWith(path.resolve(config.dataDir) + path.sep)) throw new Error("非法的文件路径");
  return abs;
}

export async function readUpload(rel: string): Promise<Buffer> {
  return readFile(resolveInside(rel));
}

export async function removeUploads(rels: string[]): Promise<void> {
  for (const rel of rels) {
    if (!rel) continue;
    await rm(resolveInside(rel), { force: true }).catch(() => undefined);
  }
}
