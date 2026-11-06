// pages/api/auth/me.js — 前台「目前登入者」查詢
// 優先採用一般使用者 session；若此瀏覽器沒有登入一般使用者，才退回管理員 session
// （對應後台「← 前台」的預覽模式）。管理員後台本身的身分驗證請改用 /api/admin/me，
// 不要用這支端點，避免 user_session 被誤當成管理員身分。
import { supabaseAdmin } from "../../../lib/supabase";
import { getFrontendSession } from "../../../lib/session";

export default async function handler(req, res) {
  const sess = getFrontendSession(req);
  if (!sess) return res.status(401).json({ user: null });
  if (sess.actorType === "admin") {
    const { data } = await supabaseAdmin.from("admin_users").select("id, name, role, status").eq("id", sess.id).maybeSingle();
    if (!data || data.status !== "active") return res.json({ user: null });
    return res.json({ user: { id: data.id, name: data.name, role: data.role || "admin", actorType: "admin" } });
  }
  const { data: u } = await supabaseAdmin.from("users").select("id, name, status").eq("id", sess.id).maybeSingle();
  if (!u || u.status !== "active") return res.json({ user: null });
  return res.json({ user: { id: u.id, name: u.name, role: "user", actorType: "user" } });
}
