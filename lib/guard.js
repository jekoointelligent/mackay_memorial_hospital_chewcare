// lib/guard.js — 相容層，統一委派至 helpers
import { supabaseAdmin } from "./supabase";
export { requireAdmin, requireUser } from "./helpers";
export async function getAdminName(id) {
  const { data } = await supabaseAdmin.from("admin_users").select("name").eq("id", id).maybeSingle();
  return data?.name || "管理員";
}
