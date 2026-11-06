// lib/progress.js — 課程 / 單元學習進度的共用計算邏輯
// 供 pages/api/video-progress.js、pages/api/quiz-submit.js、pages/api/admin/content.js 共用，
// 避免三處各自重複實作「重算課程平均進度」而互相漂移。
import { supabaseAdmin } from "./supabase";
import { isProgressCountedUnit } from "./unitProgress";

// 重新計算單一使用者在某課程的總進度（平均算法：所有可完成單元 progress_percent 的平均值），
// 並 upsert 回 progress 表（completed_units / pct）。不影響其他使用者、其他課程。
export async function recalcCourseProgressForUser(userId, courseId) {
  const { data: courseUnits } = await supabaseAdmin.from("units").select("id, type, track_progress").eq("course_id", courseId);
  const playableUnits = (courseUnits || []).filter(isProgressCountedUnit);
  const total = playableUnits.length;
  if (!total) return;

  const { data: allUP } = await supabaseAdmin
    .from("unit_progress").select("unit_id, progress_percent, completed")
    .eq("user_id", userId).eq("course_id", courseId);
  const upMap = {};
  (allUP || []).forEach(r => { upMap[r.unit_id] = r; });

  const avgPct = Math.round(playableUnits.reduce((sum, u) => sum + (upMap[u.id]?.progress_percent || 0), 0) / total);
  const completedIds = new Set(Object.values(upMap).filter(r => r.completed).map(r => r.unit_id));
  const completedUnitIds = playableUnits.filter(u => completedIds.has(u.id)).map(u => u.id);

  await supabaseAdmin.from("progress").upsert(
    { user_id: userId, course_id: courseId, completed_units: completedUnitIds, pct: avgPct, updated_at: new Date().toISOString() },
    { onConflict: "user_id,course_id" }
  );
}

// 管理員更換某單元的影片來源、且選擇「重置此單元進度」時呼叫：
// 只重置該 unit_id 底下所有使用者的 unit_progress（completed=false、progress_percent=0、
// last_position_seconds=0），再重新計算受影響使用者在該課程的 progress.pct。
// 不刪除、不重建 unit，也不影響其他單元或其他課程的進度資料。
export async function resetUnitProgress(courseId, unitId) {
  const { data: rows } = await supabaseAdmin.from("unit_progress").select("user_id").eq("unit_id", unitId);
  const userIds = [...new Set((rows || []).map(r => r.user_id))];
  if (!userIds.length) return { affectedUsers: 0 };

  const { error } = await supabaseAdmin.from("unit_progress").update({
    completed: false,
    progress_percent: 0,
    last_position_seconds: 0,
    updated_at: new Date().toISOString(),
  }).eq("unit_id", unitId);
  if (error) throw error;

  for (const uid of userIds) {
    await recalcCourseProgressForUser(uid, courseId);
  }
  return { affectedUsers: userIds.length };
}
