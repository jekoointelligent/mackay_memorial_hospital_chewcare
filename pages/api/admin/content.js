// pages/api/admin/content.js — 後台課程 / 單元 CRUD（含 audit）
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit } from "../../../lib/helpers";
import { getAdminName } from "../../../lib/guard";
import { resetUnitProgress } from "../../../lib/progress";

// 判斷單元內容來源是否「真的」改變：只比對實際指向內容本體的欄位（video_url /
// storage_key），適用影片單元，也適用「互動網頁（HTML）」單元 —— 換一份 HTML 素材
// 一樣是透過這兩個欄位存放新內容的 URL / R2 key。不能因為標題、說明、排序、
// 發布狀態等異動就誤判成換內容。
const CONTENT_SOURCE_FIELDS = ["video_url", "storage_key"];
function contentSourceChanged(before, patch) {
  if (!before) return false;
  return CONTENT_SOURCE_FIELDS.some(
    (f) => f in patch && String(patch[f] || "") !== String(before[f] || "")
  );
}

function dbErr(label, error, payload) {
  console.error(
    `[content ${label}] code=${error?.code} msg=${error?.message} details=${error?.details} hint=${error?.hint}`
  );
  if (payload) console.error(`[content ${label}] payload=`, JSON.stringify(payload));
}

function isMissingColumn(err) {
  return err && (err.code === "42703" || String(err.message || "").includes("does not exist"));
}

