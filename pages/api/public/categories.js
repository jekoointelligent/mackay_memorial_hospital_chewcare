// pages/api/public/categories.js — 取得啟用中的課程分類（前台用）
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { data, error } = await supabaseAdmin
      .from("course_categories").select("id,name,bg_color,text_color,sort_order")
      .eq("status", "active").order("sort_order").order("name");
    if (error) {
      if (error.code === "42P01") return res.json({ categories: [] });
      return res.status(500).json({ error: error.message });
    }
    return res.json({ categories: data || [] });
  } catch (e) {
    return res.json({ categories: [] });
  }
}
