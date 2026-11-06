// pages/api/admin/login.js — 管理員 Email+密碼登入（bcrypt 比對 admin_users）
// 首次部署便利機制：若 admin_users 尚無此 Email，且輸入帳密符合環境變數
// ADMIN_EMAIL / ADMIN_PASSWORD，則自動建立該管理員（密碼以 bcrypt 雜湊儲存）。
// 之後即以資料庫中的雜湊驗證。正式環境請於首次登入後更換強密碼。
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "../../../lib/supabase";
import { createToken, sessionCookie } from "../../../lib/session";
import { rateLimit } from "../../../lib/rateLimit";
import { audit, reqMeta } from "../../../lib/helpers";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { ip } = reqMeta(req);
  if (!rateLimit(`adminlogin:${ip}`, { max: 5, windowMs: 60_000 }).ok)
    return res.status(429).json({ error: "嘗試次數過多，請稍後再試。" });

  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!email || !password) return res.status(400).json({ error: "請輸入帳號與密碼" });

  let { data: admin } = await supabaseAdmin
    .from("admin_users").select("id, name, email, password_hash").eq("email", email).maybeSingle();

  // 首次自動建立管理員（僅當帳密符合環境變數設定）
  if (!admin) {
    const envEmail = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const envPass = process.env.ADMIN_PASSWORD || "";
    if (envEmail && envPass && email === envEmail && password === envPass) {
      const hash = await bcrypt.hash(password, 10);
      const { data: created } = await supabaseAdmin
        .from("admin_users").insert({ email, password_hash: hash, name: "系統管理員" })
        .select("id, name, email, password_hash").single();
      admin = created;
      await audit({ actorType: "admin", actorId: admin?.id, actorName: admin?.name, action: "首次建立管理員帳號", req });
    }
  }

  const ok = admin && (await bcrypt.compare(password, admin.password_hash).catch(() => false));
  if (!ok) {
    await audit({ actorType: "admin", action: "後台登入失敗", target: email, req });
    return res.status(401).json({ error: "帳號或密碼錯誤。" });
  }

  await supabaseAdmin.from("admin_users").update({ last_login_at: new Date().toISOString() }).eq("id", admin.id);
  await audit({ actorType: "admin", actorId: admin.id, actorName: admin.name, action: "後台登入成功", req });
  // 只寫入 admin 專屬 cookie，不影響同瀏覽器其他分頁的 user_session
  res.setHeader("Set-Cookie", sessionCookie(createToken({ id: admin.id, actorType: "admin" }), "admin"));
  return res.json({ admin: { id: admin.id, name: admin.name } });
}
