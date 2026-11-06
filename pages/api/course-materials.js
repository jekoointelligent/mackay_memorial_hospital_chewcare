// pages/api/course-materials.js — 前台：取得已上架教材（不含個資）
import { supabaseAdmin } from "../../lib/supabase";
import { audit } from "../../lib/helpers";
import { getUserSession } from "../../lib/session";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const { courseId, unitId } = req.query;
  if (!courseId) return res.status(400).json({ error: "缺少 courseId" });
  try {
    let query = supabaseAdmin
      .from("materials")
      .select("id, title, description, file_name, file_url, file_type, file_size, unit_id, sort_order")
      .eq("status", "published")
      .eq("course_id", courseId)
      .order("sort_order")
      .order("created_at");
    if (unitId) query = query.eq("unit_id", unitId);

    const { data, error } = await query;
    if (error) {
      console.error("[course-materials]", error.message);
      return res.status(500).json({ error: error.message });
    }

    // 選擇性記錄下載行為（僅在查詢時帶 download=1 才記錄）
    if (req.query.download === "1") {
      const sess = getUserSession(req);
      if (sess) {
        const mat = data?.find(m => m.id === req.query.materialId);
        if (mat) {
          await audit({ actorType: "user", actorId: sess.id, action: "下載教材", target: mat.title, req });
        }
      }
    }

    return res.json({ materials: data || [] });
  } catch (e) {
    console.error("[course-materials] uncaught:", e);
    return res.status(500).json({ error: `伺服器例外：${e.message}` });
  }
}
