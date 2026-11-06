// pages/api/admin/me.js — 後台「目前登入管理員」查詢
// 只信任 chewcare_admin_session；就算同瀏覽器另一分頁有 user_session，也完全不受影響。
// 後台 AdminPage 的身分檢查請一律呼叫這支，不要呼叫 /api/auth/me。
import { supabaseAdmin } from "../../../lib/supabase";
import { getAdminSession } from "../../../lib/session";

export default async function handler(req, res) {
  const sess = getAdminSession(req);
  if (!sess) return res.status(401).json({ user: null });
  const { data } = await supabaseAdmin.from("admin_users").select("id, name, role, status").eq("id", sess.id).maybeSingle();
  if (!data || data.status !== "active") return res.status(401).json({ user: null });
  return res.json({ user: { id: data.id, name: data.name, role: data.role || "admin", actorType: "admin" } });
}
