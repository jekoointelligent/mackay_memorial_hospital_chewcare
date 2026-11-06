// pages/api/admin/tags.js — 取得所有已使用的使用者標籤（autocomplete 用）
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin } from "../../../lib/helpers";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { data, error } = await supabaseAdmin
      .from("users").select("tags").neq("tags", "{}");
    if (error) {
      if (error.code === "42703") return res.json({ tags: [] }); // column not yet created
      return res.status(500).json({ error: error.message });
    }
    const tagSet = new Set();
    (data || []).forEach(u => (u.tags || []).forEach(t => t && tagSet.add(t)));
    return res.json({ tags: [...tagSet].sort() });
  } catch (e) {
    return res.json({ tags: [] });
  }
}
