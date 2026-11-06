// pages/api/public/banners.js — 公開：取得第一筆已上架的首頁 Banner
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { data, error } = await supabaseAdmin
      .from("home_banners")
      .select("id, title, subtitle, image_url, link_url, button_text")
      .eq("status", "published")
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    if (error) {
      // home_banners 表尚未建立時靜默回傳 null（migration 尚未執行）
      return res.json({ banner: null });
    }
    return res.json({ banner: data || null });
  } catch (e) {
    return res.json({ banner: null });
  }
}
