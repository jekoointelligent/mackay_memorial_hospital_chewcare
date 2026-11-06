// pages/api/public/stats.js — 公開統計，只回傳數字，不含任何個資
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    // 累計使用人次 = audit_logs 中「登入成功」的總次數
    const { count: visitCount } = await supabaseAdmin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "登入成功");

    return res.json({ visitCount: visitCount || 0 });
  } catch (e) {
    console.error("[public/stats]", e.message);
    return res.status(500).json({ error: "統計查詢失敗" });
  }
}
