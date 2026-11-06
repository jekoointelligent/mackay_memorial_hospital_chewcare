// pages/api/courses.js — 課程列表（含單元）；若已登入附上該用戶進度
import { supabaseAdmin } from "../../lib/supabase";
import { getUserSession } from "../../lib/session";

export default async function handler(req, res) {
  const { data: courses } = await supabaseAdmin
    .from("courses").select("*").eq("published", true).order("sort_order");
  const { data: units } = await supabaseAdmin.from("units").select("*").order("sort_order");

  // 每門課程的測驗題目數（用於前台判斷是否顯示「開始測驗」）
  const { data: quizRows } = await supabaseAdmin
    .from("quiz_questions").select("course_id");
  const quizCountMap = {};
  (quizRows || []).forEach(q => { quizCountMap[q.course_id] = (quizCountMap[q.course_id] || 0) + 1; });

  // 只信任一般使用者 session，避免管理員的 admin_session 被誤當成一般使用者附上個人進度
  const sess = getUserSession(req);
  let progMap = {}, passMap = {};
  if (sess) {
    const { data: prog } = await supabaseAdmin.from("progress").select("*").eq("user_id", sess.id);
    (prog || []).forEach(p => { progMap[p.course_id] = p; });
    const { data: att } = await supabaseAdmin.from("quiz_attempts").select("course_id, score, passed, attempted_at").eq("user_id", sess.id);
    (att || []).forEach(a => {
      if (a.passed && (!passMap[a.course_id] || a.score > passMap[a.course_id].score)) passMap[a.course_id] = a;
    });
  }

  const result = (courses || []).map(c => {
    const cUnits = (units || []).filter(u => u.course_id === c.id);
    const p = progMap[c.id];
    const pass = passMap[c.id];
    return {
      ...c, units: cUnits,
      progress: p?.pct || 0,
      completedUnits: p?.completed_units || [],
      quizScore: pass?.score ?? null,
      quizDone: !!pass,
      hasQuiz: (quizCountMap[c.id] || 0) > 0,
    };
  });
  return res.json({ courses: result });
}
