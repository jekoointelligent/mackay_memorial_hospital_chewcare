// lib/session.js — 免密碼序號登入後簽發的 HMAC session（httpOnly cookie）
// payload 內含 actorType（user|admin）、id、role、過期時間
//
// user 與 admin 使用「各自獨立」的 cookie，避免同一瀏覽器不同分頁分別登入
// 一般使用者與管理員時，後登入者把先登入者的 session 覆蓋掉。
import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 天

function sign(b64) { return crypto.createHmac("sha256", SECRET).update(b64).digest("base64url"); }

export function createToken({ id, actorType, role }) {
  const payload = { id, actorType, role, exp: Date.now() + MAX_AGE * 1000 };
  const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b64}.${sign(b64)}`;
}

export function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [b64, sig] = token.split(".");
  if (sign(b64) !== sig) return null;
  try {
    const p = JSON.parse(Buffer.from(b64, "base64url").toString());
    if (Date.now() > p.exp) return null;
    return p;
  } catch { return null; }
}

// 一般使用者 / 管理員各自獨立的 cookie 名稱
export const USER_COOKIE_NAME = "chewcare_user_session";
export const ADMIN_COOKIE_NAME = "chewcare_admin_session";
// 相容舊版單一 cookie：僅在對應的新 cookie 不存在時讀取，讓部署當下仍在線的舊 session
// 不會被立即登出；新登入一律只寫入上面對應角色的新 cookie，不再寫入這個名稱。
const LEGACY_COOKIE_NAME = "chewcare_session";

function cookieNameFor(actorType) { return actorType === "admin" ? ADMIN_COOKIE_NAME : USER_COOKIE_NAME; }

export function sessionCookie(token, actorType) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${cookieNameFor(actorType)}=${encodeURIComponent(token)}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; SameSite=lax${secure}`;
}
export function clearCookie(actorType) {
  return `${cookieNameFor(actorType)}=; Max-Age=0; Path=/; HttpOnly; SameSite=lax`;
}

function parseCookie(str = "") {
  return Object.fromEntries(
    str.split(";").map((c) => { const [k, ...v] = c.trim().split("="); return [k, decodeURIComponent(v.join("="))]; }).filter(([k]) => k)
  );
}
function cookiesOf(req) { return req.cookies || parseCookie(req.headers?.cookie); }

// 一般使用者 session：只信任 chewcare_user_session（或過渡期的舊版 cookie），
// 且 payload 內 actorType 必須是 user，避免任何情況下把管理員身分當成一般使用者。
export function getUserSession(req) {
  const cookies = cookiesOf(req);
  const raw = cookies?.[USER_COOKIE_NAME] || cookies?.[LEGACY_COOKIE_NAME];
  const p = verifyToken(raw);
  return p && p.actorType === "user" ? p : null;
}

// 管理員 session：只信任 chewcare_admin_session（或過渡期的舊版 cookie），
// 且 payload 內 actorType 必須是 admin，/api/admin/* 一律應使用這個函式驗證。
export function getAdminSession(req) {
  const cookies = cookiesOf(req);
  const raw = cookies?.[ADMIN_COOKIE_NAME] || cookies?.[LEGACY_COOKIE_NAME];
  const p = verifyToken(raw);
  return p && p.actorType === "admin" ? p : null;
}

// 前台共用端點（例如影片進度、測驗）：優先採用一般使用者 session；
// 若該瀏覽器沒有登入一般使用者，才退回管理員 session（後台「← 前台」預覽模式）。
// 呼叫端仍須依 actorType === "admin" 判斷是否要略過進度寫入。
export function getFrontendSession(req) {
  return getUserSession(req) || getAdminSession(req);
}

// 相容層：不分角色回傳「目前這個請求帶著的任一個有效 session」。
// 新程式碼請改用上面三個明確語意的函式，避免角色誤判。
export function getSession(req) {
  return getFrontendSession(req);
}
