// pages/api/admin/users.js
// 後台使用者管理：列表(搜尋) / 新增 / 編輯 / 停用啟用 / 改序號 / 重設序號 / 刪除
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit, normalizePhone, isValidTwMobile } from "../../../lib/helpers";

export default async function handler(req, res) {
  const sess = requireAdmin(req, res);
  if (!sess) return;

  // ── 列表（支援搜尋 q：姓名 / 手機 / 序號）──
  if (req.method === "GET") {
    const q = String(req.query.q || "").trim();
    const gid = String(req.query.group_id || "").trim();
    const tag = String(req.query.tag || "").trim();
    let query = supabaseAdmin
      .from("users")
      .select("id, name, phone, login_code, status, group_id, tags, created_at, last_login_at, groups(name)")
      .order("created_at", { ascending: false });
    if (q) {
      const norm = normalizePhone(q);
      query = query.or(`name.ilike.%${q}%,login_code.ilike.%${norm || q}%,phone_normalized.ilike.%${norm || q}%`);
    }
    if (gid) query = query.eq("group_id", gid);
    if (tag) query = query.contains("tags", [tag]);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: "查詢失敗" });
    return res.json({ users: (data || []).map(u => ({ ...u, group_name: u.groups?.name || null })) });
  }

  // ── 新增使用者 ──
  if (req.method === "POST") {
    const name = String(req.body?.name || "").trim();
    const phoneNorm = normalizePhone(req.body?.phone);
    const groupId = req.body?.group_id || null;
    const status = req.body?.status === "inactive" ? "inactive" : "active";
    if (!name) return res.status(400).json({ error: "請輸入姓名" });
    if (!isValidTwMobile(phoneNorm)) return res.status(400).json({ error: "請輸入正確的 10 碼手機號碼（09 開頭）" });

    const { data: dup } = await supabaseAdmin.from("users").select("id").eq("login_code", phoneNorm).maybeSingle();
    if (dup) return res.status(409).json({ error: "此手機號／序號已存在" });

    const tags = Array.isArray(req.body?.tags) ? req.body.tags.filter(Boolean) : [];
    const { data, error } = await supabaseAdmin.from("users").insert({
      name, phone: req.body.phone, phone_normalized: phoneNorm,
      login_code: phoneNorm,
      group_id: groupId, status, tags, created_by: sess.id,
    }).select().single();
    if (error) return res.status(500).json({ error: "建立失敗" });
    await audit({ actorType: "admin", actorId: sess.id, action: "新增使用者", target: `${name}（${phoneNorm}）`, req });
    return res.json({ user: data });
  }

  // ── 編輯（姓名/分組/狀態/序號）──
  if (req.method === "PATCH") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "缺少 id" });
    const patch = { updated_at: new Date().toISOString() };
    if (req.body.name != null) patch.name = String(req.body.name).trim();
    if (req.body.group_id !== undefined) patch.group_id = req.body.group_id || null;
    if (req.body.tags !== undefined) patch.tags = Array.isArray(req.body.tags) ? req.body.tags.filter(Boolean) : [];
    if (req.body.status) patch.status = req.body.status === "inactive" ? "inactive" : "active";
    let logAction = "編輯使用者";
    if (req.body.loginCode) {
      const code = normalizePhone(req.body.loginCode);
      if (code.length !== 10) return res.status(400).json({ error: "登入序號須為 10 碼" });
      const { data: dup } = await supabaseAdmin.from("users").select("id").eq("login_code", code).neq("id", id).maybeSingle();
      if (dup) return res.status(409).json({ error: "此序號已被其他使用者使用" });
      patch.login_code = code;
      logAction = "修改登入序號";
    }
    if (req.body.resetCode) {
      // 重設序號為手機號
      const { data: u } = await supabaseAdmin.from("users").select("phone_normalized").eq("id", id).single();
      const code = u?.phone_normalized;
      const { data: dup } = await supabaseAdmin.from("users").select("id").eq("login_code", code).neq("id", id).maybeSingle();
      if (dup) return res.status(409).json({ error: "手機號序號已被佔用，請手動指定" });
      patch.login_code = code;
      logAction = "重設登入序號為手機號";
    }
    const { error } = await supabaseAdmin.from("users").update(patch).eq("id", id);
    if (error) return res.status(500).json({ error: "更新失敗" });
    await audit({ actorType: "admin", actorId: sess.id, action: logAction, target: id, req });
    return res.json({ ok: true });
  }

  // ── 刪除 ──
  if (req.method === "DELETE") {
    const { id } = req.body || {};
    await supabaseAdmin.from("users").delete().eq("id", id);
    await audit({ actorType: "admin", actorId: sess.id, action: "刪除使用者", target: id, req });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
