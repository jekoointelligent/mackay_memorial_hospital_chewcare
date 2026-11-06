// pages/api/admin/materials.js — 教材 CRUD（含 audit）
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit } from "../../../lib/helpers";
import { getAdminName } from "../../../lib/guard";
import { deleteR2Object } from "../../../lib/r2";
import { isHtmlMaterial } from "../../../lib/materialType";

function dbErr(label, error, payload) {
  console.error(`[materials ${label}] code=${error?.code} msg=${error?.message} details=${error?.details} hint=${error?.hint}`);
  if (payload) console.error(`[materials ${label}] payload=`, JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    const sess = requireAdmin(req, res);
    if (!sess) return;
    const adminName = await getAdminName(sess.id);

    // ── GET ────────────────────────────────────────────────────
    if (req.method === "GET") {
      const { course_id, unit_id, asset_type, status, file_type } = req.query;
      let query = supabaseAdmin.from("materials").select("*").order("sort_order").order("created_at");
      if (course_id) query = query.eq("course_id", course_id);
      if (unit_id) query = query.eq("unit_id", unit_id);
      if (asset_type) query = query.eq("asset_type", asset_type);
      if (status) query = query.eq("status", status);
      // file_type=html 是「HTML 素材庫」查詢用的；不能只靠 DB 裡的 file_type 精準比對，
      // 因為舊資料可能還停留在 file_type='other'（在自動判斷 HTML 上線之前上傳的）。
      // 改成先照其他條件撈出資料，再用共用的 isHtmlMaterial() 在應用層判斷，同時相容
      // 新資料（file_type='html'）與舊資料（file_type='other' 但實際是 html 檔）。
      // 其他 file_type 值（目前只有 asset_type=video 的影片庫會用到 asset_type 篩選，
      // 未來若有其他精準比對需求）維持原本的精準比對。
      if (file_type && file_type !== "html") query = query.eq("file_type", file_type);
      const { data, error } = await query;
      if (error) {
        dbErr("GET", error);
        return res.status(500).json({ error: `載入失敗 (${error.code || "?"}): ${error.message}` });
      }
      const materials = file_type === "html" ? (data || []).filter(isHtmlMaterial) : (data || []);
      return res.json({ materials });
    }

    // ── POST ───────────────────────────────────────────────────
    if (req.method === "POST") {
      const { title, description, file_name, file_path, file_url, file_type, file_size, storage_key, storage_provider, course_id, unit_id, published, sort_order, status, asset_type } = req.body || {};
      if (!title || !file_name || !file_path || !file_url) {
        return res.status(400).json({ error: "缺少必填欄位：title, file_name, file_path, file_url" });
      }
      const computedStatus = status ? String(status) : (published !== false ? "published" : "draft");
      const fullPayload = {
        title: String(title).trim(),
        description: description || null,
        file_name: String(file_name).trim(),
        file_path: String(file_path).trim(),
        file_url: String(file_url).trim(),
        file_type: file_type || "other",
        file_size: Number(file_size) || 0,
        storage_key: storage_key || null,
        storage_provider: storage_provider || null,
        course_id: course_id || null,
        unit_id: unit_id || null,
        published: computedStatus === "published",
        status: computedStatus,
        asset_type: asset_type || "document",
        sort_order: Number(sort_order) || 0,
        uploaded_by: sess.id,
      };
      let { data, error } = await supabaseAdmin.from("materials").insert(fullPayload).select().single();
      if (error && (error.code === "42703" || String(error.message || "").includes("does not exist"))) {
        // storage_key / storage_provider 欄位尚未建立，退回基本欄位
        const { storage_key: _sk, storage_provider: _sp, ...basicPayload } = fullPayload;
        ({ data, error } = await supabaseAdmin.from("materials").insert(basicPayload).select().single());
      }
      if (error) {
        dbErr("POST", error, fullPayload);
        return res.status(500).json({ error: `建立失敗 (${error.code || "?"}): ${error.message}` });
      }
      await audit({ actorType: "admin", actorId: sess.id, actorName: adminName, action: "上傳素材", target: title, req });
      return res.json({ material: data });
    }

    // ── PATCH ──────────────────────────────────────────────────
    if (req.method === "PATCH") {
      const { id, ...patch } = req.body || {};
      if (!id) return res.status(400).json({ error: "缺少 id" });
      if (patch.sort_order !== undefined) patch.sort_order = Number(patch.sort_order) || 0;
      if (patch.status !== undefined) patch.published = patch.status === "published";
      else if (patch.published !== undefined) patch.status = patch.published ? "published" : "draft";
      patch.updated_at = new Date().toISOString();
      const { error } = await supabaseAdmin.from("materials").update(patch).eq("id", id);
      if (error) {
        dbErr("PATCH", error, { id, ...patch });
        return res.status(500).json({ error: `更新失敗 (${error.code || "?"}): ${error.message}` });
      }
      const auditAction = patch.status === "published" ? "上架素材" : patch.status === "archived" ? "封存素材" : patch.status === "draft" ? "下架素材" : "編輯素材";
      await audit({ actorType: "admin", actorId: sess.id, actorName: adminName, action: auditAction, target: id, req });
      return res.json({ ok: true });
    }

    // ── DELETE ─────────────────────────────────────────────────
    if (req.method === "DELETE") {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: "缺少 id" });

      // 先取素材 metadata，確認雲端刪除需要哪些資訊
      const { data: mat } = await supabaseAdmin
        .from("materials")
        .select("file_path, storage_key, storage_provider, title")
        .eq("id", id)
        .maybeSingle();

      // Step 1：刪除 DB 紀錄（失敗就直接回傳錯誤，不刪雲端）
      const { error } = await supabaseAdmin.from("materials").delete().eq("id", id);
      if (error) {
        dbErr("DELETE", error, { id });
        return res.status(500).json({ error: `刪除失敗 (${error.code || "?"}): ${error.message}` });
      }
      await audit({ actorType: "admin", actorId: sess.id, actorName: adminName, action: "刪除素材", target: mat?.title || id, req });

      // Step 2：刪除雲端實體檔案（DB 已刪，此步驟失敗只警告）
      let fileDeleteWarning = null;
      if (mat) {
        try {
          if (mat.storage_provider === "cloudflare_r2" && mat.storage_key) {
            await deleteR2Object(mat.storage_key);
          } else if (mat.file_path) {
            // 舊版 Supabase Storage 向下相容
            const { error: storErr } = await supabaseAdmin.storage.from("materials").remove([mat.file_path]);
            if (storErr) throw new Error(storErr.message);
          }
        } catch (fileErr) {
          console.warn("[materials DELETE] cloud file removal failed:", fileErr.message);
          fileDeleteWarning = `素材紀錄已刪除，但雲端檔案刪除失敗（${fileErr.message}），請稍後手動確認。`;
        }
      }

      return res.json({ ok: true, fileDeleteWarning });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("[materials handler] uncaught:", e);
    return res.status(500).json({ error: `伺服器例外：${e.message}` });
  }
}
