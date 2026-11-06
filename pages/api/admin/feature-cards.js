// pages/api/admin/feature-cards.js — 首頁卡片 CRUD（後台管理）
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit } from "../../../lib/helpers";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("feature_cards").select("*").order("sort_order").order("created_at");
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ cards: data || [] });
  }

  if (req.method === "POST") {
    const { icon, title, description, bg_color, sort_order, status } = req.body || {};
    if (!title) return res.status(400).json({ error: "title 必填" });
    const { data, error } = await supabaseAdmin.from("feature_cards").insert({
      icon: icon || "✨",
      title,
      description: description || "",
      bg_color: bg_color || "#FDECEA",
      sort_order: Number(sort_order) || 0,
      status: status || "draft",
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await audit({ req, action: "新增首頁卡片", target: title });
    return res.json({ card: data });
  }

  if (req.method === "PATCH") {
    const { id, ...fields } = req.body || {};
    if (!id) return res.status(400).json({ error: "id 必填" });
    const allowed = ["icon", "title", "description", "bg_color", "sort_order", "status"];
    const update = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));
    if (update.sort_order !== undefined) update.sort_order = Number(update.sort_order) || 0;
    if (!Object.keys(update).length) return res.status(400).json({ error: "無可更新欄位" });
    const { data, error } = await supabaseAdmin
      .from("feature_cards").update(update).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await audit({ req, action: "更新首頁卡片", target: id });
    return res.json({ card: data });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "id 必填" });
    const { error } = await supabaseAdmin.from("feature_cards").delete().eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    await audit({ req, action: "刪除首頁卡片", target: id });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
