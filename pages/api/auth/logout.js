// pages/api/auth/logout.js — 一般使用者登出：只清除 user_session，不影響 admin_session
import { clearCookie } from "../../../lib/session";
export default function handler(req, res) {
  res.setHeader("Set-Cookie", clearCookie("user"));
  return res.json({ ok: true });
}
