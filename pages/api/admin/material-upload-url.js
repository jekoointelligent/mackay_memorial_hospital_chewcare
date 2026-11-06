// pages/api/admin/material-upload-url.js
// 教材上傳 presigned URL：已改為 Cloudflare R2（Supabase Storage 已棄用）
import { getR2Config, makeR2Key, guessMime, createPresignedPut } from "../../../lib/r2";
import { requireAdmin } from "../../../lib/guard";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { filename, fileSize, courseId, unitId } = req.body || {};
  if (!filename) return res.status(400).json({ error: "缺少 filename" });

  const { ready } = getR2Config();
  if (!ready) {
    return res.status(503).json({
      error: "R2 尚未設定，請在 .env.local 填入 R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET_NAME、R2_PUBLIC_BASE_URL",
    });
  }

  const rawExt = String(filename).split(".").pop() || "bin";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const displayName = String(filename).trim().slice(0, 200) || "file";
  const key = makeR2Key("material", { courseId: courseId || "misc", unitId, filename });
  const contentType = guessMime(ext);

  try {
    const result = await createPresignedPut({ key, contentType });
    if (!result) throw new Error("R2 client 初始化失敗");
    return res.json({
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
      storageKey: key,
      filePath: key,          // 向下相容舊欄位名稱
      fileName: displayName,  // 原始中文檔名，前台顯示用
      fileSize: Number(fileSize) || 0,
      mimeType: contentType,
      storageProvider: "cloudflare_r2",
    });
  } catch (e) {
    console.error("[material-upload-url R2]", e.message);
    return res.status(500).json({ error: `R2 上傳準備失敗：${e.message}` });
  }
}
