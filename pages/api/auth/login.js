// pages/api/auth/login.js — 民眾序號登入（免密碼，需 status=active，禁註冊）
import { supabaseAdmin } from "../../../lib/supabase";
import { createToken, sessionCookie } from "../../../lib/session";
import { rateLimit } from "../../../lib/rateLimit";
import { audit, reqMeta, normalizePhone } from "../../../lib/helpers";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { ip } = reqMeta(req);
  if (!rateLimit(`login:${ip}`, { max: 8, windowMs: 60_000 }).ok) {
    await audit({ actorType: "user", action: "登入失敗（速率限制）", target: ip, req });
    return res.status(429).json({ error: "嘗試次數過多，請稍後再試。" });
  }
  const code = normalizePhone(req.body?.code);
  if (code.length !== 10) return res.status(400).json({ error: "請輸入 10 碼登入序號" });

  const { data: user } = await supabaseAdmin
    .from("users").select("id, name, status, login_code").eq("login_code", code).maybeSingle();

  if (!user || user.status !== "active") {
    await audit({ actorType: "user", action: "登入失敗", target: `序號 ${code}（不存在或未啟用）`, req });
    return res.status(401).json({ error: "此登入序號尚未開通，請洽管理人員。" });
  }

  await supabaseAdmin.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", user.id);
  await audit({ actorType: "user", actorId: user.id, actorName: user.name, action: "登入成功", req });

  // 只寫入 user 專屬 cookie，不影響同瀏覽器其他分頁的 admin_session
  res.setHeader("Set-Cookie", sessionCookie(createToken({ id: user.id, actorType: "user" }), "user"));
  return res.json({ user: { id: user.id, name: user.name } });
}
