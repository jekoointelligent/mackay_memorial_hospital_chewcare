// lib/materialType.js — 素材類型判斷共用邏輯
// 後台素材管理、HTML 素材庫（adminHtmlLibrary）、課程管理的單元編輯器、前台教材區塊
// 都必須用同一套規則判斷「這筆素材是不是 HTML」，避免各自寫一套，
// 導致「素材庫認得、課程不認得」或「課程認得、UI 顯示其他」這類分類不一致的問題。
//
// 純函式、不碰資料庫也不用任何 server-only 套件，前後端（API routes 與瀏覽器端的
// pages/admin.js、pages/index.js）都可以直接 import。

const HTML_EXTS = new Set(["html", "htm"]);

// 已知副檔名 → file_type 對照表（沿用素材上傳時原本的分類邏輯，集中到這裡維護）
const EXT_TYPE_MAP = {
  pdf: "pdf",
  docx: "docx", doc: "docx",
  pptx: "pptx", ppt: "pptx",
  jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image", svg: "image",
  html: "html", htm: "html",
  mp4: "video", mov: "video", webm: "video", avi: "video", m4v: "video",
};

// HTML 上傳到 R2 時使用的標準 Content-Type / mime_type
export const HTML_MIME = "text/html; charset=utf-8";

function extOf(name) {
  if (!name) return "";
  const clean = String(name).split(/[?#]/)[0]; // 去掉 URL 的 querystring / hash 再取副檔名
  const m = clean.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : "";
}

function pathnameOf(url) {
  if (!url) return "";
  try { return new URL(url).pathname; } catch { return String(url); }
}

/** 檔名（或任何帶副檔名的字串）是否為 .html / .htm，大小寫不拘 */
export function isHtmlFilename(name) {
  return HTML_EXTS.has(extOf(name));
}

/**
 * 依檔名 + mime type 判斷素材種類，上傳當下（還沒有 materials row）就能用。
 * @param {{ filename?: string, mimeType?: string }} info
 * @returns {"pdf"|"docx"|"pptx"|"image"|"html"|"video"|"other"}
 */
export function detectMaterialType({ filename, mimeType } = {}) {
  const mime = String(mimeType || "").toLowerCase().trim();
  if (mime === "text/html" || mime.startsWith("text/html")) return "html";
  if (isHtmlFilename(filename)) return "html";
  const ext = extOf(filename);
  return EXT_TYPE_MAP[ext] || "other";
}

/**
 * 判斷一筆已存在的 materials 資料是否為「互動網頁（HTML）」。
 * 不只看 file_type —— 舊資料可能是在「file_type 會自動判斷成 html」這個邏輯上線前
 * 上傳的，file_type 仍停留在 'other'，因此改成不論 file_type 內容為何，只要符合
 * 下列任一條件即視為 HTML（副檔名比對一律忽略大小寫）：
 *   1. mime_type 是 text/html（或以 text/html 開頭，例如帶 charset）
 *   2. file_name 副檔名為 .html / .htm
 *   3. storage_key 副檔名為 .html / .htm
 *   4. file_url 的 pathname 副檔名為 .html / .htm
 * @param {{ mime_type?: string, file_name?: string, storage_key?: string, file_url?: string }} material
 */
export function isHtmlMaterial(material) {
  if (!material) return false;
  const mime = String(material.mime_type || "").toLowerCase().trim();
  if (mime === "text/html" || mime.startsWith("text/html")) return true;
  if (isHtmlFilename(material.file_name)) return true;
  if (isHtmlFilename(material.storage_key)) return true;
  if (isHtmlFilename(pathnameOf(material.file_url))) return true;
  return false;
}
