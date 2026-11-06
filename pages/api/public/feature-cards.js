// pages/api/public/feature-cards.js — 前台：取得已上架首頁卡片
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { data, error } = await supabaseAdmin
      .from("feature_cards")
      .select("id, icon, title, description, bg_color, sort_order")
      .eq("status", "published")
      .order("sort_order")
      .limit(6);
    if (error) {
      // 若 feature_cards 資料表尚未建立，靜默回傳空陣列
      if (error.code === "42P01") return res.json({ cards: [] });
      return res.status(500).json({ error: error.message });
    }
    return res.json({ cards: data || [] });
  } catch (e) {
    return res.json({ cards: [] });
  }
}