export default async function handler(req, res) {
  try {
    const sess = requireAdmin(req, res);
    if (!sess) return;
    const adminName = await getAdminName(sess.id);
    const { resource } = req.query;

    // ── 課程 ────────────────────────────────────────────────────────
    if (resource === "course") {
      if (req.method === "GET") {
        const { data: courses, error: ce } = await supabaseAdmin
          .from("courses").select("*").order("sort_order").order("created_at");
        if (ce) {
          dbErr("GET courses", ce);
          return res.status(500).json({ error: `載入課程失敗 (${ce.code || "?"}): ${ce.message}` });
        }
        const { data: units, error: ue } = await supabaseAdmin
          .from("units").select("*").order("sort_order").order("created_at");
        if (ue) {
          dbErr("GET units", ue);
          return res.status(500).json({ error: `載入單元失敗 (${ue.code || "?"}): ${ue.message}` });
        }
        const result = (courses || []).map(c => ({
          ...c,
          units: (units || []).filter(u => u.course_id === c.id),
        }));
        return res.json({ courses: result });
      }

      if (req.method === "POST") {
        const { title, category, description, emoji, sort_order } = req.body || {};
        if (!title || !category) return res.status(400).json({ error: "缺少課程標題或分類" });
        const payload = {
          title,
          category,
          description: description || null,
          emoji: emoji || "🍽️",
          sort_order: Number(sort_order) || 0,
        };
        const { data, error } = await supabaseAdmin
          .from("courses").insert(payload).select().single();
        if (error) {
          dbErr("POST course", error, payload);
          return res.status(500).json({ error: `建立課程失敗 (${error.code || "?"}): ${error.message}` });
        }
        await audit({ actorType: "admin", actorId: sess.id, actorName: adminName, action: "新增課程", target: title, req });
        return res.json({ course: data });
      }

      if (req.method === "PATCH") {
        const { id, ...patch } = req.body || {};
        if (!id) return res.status(400).json({ error: "缺少 id" });
        if (patch.sort_order !== undefined) patch.sort_order = Number(patch.sort_order) || 0;
        const { error } = await supabaseAdmin.from("courses").update(patch).eq("id", id);
        if (error) {
          dbErr("PATCH course", error, { id, ...patch });
          return res.status(500).json({ error: `更新課程失敗 (${error.code || "?"}): ${error.message}` });
        }
        await audit({ actorType: "admin", actorId: sess.id, actorName: adminName, action: "編輯課程", target: id, req });
        return res.json({ ok: true });
      }

      if (req.method === "DELETE") {
        const { id, force } = req.body || {};
        if (!id) return res.status(400).json({ error: "缺少 id" });
        if (!force) {
          const { data: units } = await supabaseAdmin.from("units").select("id").eq("course_id", id);
          if (units && units.length > 0) {
            return res.status(409).json({
              error: `此課程有 ${units.length} 個單元，刪除後一併移除`,
              unitCount: units.length,
            });
          }
        }
        const { error } = await supabaseAdmin.from("courses").delete().eq("id", id);
        if (error) {
          dbErr("DELETE course", error, { id });
          return res.status(500).json({ error: `刪除課程失敗 (${error.code || "?"}): ${error.message}` });
        }
        await audit({ actorType: "admin", actorId: sess.id, actorName: adminName, action: "刪除課程", target: id, req });
        return res.json({ ok: true });
      }
    }

    // ── 單元 ────────────────────────────────────────────────────────
    if (resource === "unit") {
      if (req.method === "POST") {
        const { course_id, title, type, video_kind, video_url, duration, sort_order, description, published, source_type, original_url, storage_key, file_name, file_size, mime_type, track_progress } =
          req.body || {};
        if (!course_id || !title) return res.status(400).json({ error: "缺少必填欄位（course_id, title）" });

        const fullPayload = {
          course_id,
          title,
          type: type || "video",
          video_kind: video_kind || null,
          video_url: video_url || null,
          duration: duration || null,
          sort_order: Number(sort_order) || 0,
          description: description || null,
          published: published !== false,
          source_type: source_type || null,
          original_url: original_url || null,
          storage_key: storage_key || null,
          file_name: file_name || null,
          file_size: file_size ? Number(file_size) : null,
          mime_type: mime_type || null,
          // 只對 interactive_html 有意義；預設 false（自我評估／工具型內容，不計入進度）
          track_progress: track_progress === true,
        };

        let { data, error } = await supabaseAdmin.from("units").insert(fullPayload).select().single();

        if (error && isMissingColumn(error)) {
          dbErr("POST unit full", error, fullPayload);
          // migration_v16（track_progress）尚未執行時，先只去掉這一個欄位再試一次，
          // 不要連 migration_v3/v12 的欄位（storage_key 等）都一起丟掉。
          const { track_progress: _tp, ...withoutTrackProgress } = fullPayload;
          ({ data, error } = await supabaseAdmin.from("units").insert(withoutTrackProgress).select().single());

          if (error && isMissingColumn(error)) {
            dbErr("POST unit v14", error, withoutTrackProgress);
            // migration_v3 欄位也不存在時退回最基本欄位
            const basicPayload = {
              course_id,
              title,
              type: type || "video",
              video_kind: video_kind || null,
              video_url: video_url || null,
              duration: duration || null,
              sort_order: Number(sort_order) || 0,
            };
            ({ data, error } = await supabaseAdmin.from("units").insert(basicPayload).select().single());
            if (error) {
              dbErr("POST unit fallback", error, basicPayload);
              return res.status(500).json({
                error: `建立單元失敗 (${error.code || "?"}): ${error.message} — 請確認已執行 migration_v3.sql`,
              });
            }
          } else if (error) {
            dbErr("POST unit v14", error, withoutTrackProgress);
            return res.status(500).json({
              error: `建立單元失敗 (${error.code || "?"}): ${error.message}`,
            });
          }
        } else if (error) {
          dbErr("POST unit", error, fullPayload);
          return res.status(500).json({
            error: `建立單元失敗 (${error.code || "?"}): ${error.message}`,
          });
        }

        await audit({ actorType: "admin", actorId: sess.id, actorName: adminName, action: "新增影片單元", target: title, req });
        return res.json({ unit: data });
      }

      if (req.method === "PATCH") {
        // resetProgress：由前端在偵測到影片來源真的改變時，跳出確認提示後才會帶上，
        // 表示管理員明確選擇「重置此單元進度」。不可因為存在這個欄位就默默重置——
        // 仍要由伺服器端重新比對來源欄位是否真的變了才會執行。
        const { id, resetProgress, ...patch } = req.body || {};
        if (!id) return res.status(400).json({ error: "缺少 id" });
        if (patch.sort_order !== undefined) patch.sort_order = Number(patch.sort_order) || 0;
        // 只對 interactive_html 有意義；確保存進去的一定是布林值
        if (patch.track_progress !== undefined) patch.track_progress = patch.track_progress === true;

        // 更新前先讀出舊資料，用來判斷影片來源是否真的改變；同一筆 unit 只做 update，
        // 絕不刪除重建，避免 unit_id 改變導致使用者既有進度失去對應。
        const { data: before } = await supabaseAdmin
          .from("units").select("id, course_id, video_url, storage_key").eq("id", id).maybeSingle();

        let { error } = await supabaseAdmin.from("units").update(patch).eq("id", id);
        if (error && isMissingColumn(error)) {
          // migration_v16（track_progress）尚未執行時，先只去掉這一個欄位再試一次，
          // 不要連 migration_v12 的欄位（storage_key 等）都一起丟掉。
          const { track_progress: _tp, ...withoutTrackProgress } = patch;
          ({ error } = await supabaseAdmin.from("units").update(withoutTrackProgress).eq("id", id));

          if (error && isMissingColumn(error)) {
            // migration_v12 也尚未執行時，再退回最基本欄位
            const { source_type: _s, original_url: _o, storage_key: _k, file_name: _f, file_size: _fs, ...basicPatch } = withoutTrackProgress;
            ({ error } = await supabaseAdmin.from("units").update(basicPatch).eq("id", id));
          }
        }
        if (error) {
          dbErr("PATCH unit", error, { id, ...patch });
          return res.status(500).json({ error: `更新單元失敗 (${error.code || "?"}): ${error.message}` });
        }

        const sourceChanged = contentSourceChanged(before, patch);
        let progressReset = false;
        if (sourceChanged && resetProgress === true && before) {
          const { affectedUsers } = await resetUnitProgress(before.course_id, id);
          progressReset = true;
          await audit({
            actorType: "admin", actorId: sess.id, actorName: adminName,
            action: "重置單元學習進度（內容來源已更換）", target: `unit ${id}（影響 ${affectedUsers} 位使用者）`, req,
          });
        }

        await audit({ actorType: "admin", actorId: sess.id, actorName: adminName, action: "編輯影片單元", target: id, req });
        return res.json({ ok: true, sourceChanged, progressReset });
      }

      if (req.method === "DELETE") {
        const { id } = req.body || {};
        if (!id) return res.status(400).json({ error: "缺少 id" });
        const { error } = await supabaseAdmin.from("units").delete().eq("id", id);
        if (error) {
          dbErr("DELETE unit", error, { id });
          return res.status(500).json({ error: `刪除單元失敗 (${error.code || "?"}): ${error.message}` });
        }
        await audit({ actorType: "admin", actorId: sess.id, actorName: adminName, action: "刪除影片單元", target: id, req });
        return res.json({ ok: true });
      }
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("[content handler] uncaught:", e);
    return res.status(500).json({ error: `伺服器例外：${e.message}` });
  }
}
