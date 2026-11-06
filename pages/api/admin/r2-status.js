// pages/api/admin/r2-status.js — 檢查 R2 設定是否完整（不回傳 secret）
import { requireAdmin } from "../../../lib/helpers";

export default async function handler(req, res) {
  const sess = requireAdmin(req, res);
  if (!sess) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const keys = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_BASE_URL"];
  const missing = keys.filter(k => !process.env[k]);
  const configured = missing.length === 0;

  return res.json({
    configured,
    missing,
    bucket: process.env.R2_BUCKET_NAME || null,
    publicBase: process.env.R2_PUBLIC_BASE_URL || null,
  });
}
