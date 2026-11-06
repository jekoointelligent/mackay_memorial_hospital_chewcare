// pages/api/admin/admin-users.js — 管理員帳號 CRUD
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit } from "../../../lib/helpers";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  const sess = requireAdmin(req, res);
  if (!sess) return;

  if (req.method === "GET") {
    const { data } = await supabaseAdmin
      .from("admin_users")
      .select("id, email, name, role, status, created_at, last_login_at")
      .order("created_at");
    return res.json({ admins: data || [] });
  }

  if (req.method === "POST") {
    const { email, password, name, role = "admin", status = "active" } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "請填寫 Email 和密碼" });
    if (password.length < 8) return res.status(400).json({ error: "密碼至少 8 個字元" });
    const hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabaseAdmin
      .from("admin_users")
      .insert({ email: email.trim().toLowerCase(), password_hash: hash, name: name || "管理員", role, status })
      .select("id, email, name, role, status, created_at")
      .single();
    if (error) return res.status(409).json({ error: "Email 已存在或建立失敗" });
    await audit({ actorType: "admin", actorId: sess.id, action: "新增管理員", target: email, req });
    return res.json({ admin: data });
  }

  if (req.method === "PATCH") {
    const { id, email, name, role, status, password } = req.body || {};
    if (!id) return res.status(400).json({ error: "缺少 id" });
    if (id === sess.id && status === "inactive") {
      return res.status(400).json({ error: "不可停用目前登入的自己" });
    }
    if (status === "inactive") {
      const { data: rest } = await supabaseAdmin
        .from("admin_users").select("id").eq("status", "active").neq("id", id);
      if (!rest || rest.length === 0) {
        return res.status(400).json({ error: "不可停用最後一個啟用的管理員" });
      }
    }
    const patch = {};
    if (email) patch.email = email.trim().toLowerCase();
    if (name != null) patch.name = name;
    if (role) patch.role = role;
    if (status) patch.status = status;
    if (password) {
      if (password.length < 8) return res.status(400).json({ error: "新密碼至少 8 個字元" });
      patch.password_hash = await bcrypt.hash(password, 10);
    }
    if (Object.keys(patch).length === 0) return res.json({ ok: true });
    const { error } = await supabaseAdmin.from("admin_users").update(patch).eq("id", id);
    if (error) return res.status(500).json({ error: "更新失敗" });
    await audit({ actorType: "admin", actorId: sess.id, action: "編輯管理員", target: email || id, req });
    return res.json({ ok: true });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "缺少 id" });
    if (id === sess.id) return res.status(400).json({ error: "不可刪除目前登入的自己" });
    const { data: all } = await supabaseAdmin.from("admin_users").select("id");
    if (!all || all.length <= 1) return res.status(400).json({ error: "不可刪除最後一個管理員帳號" });
    await supabaseAdmin.from("admin_users").delete().eq("id", id);
    await audit({ actorType: "admin", actorId: sess.id, action: "刪除管理員", target: id, req });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
