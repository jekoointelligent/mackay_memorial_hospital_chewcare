// pages/api/admin/banners.js — 後台首頁 Banner CRUD
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit } from "../../../lib/helpers";

export default async function handler(req, res) {
  try {
    const sess = requireAdmin(req, res);
    if (!sess) return;

    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin
        .from("home_banners").select("*").order("sort_order").order("created_at");
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ banners: data || [] });
    }

    if (req.method === "POST") {
      const { title, subtitle, image_url, image_path, storage_key, storage_provider, link_url, button_text, sort_order, status } = req.body || {};
      if (!title && !image_url) return res.status(400).json({ error: "標題或圖片至少填一項" });
      const { data, error } = await supabaseAdmin.from("home_banners").insert({
        title: title || "",
        subtitle: subtitle || "",
        image_url: image_url || "",
        image_path: image_path || "",
        storage_key: storage_key || null,
        storage_provider: storage_provider || null,
        link_url: link_url || "",
        button_text: button_text || "了解更多",
        sort_order: Number(sort_order) || 0,
        status: status || "draft",
      }).select().single();
      if (error) return res.status(500).json({ error: error.message });
      await audit({ actorType: "admin", actorId: sess.id, action: "新增 Banner", target: title || "", req });
      return res.json({ banner: data });
    }

    if (req.method === "PATCH") {
      const { id, ...patch } = req.body || {};
      if (!id) return res.status(400).json({ error: "缺少 id" });
      const allowed = ["title", "subtitle", "image_url", "image_path", "storage_key", "storage_provider", "link_url", "button_text", "sort_order", "status"];
      const safe = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
      if (safe.sort_order !== undefined) safe.sort_order = Number(safe.sort_order) || 0;
      safe.updated_at = new Date().toISOString();
      const { error } = await supabaseAdmin.from("home_banners").update(safe).eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      await audit({ actorType: "admin", actorId: sess.id, action: "更新 Banner", target: id, req });
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: "缺少 id" });
      const { error } = await supabaseAdmin.from("home_banners").delete().eq("id", id);
      if (error) return res.status(500).json({ error: error.message });
      await audit({ actorType: "admin", actorId: sess.id, action: "刪除 Banner", target: id, req });
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: `伺服器例外：${e.message}` });
  }
}
