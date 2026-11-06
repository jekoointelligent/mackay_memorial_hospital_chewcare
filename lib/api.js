// lib/api.js — 前端呼叫後端 API 的封裝
async function jf(url, opts) {
  const r = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...opts });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    // 後台分頁呼叫 /api/admin/* 時 session 已失效：給出明確訊息，並廣播事件讓
    // AdminPage 顯示「請重新登入後台」畫面，而不是讓呼叫端只看到 Failed to fetch。
    // /api/admin/me 排除在外：那是「目前是否已登入」的初次檢查，未登入時 401 屬正常情況，
    // 不應被當成「session 已失效」。
    if (url.startsWith("/api/admin/") && url !== "/api/admin/me" && (r.status === 401 || r.status === 403)) {
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("chewcare:admin-session-expired"));
      throw new Error("管理員登入狀態已失效，請重新登入後台。");
    }
    throw new Error(data.error || "發生錯誤");
  }
  return data;
}

export const api = {
  // ── 前台 ──
  me:            ()                 => jf("/api/auth/me"),
  login:         (code)             => jf("/api/auth/login", { method: "POST", body: JSON.stringify({ code }) }),
  logout:        ()                 => jf("/api/auth/logout", { method: "POST" }),
  courses:       ()                 => jf("/api/courses"),
  quizQuestions: (courseId, unitId) => jf(`/api/quiz?courseId=${courseId}${unitId ? `&unitId=${encodeURIComponent(unitId)}` : ""}`),
  submitQuiz:    ({ courseId, unitId, answers }) => jf("/api/quiz-submit", { method: "POST", body: JSON.stringify({ courseId, unitId, answers }) }),
  markUnit:      (payload)          => jf("/api/progress", { method: "POST", body: JSON.stringify(payload) }),

  // ── 後台：認證 ──
  adminLogin:     (email, password) => jf("/api/admin/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  adminMe:        ()                => jf("/api/admin/me"),
  adminLogout:    ()                => jf("/api/admin/logout", { method: "POST" }),
  adminOverview:  ()                => jf("/api/admin/overview"),

  // ── 後台：使用者 ──
  adminUsers:     (q = "", group_id = "", tag = "") => jf(`/api/admin/users?q=${encodeURIComponent(q)}&group_id=${encodeURIComponent(group_id)}&tag=${encodeURIComponent(tag)}`),
  adminTags:      () => jf("/api/admin/tags"),
  adminUserCreate:(p)               => jf("/api/admin/users", { method: "POST", body: JSON.stringify(p) }),
  adminUserPatch: (p)               => jf("/api/admin/users", { method: "PATCH", body: JSON.stringify(p) }),
  adminUserDelete:(id)              => jf("/api/admin/users", { method: "DELETE", body: JSON.stringify({ id }) }),
  adminImport:    (rows)            => jf("/api/admin/import-users", { method: "POST", body: JSON.stringify({ rows }) }),

  // ── 後台：分類 ──
  adminGroups:      ()              => jf("/api/admin/groups"),
  adminGroupCreate: (p)             => jf("/api/admin/groups", { method: "POST", body: JSON.stringify(p) }),
  adminGroupPatch:  (p)             => jf("/api/admin/groups", { method: "PATCH", body: JSON.stringify(p) }),
  adminGroupDelete: (id)            => jf("/api/admin/groups", { method: "DELETE", body: JSON.stringify({ id }) }),

  // ── 後台：課程 / 單元 ──
  adminAllCourses:  ()              => jf("/api/admin/content?resource=course"),
  adminCourseCreate:(p)             => jf("/api/admin/content?resource=course", { method: "POST", body: JSON.stringify(p) }),
  adminCoursePatch: (p)             => jf("/api/admin/content?resource=course", { method: "PATCH", body: JSON.stringify(p) }),
  adminCourseDelete:(id, force)     => jf("/api/admin/content?resource=course", { method: "DELETE", body: JSON.stringify({ id, force: force || false }) }),
  adminUnitCreate:  (p)             => jf("/api/admin/content?resource=unit", { method: "POST", body: JSON.stringify(p) }),
  adminUnitPatch:   (p)             => jf("/api/admin/content?resource=unit", { method: "PATCH", body: JSON.stringify(p) }),
  adminUnitDelete:  (id)            => jf("/api/admin/content?resource=unit", { method: "DELETE", body: JSON.stringify({ id }) }),

  // ── 後台：管理員帳號 ──
  adminAdmins:      ()              => jf("/api/admin/admin-users"),
  adminAdminCreate: (p)             => jf("/api/admin/admin-users", { method: "POST", body: JSON.stringify(p) }),
  adminAdminPatch:  (p)             => jf("/api/admin/admin-users", { method: "PATCH", body: JSON.stringify(p) }),
  adminAdminDelete: (id)            => jf("/api/admin/admin-users", { method: "DELETE", body: JSON.stringify({ id }) }),

  // ── 後台：測驗題目 ──
  adminQuizQuestions: (courseId, unitId) => jf(`/api/admin/quiz${courseId ? `?course_id=${encodeURIComponent(courseId)}${unitId ? `&unit_id=${encodeURIComponent(unitId)}` : ""}` : ""}`),
  adminQuizCreate:    (p)           => jf("/api/admin/quiz", { method: "POST", body: JSON.stringify(p) }),
  adminQuizPatch:     (p)           => jf("/api/admin/quiz", { method: "PATCH", body: JSON.stringify(p) }),
  adminQuizDelete:    (id)          => jf("/api/admin/quiz", { method: "DELETE", body: JSON.stringify({ id }) }),

  // ── 後台：R2 上傳（影片 / 教材 / Banner / 通用）──
  adminR2UploadUrl: (filename, courseId, opts) => jf("/api/admin/r2-upload", { method: "POST", body: JSON.stringify({ filename, courseId, ...opts }) }),
  adminR2Status:    ()              => jf("/api/admin/r2-status"),
  // deprecated：舊版 Supabase Storage 上傳，僅保留向下相容，不再顯示於後台 UI
  adminUploadUrl:   (filename)      => jf("/api/admin/upload-url", { method: "POST", body: JSON.stringify({ filename }) }),

  // ── 後台：教材管理 ──
  adminMaterials: (courseId, unitId, opts) => {
    const p = new URLSearchParams();
    if (courseId) p.set("course_id", courseId);
    if (unitId) p.set("unit_id", unitId);
    if (opts?.asset_type) p.set("asset_type", opts.asset_type);
    if (opts?.status) p.set("status", opts.status);
    if (opts?.file_type) p.set("file_type", opts.file_type);
    const qs = p.toString();
    return jf(`/api/admin/materials${qs ? "?" + qs : ""}`);
  },
  adminVideoLibrary:       ()                => jf("/api/admin/materials?asset_type=video"),
  // 互動網頁（HTML）單元的素材選擇器：只列出已上架的 HTML 素材
  adminHtmlLibrary:        ()                => jf("/api/admin/materials?file_type=html&status=published"),
  adminMaterialCreate:     (p)               => jf("/api/admin/materials", { method: "POST", body: JSON.stringify(p) }),
  adminMaterialPatch:      (p)               => jf("/api/admin/materials", { method: "PATCH", body: JSON.stringify(p) }),
  adminMaterialDelete:     (id)              => jf("/api/admin/materials", { method: "DELETE", body: JSON.stringify({ id }) }),
  adminMaterialUploadUrl:  (filename, fileSize, opts) => jf("/api/admin/material-upload-url", { method: "POST", body: JSON.stringify({ filename, fileSize, ...opts }) }),

  // ── 後台：排序 ──
  adminCourseSort: (order) => jf("/api/admin/course-sort", { method: "POST", body: JSON.stringify({ order }) }),
  adminUnitSort:   (order) => jf("/api/admin/unit-sort",   { method: "POST", body: JSON.stringify({ order }) }),

  // ── 影片觀看進度 ──
  videoProgress:     (courseId)       => jf(`/api/video-progress?courseId=${encodeURIComponent(courseId)}`),
  saveVideoProgress: (p)              => jf("/api/video-progress", { method: "POST", body: JSON.stringify(p) }),

  // ── 前台：課程教材 ──
  courseMaterials: (courseId, unitId) => jf(`/api/course-materials?courseId=${encodeURIComponent(courseId)}${unitId ? `&unitId=${encodeURIComponent(unitId)}` : ""}`),
  logMaterialDownload: (courseId, materialId) => jf(`/api/course-materials?courseId=${encodeURIComponent(courseId)}&materialId=${encodeURIComponent(materialId)}&download=1`),

  // ── 後台：Banner 管理 ──
  adminBanners:          ()    => jf("/api/admin/banners"),
  adminBannerCreate:     (p)   => jf("/api/admin/banners", { method: "POST", body: JSON.stringify(p) }),
  adminBannerPatch:      (p)   => jf("/api/admin/banners", { method: "PATCH", body: JSON.stringify(p) }),
  adminBannerDelete:     (id)  => jf("/api/admin/banners", { method: "DELETE", body: JSON.stringify({ id }) }),
  adminBannerUploadUrl:  (fn)  => jf("/api/admin/banner-upload-url", { method: "POST", body: JSON.stringify({ filename: fn }) }),

  // ── 後台：首頁卡片 ──
  adminFeatureCards:      ()    => jf("/api/admin/feature-cards"),
  adminFeatureCardCreate: (p)   => jf("/api/admin/feature-cards", { method: "POST", body: JSON.stringify(p) }),
  adminFeatureCardPatch:  (p)   => jf("/api/admin/feature-cards", { method: "PATCH", body: JSON.stringify(p) }),
  adminFeatureCardDelete: (id)  => jf("/api/admin/feature-cards", { method: "DELETE", body: JSON.stringify({ id }) }),

  // ── 後台：課程分類 ──
  adminCategories:      ()   => jf("/api/admin/categories"),
  adminCategoryCreate:  (p)  => jf("/api/admin/categories", { method: "POST", body: JSON.stringify(p) }),
  adminCategoryPatch:   (p)  => jf("/api/admin/categories", { method: "PATCH", body: JSON.stringify(p) }),
  adminCategoryDelete:  (id) => jf("/api/admin/categories", { method: "DELETE", body: JSON.stringify({ id }) }),

  // ── 公開統計 ──
  publicStats:        () => jf("/api/public/stats"),
  publicBanners:      () => jf("/api/public/banners"),
  publicFeatureCards: () => jf("/api/public/feature-cards"),
  publicCategories:   () => jf("/api/public/categories"),

  // 匯出走瀏覽器下載，不經 jf
  exportUrl:      (type)            => `/api/admin/export?type=${type}`,
};
