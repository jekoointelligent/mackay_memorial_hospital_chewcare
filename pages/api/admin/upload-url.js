// pages/api/admin/upload-url.js — 產生 Supabase Storage 上傳簽章 URL
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin } from "../../../lib/guard";
const BUCKET = "videos";
export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const filename = String(req.body?.filename || "").replace(/[^\w.\-]/g, "_");
  if (!filename) return res.status(400).json({ error: "缺少檔名" });
  const path = `${Date.now()}_${filename}`;
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) return res.status(500).json({ error: "請先在 Supabase 建立名為 videos 的 public bucket" });
  const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return res.json({ uploadUrl: data.signedUrl, publicUrl: pub.publicUrl });
}
