// pages/api/video-progress.js
// GET  ?courseId=xxx → 取回該課程所有影片單元的觀看進度
// POST → 儲存一個影片單元的觀看進度；達 90% 自動標記完成；每次都重算課程總進度（平均算法）
import { supabaseAdmin } from "../../lib/supabase";
import { audit } from "../../lib/helpers";
import { getFrontendSession } from "../../lib/session";
import { recalcCourseProgressForUser } from "../../lib/progress";

export default async function handler(req, res) {
  try {
    // 優先採用一般使用者 session；若此瀏覽器沒有登入一般使用者，才退回管理員（前台預覽）
    const sess = getFrontendSession(req);
    if (!sess) return res.status(401).json({ error: "請先登入" });

    // 管理員預覽模式：可瀏覽課程但不記錄進度，避免混入民眾資料
    if (sess.actorType === "admin") {
      if (req.method === "GET") return res.json({ progress: [] });
      if (req.method === "POST") return res.json({ ok: true, percent: 0, completed: false, justCompleted: false });
      return res.status(405).json({ error: "Method not allowed" });
    }

    // ── GET ──────────────────────────────────────────────────
    if (req.method === "GET") {
      const { courseId } = req.query;
      if (!courseId) return res.status(400).json({ error: "缺少 courseId" });
      const { data, error } = await supabaseAdmin
        .from("unit_progress")
        .select("unit_id, last_position_seconds, duration_seconds, progress_percent, completed")
        .eq("user_id", sess.id)
        .eq("course_id", courseId);
      if (error) {
        console.error("[video-progress GET]", error.message);
        return res.status(500).json({ error: error.message });
      }
      return res.json({ progress: data || [] });
    }

    // ── POST ─────────────────────────────────────────────────
    if (req.method === "POST") {
      const { unitId, courseId, positionSeconds, durationSeconds, percent } = req.body || {};
      if (!unitId || !courseId) return res.status(400).json({ error: "缺少 unitId 或 courseId" });

      const pos = Math.max(0, Number(positionSeconds) || 0);
      const dur = Math.max(0, Number(durationSeconds) || 0);
      const pct = Math.min(100, Math.max(0, Number(percent) || (dur > 0 ? Math.round(pos / dur * 100) : 0)));
      const isCompleted = pct >= 90;

      // 在 upsert 前先確認是否已完成（判斷 justCompleted）
      const { data: prevUP } = await supabaseAdmin
        .from("unit_progress").select("completed")
        .eq("user_id", sess.id).eq("unit_id", unitId).maybeSingle();
      const justCompleted = isCompleted && !prevUP?.completed;

      // Upsert unit_progress
      const { error: upErr } = await supabaseAdmin.from("unit_progress").upsert(
        {
          user_id: sess.id,
          unit_id: unitId,
          course_id: courseId,
          last_position_seconds: pos,
          duration_seconds: dur,
          progress_percent: pct,
          completed: isCompleted,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,unit_id" }
      );
      if (upErr) {
        console.error("[video-progress POST upsert]", upErr.message);
        return res.status(500).json({ error: upErr.message });
      }

      // 每次保存都重算課程總進度（平均算法：所有可完成單元 progress_percent 平均值）
      await recalcCourseProgressForUser(sess.id, courseId);

      if (justCompleted) {
        await audit({ actorType: "user", actorId: sess.id, action: "影片觀看完成", target: unitId, req });
      }

      return res.json({ ok: true, percent: pct, completed: isCompleted, justCompleted });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("[video-progress] uncaught:", e);
    return res.status(500).json({ error: `伺服器例外：${e.message}` });
  }
}
