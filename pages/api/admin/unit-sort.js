// pages/api/admin/unit-sort.js — 批次更新 units.sort_order
import { supabaseAdmin } from "../../../lib/supabase";
import { requireAdmin, audit } from "../../../lib/helpers";
import { getAdminName } from "../../../lib/guard";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const sess = requireAdmin(req, res);
    if (!sess) return;
    const adminName = await getAdminName(sess.id);

    const { order } = req.body || {};
    // order: [{ id: uuid, sort_order: number }, ...]
    if (!Array.isArray(order) || order.length === 0) {
      return res.status(400).json({ error: "缺少 order 陣列" });
    }

    for (const item of order) {
      if (!item.id) continue;
      const { error } = await supabaseAdmin
        .from("units")
        .update({ sort_order: Number(item.sort_order) ?? 0 })
        .eq("id", item.id);
      if (error) {
        console.error(`[unit-sort] id=${item.id}`, error.message);
        return res.status(500).json({ error: `更新失敗：${error.message}` });
      }
    }

    await audit({ actorType: "admin", actorId: sess.id, actorName: adminName, action: "批次排序單元", target: `${order.length} 筆`, req });
    return res.json({ ok: true });
  } catch (e) {
    console.error("[unit-sort] uncaught:", e);
    return res.status(500).json({ error: `伺服器例外：${e.message}` });
  }
}
