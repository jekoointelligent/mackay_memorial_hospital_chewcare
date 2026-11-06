// pages/api/admin/export.js
// 匯出 CSV：type=users | progress。回傳 text/csv，前端觸發下載。
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit } from "../../../lib/helpers";

function toCsv(headers, rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  return "\uFEFF" + lines.join("\n");   // BOM 讓 Excel 正確顯示中文
}

export default async function handler(req, res) {
  const sess = requireAdmin(req, res);
  if (!sess) return;
  const type = req.query.type || "users";

  if (type === "users") {
    const { data } = await supabaseAdmin
      .from("users").select("name, phone, login_code, status, last_login_at, created_at, groups(name)")
      .order("created_at", { ascending: false });
    const csv = toCsv(
      ["姓名", "手機", "登入序號", "狀態", "最後登入", "建立時間", "所屬分組"],
      (data || []).map(u => [u.name, u.phone, u.login_code, u.status === "active" ? "啟用" : "停用", u.last_login_at || "", u.created_at || "", u.groups?.name || ""])
    );
    await audit({ actorType: "admin", actorId: sess.id, action: "匯出使用者報表", req });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="users_${Date.now()}.csv"`);
    return res.send(csv);
  }

  if (type === "progress") {
    const { data: users } = await supabaseAdmin.from("users").select("id, name, login_code");
    const { data: prog } = await supabaseAdmin.from("progress").select("user_id, course_id, pct");
    const { data: courses } = await supabaseAdmin.from("courses").select("id, title");
    const { data: attempts } = await supabaseAdmin.from("quiz_attempts").select("user_id, course_id, score, passed, attempted_at");
    const uMap = Object.fromEntries((users || []).map(u => [u.id, u]));
    const cMap = Object.fromEntries((courses || []).map(c => [c.id, c.title]));
    // 取每人每課程最新一次測驗
    const bestAttempt = {};
    (attempts || []).forEach(a => {
      const k = a.user_id + ":" + a.course_id;
      if (!bestAttempt[k] || new Date(a.attempted_at) > new Date(bestAttempt[k].attempted_at)) bestAttempt[k] = a;
    });
    const rows = (prog || []).map(p => {
      const a = bestAttempt[p.user_id + ":" + p.course_id];
      return [uMap[p.user_id]?.name || "", uMap[p.user_id]?.login_code || "", cMap[p.course_id] || "", `${p.pct}%`, a ? a.score : "", a ? (a.passed ? "通過" : "未通過") : "", a ? a.attempted_at : ""];
    });
    const csv = toCsv(["姓名", "登入序號", "課程", "完成度", "測驗分數", "是否通過", "作答時間"], rows);
    await audit({ actorType: "admin", actorId: sess.id, action: "匯出學習進度報表", req });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="progress_${Date.now()}.csv"`);
    return res.send(csv);
  }

  return res.status(400).json({ error: "未知的匯出類型" });
}
