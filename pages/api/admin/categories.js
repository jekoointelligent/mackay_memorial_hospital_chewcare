// pages/api/admin/categories.js — 課程分類 CRUD
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit } from "../../../lib/helpers";

export default async function handler(req, res) {
  const sess = requireAdmin(req, res);
  if (!sess) return;

  if (req.method === "GET") {
    const { data, error } = await supabaseAdmin
      .from("course_categories").select("*").order("sort_order").order("name");
    if (error) {
      if (error.code === "42P01") return res.json({ categories: [] });
      return res.status(500).json({ error: error.message });
    }
    return res.json({ categories: data || [] });
  }

  if (req.method === "POST") {
    const { name, bg_color = "#FDECEA", text_color = "#E8392A", sort_order = 0 } = req.body || {};
    if (!name?.trim()) return res.status(400).json({ error: "請輸入分類名稱" });
    const { data, error } = await supabaseAdmin.from("course_categories")
      .insert({ name: name.trim(), bg_color, text_color, sort_order: Number(sort_order) || 0, status: "active" })
      .select().single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "分類名稱已存在" });
      return res.status(500).json({ error: error.message });
    }
    await audit({ actorType: "admin", actorId: sess.id, action: "新增課程分類", target: name.trim(), req });
    return res.json({ category: data });
  }

  if (req.method === "PATCH") {
    const { id, ...patch } = req.body || {};
    if (!id) return res.status(400).json({ error: "缺少 id" });
    const allowed = {};
    if (patch.name != null) allowed.name = String(patch.name).trim();
    if (patch.bg_color != null) allowed.bg_color = patch.bg_color;
    if (patch.text_color != null) allowed.text_color = patch.text_color;
    if (patch.sort_order != null) allowed.sort_order = Number(patch.sort_order) || 0;
    if (patch.status != null) allowed.status = patch.status === "inactive" ? "inactive" : "active";
    const { error } = await supabaseAdmin.from("course_categories").update(allowed).eq("id", id);
    if (error) return res.status(500).json({ error: error.message });
    await audit({ actorType: "admin", actorId: sess.id, action: "編輯課程分類", target: id, req });
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "缺少 id" });
    // 檢查該分類是否有課程
    const { data: cat } = await supabaseAdmin.from("course_categories").select("name").eq("id", id).maybeSingle();
    if (cat) {
      const { count } = await supabaseAdmin.from("courses").select("id", { count: "exact", head: true }).eq("category", cat.name);
      if (count > 0) return res.status(409).json({ error: `此分類下有 ${count} 門課程，請先移轉或刪除課程後再刪除分類，或改為「停用」。` });
    }
    await supabaseAdmin.from("course_categories").delete().eq("id", id);
    await audit({ actorType: "admin", actorId: sess.id, action: "刪除課程分類", target: id, req });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
