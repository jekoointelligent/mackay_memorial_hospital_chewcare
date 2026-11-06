// pages/api/admin/r2-upload.js
// 統一 R2 presigned PUT URL 產生（影片 / 教材 / Banner / 所有後台上傳）
// body: { filename, type?, courseId?, unitId?, contentType? }
// type: "video" | "material" | "banner" | "home-card"（預設 "video"）
import { getR2Config, makeR2Key, guessMime, createPresignedPut } from "../../../lib/r2";
import { requireAdmin } from "../../../lib/helpers";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const sess = requireAdmin(req, res);
  if (!sess) return;

  const { ready } = getR2Config();
  if (!ready) {
    return res.status(503).json({
      error: "R2 尚未設定，請在 .env.local 填入 R2_ACCOUNT_ID、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY、R2_BUCKET_NAME、R2_PUBLIC_BASE_URL",
    });
  }

  const { filename = "file", type = "video", courseId = "misc", unitId, contentType } = req.body || {};
  if (!filename) return res.status(400).json({ error: "缺少 filename" });

  const rawExt = String(filename).split(".").pop() || "bin";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const mime = contentType || guessMime(ext);
  const key = makeR2Key(type, { courseId, unitId, filename });

  try {
    const result = await createPresignedPut({ key, contentType: mime });
    if (!result) throw new Error("R2 client 初始化失敗");
    return res.json({ uploadUrl: result.uploadUrl, publicUrl: result.publicUrl, key, storageProvider: "cloudflare_r2" });
  } catch (e) {
    console.error("[r2-upload]", e.message);
    const msg = /cors/i.test(e.message)
      ? "R2 CORS 尚未設定或網域未允許，請在 R2 bucket 設定 CORS 規則"
      : `R2 簽章失敗：${e.message}`;
    return res.status(500).json({ error: msg });
  }
}
