// pages/api/progress.js
// POST：標記單元看完。body: { courseId, unitId, courseTitle, unitTitle }
import { supabaseAdmin } from "../../lib/supabase";
import { requireUser, audit } from "../../lib/helpers";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const sess = requireUser(req, res);
  if (!sess) return;

  const { courseId, unitId, courseTitle, unitTitle } = req.body || {};
  if (!courseId || !unitId) return res.status(400).json({ error: "缺少參數" });

  // 計算該課程影片單元總數
  const { data: units } = await supabaseAdmin.from("units").select("id, type").eq("course_id", courseId);
  const videoUnits = (units || []).filter(u => u.type === "video");
  const hasQuiz = (units || []).some(u => u.type === "quiz");

  const { data: existing } = await supabaseAdmin
    .from("progress").select("*").eq("user_id", sess.id).eq("course_id", courseId).maybeSingle();
  let completed = existing?.completed_units || [];
  if (!completed.includes(unitId)) completed = [...completed, unitId];

  // 是否已通過測驗（任一次 passed）
  const { data: passedAttempt } = await supabaseAdmin
    .from("quiz_attempts").select("id").eq("user_id", sess.id).eq("course_id", courseId).eq("passed", true).limit(1).maybeSingle();
  const quizDone = !!passedAttempt;
  const total = videoUnits.length + (hasQuiz ? 1 : 0);
  const doneCount = completed.filter(id => videoUnits.some(u => u.id === id)).length + (quizDone ? 1 : 0);
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  await supabaseAdmin.from("progress").upsert(
    { user_id: sess.id, course_id: courseId, completed_units: completed, pct, updated_at: new Date().toISOString() },
    { onConflict: "user_id,course_id" }
  );
  await audit({ actorType: "user", actorId: sess.id, action: "觀看單元", target: `${courseTitle || ""} · ${unitTitle || ""}`, req });
  return res.json({ ok: true, pct });
}
