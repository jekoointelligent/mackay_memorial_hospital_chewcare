// lib/helpers.js — 共用工具（統一以 session 的 { id, actorType } 為準）
import { supabaseAdmin } from "./supabase";
import { getAdminSession, getUserSession } from "./session";

export function normalizePhone(raw) { return String(raw || "").replace(/\D/g, ""); }
export function isValidTwMobile(p) { return /^09\d{8}$/.test(p); }

export function reqMeta(req) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
  const device = req.headers["user-agent"]?.slice(0, 160) || "";
  return { ip, device };
}

export async function audit({ actorType = "system", actorId = null, actorName = null, action, target = null, req }) {
  const meta = req ? reqMeta(req) : {};
  try {
    await supabaseAdmin.from("audit_logs").insert({
      actor_type: actorType, actor_id: actorId, actor_name: actorName,
      action, target, ip: meta.ip || null, device: meta.device || null,
    });
  } catch (e) { /* 稽核失敗不阻斷主流程 */ }
}

// 只信任 chewcare_admin_session，絕不把一般使用者的 user_session 當成管理員
export function requireAdmin(req, res) {
  const sess = getAdminSession(req);
  if (!sess) { res.status(403).json({ error: "需要管理員權限" }); return null; }
  return sess;
}
// 只信任 chewcare_user_session，絕不把管理員的 admin_session 當成一般使用者
export function requireUser(req, res) {
  const sess = getUserSession(req);
  if (!sess) { res.status(401).json({ error: "請先登入" }); return null; }
  return sess;
}
