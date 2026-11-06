// pages/api/admin/banner-upload-url.js
// Banner 圖片上傳 presigned URL：已改為 Cloudflare R2（Supabase Storage 已棄用）
import { getR2Config, makeR2Key, guessMime, createPresignedPut } from "../../../lib/r2";
import { requireAdmin } from "../../../lib/helpers";

export default async function handler(req, res) {
  const sess = requireAdmin(req, res);
  if (!sess) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { filename } = req.body || {};
  if (!filename) return res.status(400).json({ error: "缺少 filename" });

  const { ready } = getR2Config();
  if (!ready) {
    return res.status(503).json({
      error: "R2 尚未設定，請在 .env.local 填入 R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET_NAME、R2_PUBLIC_BASE_URL",
    });
  }

  const rawExt = String(filename).split(".").pop() || "bin";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const key = makeR2Key("banner", { filename });
  const contentType = guessMime(ext) || "image/jpeg";

  try {
    const result = await createPresignedPut({ key, contentType });
    if (!result) throw new Error("R2 client 初始化失敗");
    return res.json({
      uploadUrl: result.uploadUrl,
      publicUrl: result.publicUrl,
      storageKey: key,
      filePath: key,
      storageProvider: "cloudflare_r2",
    });
  } catch (e) {
    console.error("[banner-upload-url R2]", e.message);
    return res.status(500).json({ error: `R2 上傳準備失敗：${e.message}` });
  }
}
