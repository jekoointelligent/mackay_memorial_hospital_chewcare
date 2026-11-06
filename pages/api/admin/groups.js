// pages/api/admin/groups.js — 分類 CRUD（含 user_count）
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit } from "../../../lib/helpers";

// true if the Supabase error is "column does not exist" (migration not yet run)
function isMissingColumn(err) {
  return err && (err.code === "42703" || String(err.message || "").includes("does not exist"));
}

export default async function handler(req, res) {
  const sess = requireAdmin(req, res);
  if (!sess) return;

  if (req.method === "GET") {
    // Try with sort_order; if column missing fall back to name-only order
    let { data: groups, error: gErr } = await supabaseAdmin
      .from("groups").select("*").order("sort_order").order("name");
    if (gErr) {
      ({ data: groups } = await supabaseAdmin.from("groups").select("*").order("name"));
    }
    const { data: userRows } = await supabaseAdmin
      .from("users").select("group_id").not("group_id", "is", null);
    const countMap = {};
    (userRows || []).forEach(u => { countMap[u.group_id] = (countMap[u.group_id] || 0) + 1; });
    return res.json({ groups: (groups || []).map(g => ({ ...g, user_count: countMap[g.id] || 0 })) });
  }

  if (req.method === "POST") {
    const { name, description, sort_order, status } = req.body || {};
    const nameStr = String(name || "").trim();
    if (!nameStr) return res.status(400).json({ error: "請輸入分類名稱" });

    // Try full insert (requires migration_v3.sql to have been run)
    let { data, error } = await supabaseAdmin.from("groups")
      .insert({ name: nameStr, description: description || null, sort_order: Number(sort_order) || 0, status: status || "active" })
      .select().single();

    if (error && isMissingColumn(error)) {
      // Migration not run yet — insert with only the base columns
      ({ data, error } = await supabaseAdmin.from("groups")
        .insert({ name: nameStr })
        .select().single());
    }

    if (error) {
      if (error.code === "23505") return res.status(409).json({ error: "分類名稱已存在" });
      return res.status(500).json({ error: "建立失敗，請至 Supabase SQL Editor 執行 migration_v3.sql" });
    }

    await audit({ actorType: "admin", actorId: sess.id, action: "新增分類", target: nameStr, req });
    return res.json({ group: data });
  }

  if (req.method === "PATCH") {
    const { id, name, description, sort_order, status } = req.body || {};
    if (!id) return res.status(400).json({ error: "缺少 id" });
    const patch = {};
    if (name != null) patch.name = String(name).trim();
    if (description !== undefined) patch.description = description;
    if (sort_order !== undefined) patch.sort_order = Number(sort_order) || 0;
    if (status) patch.status = status;
    if (Object.keys(patch).length === 0) return res.json({ ok: true });
    const { error } = await supabaseAdmin.from("groups").update(patch).eq("id", id);
    if (error) return res.status(500).json({ error: "更新失敗" });
    await audit({ actorType: "admin", actorId: sess.id, action: "編輯分類", target: name || id, req });
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "缺少 id" });
    const { data: users } = await supabaseAdmin.from("users").select("id").eq("group_id", id).limit(1);
    if (users && users.length > 0) {
      return res.status(400).json({ error: "此分類已有使用者，請先移轉或停用" });
    }
    await supabaseAdmin.from("groups").delete().eq("id", id);
    await audit({ actorType: "admin", actorId: sess.id, action: "刪除分類", target: id, req });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
