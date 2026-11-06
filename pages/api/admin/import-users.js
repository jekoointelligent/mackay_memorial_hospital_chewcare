// pages/api/admin/import-users.js
// 批次匯入使用者。前端用 papaparse 解析 CSV/Excel 後，POST 一個 rows 陣列：
//   [{ name, phone, group, status }, ...]
// 後端逐筆驗證、標準化、寫入；回報成功/略過/失敗統計。
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit, normalizePhone, isValidTwMobile } from "../../../lib/helpers";

export default async function handler(req, res) {
  const sess = requireAdmin(req, res);
  if (!sess) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
  if (rows.length === 0) return res.status(400).json({ error: "沒有可匯入的資料" });
  if (rows.length > 1000) return res.status(400).json({ error: "單次最多匯入 1000 筆" });

  // 預載分組名稱 → id
  const { data: groups } = await supabaseAdmin.from("groups").select("id, name");
  const groupMap = Object.fromEntries((groups || []).map(g => [g.name.trim(), g.id]));

  // 預載既有序號避免重複
  const { data: existing } = await supabaseAdmin.from("users").select("login_code");
  const used = new Set((existing || []).map(u => u.login_code));

  const toInsert = [];
  const errors = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] || {};
    const name = String(r.name || r["姓名"] || "").trim();
    const phoneNorm = normalizePhone(r.phone || r["手機"] || r["手機號碼"]);
    const groupName = String(r.group || r["分組"] || r["所屬分組"] || "").trim();
    const status = String(r.status || r["狀態"] || "active").trim() === "inactive" ? "inactive" : "active";

    if (!name || !isValidTwMobile(phoneNorm)) { errors.push(`第 ${i + 1} 列：姓名或手機格式錯誤`); continue; }
    if (used.has(phoneNorm)) { skipped++; continue; }      // 已存在則略過
    used.add(phoneNorm);

    toInsert.push({
      name, phone: String(r.phone || phoneNorm), phone_normalized: phoneNorm,
      login_code: phoneNorm, status,
      group_id: groupName ? (groupMap[groupName] || null) : null,
      created_by: sess.id,
    });
  }

  let inserted = 0;
  if (toInsert.length) {
    const { data, error } = await supabaseAdmin.from("users").insert(toInsert).select("id");
    if (error) return res.status(500).json({ error: "寫入失敗：" + error.message, errors });
    inserted = data.length;
  }
  await audit({ actorType: "admin", actorId: sess.id, action: "批次匯入使用者", target: `成功 ${inserted}、略過 ${skipped}、錯誤 ${errors.length}`, req });
  return res.json({ inserted, skipped, errorCount: errors.length, errors: errors.slice(0, 20) });
}
