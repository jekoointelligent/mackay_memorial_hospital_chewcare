// pages/api/admin/quiz.js — 後台測驗題目 CRUD（answer/explanation 僅後台可見）
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit } from "../../../lib/helpers";

function dbErr(label, error, payload) {
  console.error(`[quiz ${label}] code=${error?.code} msg=${error?.message} details=${error?.details} hint=${error?.hint}`);
  if (payload) console.error(`[quiz ${label}] payload=`, JSON.stringify(payload));
}

// quiz_questions 原始 schema 沒有 created_at，僅用 sort_order 排序
// 若要依建立順序排序，請先執行 migration_v4_fix_quiz_units.sql
const hasCreatedAt = false;

export default async function handler(req, res) {
  try {
    const sess = requireAdmin(req, res);
    if (!sess) return;

    // ── GET ───────────────────────────────────────────────────────
    if (req.method === "GET") {
      const { course_id, unit_id } = req.query;
      // select("*") 不指定欄位，避免因欄位名稱不符導致 SELECT 失敗
      let query = supabaseAdmin
        .from("quiz_questions")
        .select("*")
        .order("sort_order");
      if (hasCreatedAt) query = query.order("created_at");
      if (course_id) query = query.eq("course_id", course_id);
      if (unit_id) query = query.eq("unit_id", unit_id);
      const { data, error } = await query;
      if (error) {
        dbErr("GET", error);
        return res.status(500).json({
          error: `查詢失敗 (${error.code || "?"}): ${error.message || "未知錯誤"}`,
        });
      }
      return res.json({ questions: data || [] });
    }

    // ── POST ──────────────────────────────────────────────────────
    if (req.method === "POST") {
      const { course_id, unit_id, question, options, answer, explanation, sort_order, published } = req.body || {};
      if (!course_id || !question || !Array.isArray(options) || answer == null) {
        return res.status(400).json({ error: "缺少必填欄位：course_id, question, options, answer" });
      }
      if (options.length < 2) return res.status(400).json({ error: "選項至少需要 2 個" });

      const payload = {
        course_id,
        unit_id: unit_id || null,
        question: String(question).trim(),
        options,
        answer: Number(answer),
        explanation: explanation || null,
        sort_order: Number(sort_order) || 0,
        published: published !== false,
      };

      let { data, error } = await supabaseAdmin.from("quiz_questions")
        .insert(payload).select().single();

      if (error) {
        dbErr("POST", error, payload);
        // 若 explanation / published 欄位不存在，嘗試只寫基本欄位
        const colMissing = error.code === "42703" || String(error.message || "").includes("does not exist");
        if (colMissing) {
          const fallback = { course_id, unit_id: unit_id || null, question: payload.question, options, answer: payload.answer, sort_order: payload.sort_order };
          const { data: d2, error: e2 } = await supabaseAdmin.from("quiz_questions")
            .insert(fallback).select().single();
          if (e2) {
            dbErr("POST-fallback", e2, fallback);
            return res.status(500).json({
              error: `建立失敗 (${e2.code || "?"}): ${e2.message || "未知錯誤"} — 請執行 migration_v4_fix_quiz_units.sql`,
            });
          }
          await audit({ actorType: "admin", actorId: sess.id, action: "新增測驗題目", target: question, req });
          return res.json({ question: d2 });
        }
        return res.status(500).json({
          error: `建立失敗 (${error.code || "?"}): ${error.message || "未知錯誤"}`,
        });
      }

      await audit({ actorType: "admin", actorId: sess.id, action: "新增測驗題目", target: question, req });
      return res.json({ question: data });
    }

    // ── PATCH ─────────────────────────────────────────────────────
    if (req.method === "PATCH") {
      const { id, question, options, answer, explanation, sort_order, published } = req.body || {};
      if (!id) return res.status(400).json({ error: "缺少 id" });
      const patch = {};
      if (question != null) patch.question = String(question).trim();
      if (options != null) patch.options = options;
      if (answer != null) patch.answer = Number(answer);
      if (explanation !== undefined) patch.explanation = explanation;
      if (sort_order !== undefined) patch.sort_order = Number(sort_order) || 0;
      if (published !== undefined) patch.published = published;
      if (Object.keys(patch).length === 0) return res.json({ ok: true });
      const { error } = await supabaseAdmin.from("quiz_questions").update(patch).eq("id", id);
      if (error) {
        dbErr("PATCH", error, { id, ...patch });
        return res.status(500).json({ error: `更新失敗 (${error.code || "?"}): ${error.message || "未知錯誤"}` });
      }
      await audit({ actorType: "admin", actorId: sess.id, action: "編輯測驗題目", target: id, req });
      return res.json({ ok: true });
    }

    // ── DELETE ────────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: "缺少 id" });
      const { error } = await supabaseAdmin.from("quiz_questions").delete().eq("id", id);
      if (error) {
        dbErr("DELETE", error, { id });
        return res.status(500).json({ error: `刪除失敗 (${error.code || "?"}): ${error.message || "未知錯誤"}` });
      }
      await audit({ actorType: "admin", actorId: sess.id, action: "刪除測驗題目", target: id, req });
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("[quiz handler] uncaught:", e);
    return res.status(500).json({ error: `伺服器例外：${e.message}` });
  }
}
