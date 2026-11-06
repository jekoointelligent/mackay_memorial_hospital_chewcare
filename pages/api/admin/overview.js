// pages/api/admin/overview.js — 後台儀表板統計 + 進度明細 + 日誌
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin } from "../../../lib/helpers";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  const { data: users } = await supabaseAdmin.from("users").select("id, name, login_code, status, last_login_at");
  const { data: progress } = await supabaseAdmin.from("progress").select("user_id, course_id, pct");
  const { data: attempts } = await supabaseAdmin.from("quiz_attempts").select("user_id, course_id, score, passed, attempted_at");
  const { data: courses } = await supabaseAdmin.from("courses").select("id, title");
  const { data: units } = await supabaseAdmin.from("units").select("id");
  const { data: quizQs } = await supabaseAdmin.from("quiz_questions").select("id");
  const { data: logs } = await supabaseAdmin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(60);

  const totalUsers = (users || []).filter(u => u.status === "active").length;
  const completionRate = progress && progress.length
    ? Math.round(progress.reduce((a, p) => a + (p.pct || 0), 0) / progress.length) : 0;
  const avgScore = attempts && attempts.length
    ? Math.round(attempts.reduce((a, x) => a + x.score, 0) / attempts.length) : 0;
  const since = Date.now() - 7 * 864e5;
  const activeRecent = new Set((users || []).filter(u => u.last_login_at && new Date(u.last_login_at).getTime() > since).map(u => u.id)).size;

  const uMap = Object.fromEntries((users || []).map(u => [u.id, u.name]));
  const cMap = Object.fromEntries((courses || []).map(c => [c.id, c.title]));
  // 每人每課程最佳測驗
  const best = {};
  (attempts || []).forEach(a => {
    const k = a.user_id + ":" + a.course_id;
    if (!best[k] || a.score > best[k].score) best[k] = a;
  });
  const progressRows = (progress || []).map(p => {
    const a = best[p.user_id + ":" + p.course_id];
    return {
      user: uMap[p.user_id] || "—", course: cMap[p.course_id] || "—",
      pct: p.pct || 0, quizScore: a?.score ?? null, passed: a?.passed || false,
      attemptedAt: a?.attempted_at ? new Date(a.attempted_at).toLocaleString("zh-TW", { hour12: false }) : null,
    };
  });

  const totalCourses = (courses || []).length;
  const totalUnits = (units || []).length;
  const totalQuizzes = (quizQs || []).length;

  return res.json({
    stats: { totalUsers, completionRate, avgScore, activeRecent, totalCourses, totalUnits, totalQuizzes },
    progressRows,
    logs: (logs || []).map(l => ({
      time: new Date(l.created_at).toLocaleString("zh-TW", { hour12: false }),
      actorType: l.actor_type, actorName: l.actor_name || "—",
      action: l.action, target: l.target || "", ip: l.ip || "—",
    })),
  });
}
