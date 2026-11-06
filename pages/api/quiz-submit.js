// pages/api/quiz-submit.js
// 測驗後端計分。body: { courseId, unitId?, answers: [選項index,...] }
// 提交即視為完成該測驗單元（寫入 unit_progress）；另計算課程總進度
import { supabaseAdmin } from "../../lib/supabase";
import { audit } from "../../lib/helpers";
import { getFrontendSession } from "../../lib/session";
import { recalcCourseProgressForUser } from "../../lib/progress";

const PASS = 60;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  // 優先採用一般使用者 session；若此瀏覽器沒有登入一般使用者，才退回管理員（前台預覽）
  const sess = getFrontendSession(req);
  if (!sess) return res.status(401).json({ error: "請先登入" });
  const { courseId, unitId, answers } = req.body || {};
  if (!courseId || !Array.isArray(answers)) return res.status(400).json({ error: "缺少作答資料" });

  // 取得該單元（或課程）的題目並計分
  // select("*") 可在 explanation 欄位尚未建立時安全降級（PostgREST 不回傳不存在的欄位）
  let qs;
  if (unitId) {
    // 先嘗試取 unit 專屬題目
    const { data: unitData } = await supabaseAdmin
      .from("quiz_questions").select("*").eq("course_id", courseId).eq("unit_id", unitId).order("sort_order");
    if (unitData && unitData.length > 0) {
      qs = unitData;
    } else {
      // 向下相容：取課程全部題目
      const { data: courseData } = await supabaseAdmin
        .from("quiz_questions").select("*").eq("course_id", courseId).order("sort_order");
      qs = courseData || [];
    }
  } else {
    const { data } = await supabaseAdmin
      .from("quiz_questions").select("*").eq("course_id", courseId).order("sort_order");
    qs = data || [];
  }

  if (!qs || qs.length === 0) return res.status(400).json({ error: "此測驗無題目" });

  const correct = qs.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const score = Math.round((correct / qs.length) * 100);
  const passed = score >= PASS;

  // 答題檢討：送出後才在後端組裝，前端在作答期間永遠看不到正確答案
  const review = qs.map((q, i) => ({
    question: q.question,
    options: q.options || [],
    userAnswer: answers[i] ?? -1,
    correctAnswer: q.answer,
    isCorrect: answers[i] === q.answer,
    explanation: q.explanation || null,
  }));

  // 管理員預覽：回傳分數但不寫入任何資料庫（避免混入民眾資料）
  if (sess.actorType === "admin") {
    return res.json({ score, passed, correct, total: qs.length, review });
  }

  // 記錄作答歷史
  await supabaseAdmin.from("quiz_attempts").insert({
    user_id: sess.id, course_id: courseId, score, passed, total: qs.length, correct,
  });

  // 提交即完成（無論是否通過）— 寫入 unit_progress
  if (unitId) {
    await supabaseAdmin.from("unit_progress").upsert(
      {
        user_id: sess.id,
        unit_id: unitId,
        course_id: courseId,
        progress_percent: 100,
        completed: true,
        last_position_seconds: 0,
        duration_seconds: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,unit_id" }
    );
  }

  // 重算課程進度（平均算法：所有可完成單元 progress_percent 平均值）
  await recalcCourseProgressForUser(sess.id, courseId);

  await audit({ actorType: "user", actorId: sess.id, action: "提交測驗", target: `課程 ${courseId}${unitId ? ` 單元 ${unitId}` : ""}（${score} 分，${passed ? "通過" : "未通過"}）`, req });
  return res.json({ score, passed, correct, total: qs.length, review });
}
