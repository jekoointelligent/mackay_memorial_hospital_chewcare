// pages/api/quiz.js — 回傳測驗題目與選項，但「不含正解」（避免外洩，後端計分）
// 管理員亦可讀取（預覽用），但正解仍不回傳
import { supabaseAdmin } from "../../lib/supabase";
import { getFrontendSession } from "../../lib/session";

export default async function handler(req, res) {
  const sess = getFrontendSession(req);
  if (!sess) return res.status(401).json({ error: "請先登入" });
  const { courseId, unitId } = req.query;
  if (!courseId) return res.status(400).json({ error: "缺少 courseId" });

  if (unitId) {
    // 優先取該 unit 專屬題目
    const { data: unitData } = await supabaseAdmin
      .from("quiz_questions").select("id, question, options")
      .eq("course_id", courseId).eq("unit_id", unitId).order("sort_order");
    if (unitData && unitData.length > 0) return res.json({ questions: unitData });

    // 退回：取該課程的所有題目（向下相容 unit_id 尚未設定的舊資料）
    const { data: fallback } = await supabaseAdmin
      .from("quiz_questions").select("id, question, options")
      .eq("course_id", courseId).order("sort_order");
    return res.json({ questions: fallback || [] });
  }

  // 未指定 unitId：取課程全部題目
  const { data } = await supabaseAdmin
    .from("quiz_questions").select("id, question, options")
    .eq("course_id", courseId).order("sort_order");
  return res.json({ questions: data || [] });
}
