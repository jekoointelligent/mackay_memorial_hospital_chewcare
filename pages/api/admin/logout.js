// pages/api/admin/logout.js — 管理員登出：只清除 admin_session，不影響 user_session
import { clearCookie } from "../../../lib/session";
export default function handler(req, res) {
  res.setHeader("Set-Cookie", clearCookie("admin"));
  return res.json({ ok: true });
}
