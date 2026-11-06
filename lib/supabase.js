// lib/supabase.js
// 兩種 client：
//  - supabaseAdmin：用 service_role key，僅在後端 API route 使用，可繞過 RLS
//  - 前端不直接連 DB，一律透過 /api/* 呼叫，避免 service key 外洩
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) console.warn("[supabase] 缺少 NEXT_PUBLIC_SUPABASE_URL");

// 後端專用（service role）— 切勿在 client component 匯入
export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
