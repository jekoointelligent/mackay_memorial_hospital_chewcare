import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { SITE } from "../lib/siteConfig";
import { detectMaterialType, isHtmlMaterial } from "../lib/materialType";

const C = { primary: "#E8392A", primaryLight: "#FDECEA", accent: "#1A73E8", dark: "#1A1A2E", gray700: "#374151", gray600: "#5B6472", gray400: "#9CA3AF", gray200: "#E5E7EB", gray100: "#F3F4F6", green: "#10B981", orange: "#F59E0B", sidebar: "#16213E" };

function useIsMobile() { const [m, setM] = useState(false); useEffect(() => { const fn = () => setM(window.innerWidth < 768); fn(); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []); return m; }
const Btn = ({ children, onClick, variant = "primary", size = "md", style = {}, disabled }) => { const pad = { sm: "6px 13px", md: "10px 20px" }[size]; const fs = { sm: "calc(13px * var(--fsc,1))", md: "calc(14px * var(--fsc,1))" }[size]; const v = { primary: { background: C.primary, color: "#fff" }, outline: { background: "transparent", color: C.primary, border: `1.5px solid ${C.primary}` }, ghost: { background: "transparent", color: C.gray600 }, dark: { background: C.dark, color: "#fff" } }[variant]; return <button onClick={onClick} disabled={disabled} style={{ border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600, padding: pad, fontSize: fs, opacity: disabled ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 5, ...v, ...style }}>{children}</button>; };
const Badge = ({ text, color = "blue" }) => { const m = { blue: ["#DBEAFE", "#1E40AF"], orange: ["#FEF3C7", "#92400E"], green: ["#D1FAE5", "#065F46"], gray: [C.gray100, C.gray600], red: [C.primaryLight, C.primary] }[color] || ["#DBEAFE", "#1E40AF"]; return <span style={{ background: m[0], color: m[1], padding: "3px 10px", borderRadius: 999, fontSize: "calc(12px * var(--fsc,1))", fontWeight: 700 }}>{text}</span>; };
const Bar = ({ pct, color = C.accent }) => <div style={{ background: C.gray200, borderRadius: 999, height: 6, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: color }} /></div>;
const Toast = ({ msg, type, onClose }) => { useEffect(() => { const t = setTimeout(onClose, 2600); return () => clearTimeout(t); }, [onClose]); return <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, background: type === "error" ? C.primary : C.green, color: "#fff", padding: "12px 20px", borderRadius: 10, fontWeight: 700, boxShadow: "0 6px 24px rgba(0,0,0,0.2)" }}>{type === "error" ? "⚠️ " : "✅ "}{msg}</div>; };

function AdminFontToggle() {
  const [cur, setCur] = useState("font-lg");
  useEffect(() => {
    try {
      const s = localStorage.getItem("fc");
      const cls = s !== null ? s : "font-lg";
      document.documentElement.classList.remove("font-lg", "font-xl");
      if (cls) document.documentElement.classList.add(cls);
      setCur(cls);
      if (s === null) localStorage.setItem("fc", cls);
    } catch (_) {}
  }, []);
  const set = (cls) => { document.documentElement.classList.remove("font-lg", "font-xl"); if (cls) document.documentElement.classList.add(cls); setCur(cls); try { localStorage.setItem("fc", cls); } catch (_) {} };
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      <span style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray400, marginRight: 2 }}>字級</span>
      {[["", "小", 11], ["font-lg", "中", 12], ["font-xl", "大", 13]].map(([cls, lbl, fs]) => (
        <button key={cls} onClick={() => set(cls)} style={{ border: `1px solid ${cur === cls ? C.primary : C.gray200}`, background: cur === cls ? C.primaryLight : "#fff", borderRadius: 4, padding: "2px 7px", fontSize: `calc(${fs}px * var(--fsc,1))`, cursor: "pointer", color: cur === cls ? C.primary : C.gray600 }}>{lbl}</button>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const isMobile = useIsMobile();
  const [authed, setAuthed] = useState(null);
  const [toast, setToast] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const showToast = (msg, type = "success") => setToast({ msg, type });

  // 只用 /api/admin/me（只信任 admin_session），不用前台的 /api/auth/me，
  // 避免同瀏覽器另一分頁的一般使用者登入狀態影響到後台判斷。
  useEffect(() => { api.adminMe().then(({ user }) => setAuthed(user && ["admin", "superadmin", "content_manager"].includes(user.role) ? user : false)).catch(() => setAuthed(false)); }, []);

  // 任何 /api/admin/* 呼叫回傳 401 / 403（session 已失效）時，顯示明確提示並提供重新登入按鈕
  useEffect(() => {
    const onExpired = () => setSessionExpired(true);
    window.addEventListener("chewcare:admin-session-expired", onExpired);
    return () => window.removeEventListener("chewcare:admin-session-expired", onExpired);
  }, []);

  if (sessionExpired) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F0F4F8", padding: 20, fontFamily: "'Noto Sans TC',sans-serif" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 36, maxWidth: 420, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div style={{ fontWeight: 800, fontSize: "calc(18px * var(--fsc,1))", marginBottom: 8 }}>管理員登入狀態已失效</div>
          <div style={{ color: C.gray600, fontSize: "calc(14px * var(--fsc,1))", marginBottom: 22 }}>請重新登入後台。</div>
          <Btn onClick={() => location.reload()} style={{ width: "100%", justifyContent: "center" }}>重新登入</Btn>
        </div>
      </div>
    );
  }
  if (authed === null) return <div style={{ padding: 80, textAlign: "center" }}>載入中…</div>;
  if (!authed) return <>{toast && <Toast {...toast} onClose={() => setToast(null)} />}<AdminLogin onOk={() => location.reload()} showToast={showToast} isMobile={isMobile} /></>;
  return <>{toast && <Toast {...toast} onClose={() => setToast(null)} />}<AdminShell showToast={showToast} isMobile={isMobile} meId={authed.id} meRole={authed.role} /></>;
}

function AdminLogin({ showToast, isMobile }) {
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => { setErr(""); setBusy(true); try { await api.adminLogin(email, pw); location.reload(); } catch (e) { setErr(e.message); } finally { setBusy(false); } };
  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${C.sidebar},#0F3460)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Noto Sans TC',sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: isMobile ? 28 : 44, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ width: 56, height: 56, background: C.primary, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", fontSize: "calc(24px * var(--fsc,1))", fontWeight: 900, color: "#fff" }}>{SITE.logoChar}</div>
          <h1 style={{ fontSize: "calc(22px * var(--fsc,1))", fontWeight: 800, color: C.dark }}>後台管理登入</h1>
          <p style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600, marginTop: 6 }}>僅限管理員帳號存取</p>
        </div>
        <Field label="管理員 Email"><input value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@health.com" style={inp} /></Field>
        <Field label="密碼"><input value={pw} onChange={e => setPw(e.target.value)} type="password" placeholder="請輸入管理員密碼" onKeyDown={e => e.key === "Enter" && go()} style={inp} /></Field>
        {err && <div style={{ background: C.primaryLight, color: C.primary, padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: "calc(13px * var(--fsc,1))" }}>{err}</div>}
        <Btn onClick={go} disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "13px 0", fontSize: "calc(16px * var(--fsc,1))" }}>{busy ? "登入中…" : "登入後台"}</Btn>
        <div style={{ textAlign: "center", marginTop: 16 }}><Link href="/" style={{ color: C.gray400, fontSize: "calc(13px * var(--fsc,1))" }}>← 返回前台</Link></div>
      </div>
    </div>
  );
}
const inp = { width: "100%", padding: "11px 14px", border: `1.5px solid ${C.gray200}`, borderRadius: 8, fontSize: "calc(15px * var(--fsc,1))", outline: "none", boxSizing: "border-box", marginBottom: 4 };
const Field = ({ label, children }) => <div style={{ marginBottom: 16 }}><label style={{ display: "block", marginBottom: 6, fontSize: "calc(13px * var(--fsc,1))", fontWeight: 600, color: C.gray700 }}>{label}</label>{children}</div>;

function AdminShell({ showToast, isMobile, meId, meRole }) {
  const [sec, setSec] = useState("dashboard");
  const [open, setOpen] = useState(!isMobile);
  const [quizJump, setQuizJump] = useState(null); // { courseId, unitId }
  const jumpToQuiz = (courseId, unitId) => { setQuizJump({ courseId, unitId }); setSec("quizzes"); };
  const isSuper = meRole === "superadmin";
  const isAdmin = isSuper || meRole === "admin";
  const navDef = [
    ["dashboard",  "📊 儀表板",          true],
    ["accounts",   "👥 帳號管理",         isAdmin],
    ["content",    "🎬 課程管理",         true],
    ["quizzes",    "📝 測驗管理",         true],
    ["materials",  "📎 素材管理",         true],
    ["banners",    "🖼️ Banner 管理",     false], // 暫時隱藏，功能與資料表保留
    ["features",   "🃏 首頁卡片",         true],
    ["progress",   "📈 學習進度",         isAdmin],
    ["logs",       "📋 活動紀錄",         isAdmin],
  ];
  const nav = navDef.filter(([, , visible]) => visible).map(([k, l]) => [k, l]);
  // 只清除 admin_session，不影響同瀏覽器其他分頁的一般使用者登入狀態
  const logout = async () => { await api.adminLogout(); location.href = "/"; };
  return (
    <div style={{ display: "flex", minHeight: "100vh", flexDirection: isMobile ? "column" : "row", fontFamily: "'Noto Sans TC',sans-serif" }}>
      {isMobile && <div style={{ background: C.sidebar, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}><span style={{ color: "#fff", fontWeight: 700, flex: 1 }}>⚙️ 後台管理</span><span onClick={() => setOpen(!open)} style={{ color: "#fff", cursor: "pointer", fontSize: "calc(20px * var(--fsc,1))" }}>☰</span></div>}
      {(!isMobile || open) && (
        <div style={{ width: isMobile ? "100%" : 210, background: C.sidebar, flexShrink: 0 }}>
          {!isMobile && <div style={{ padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontWeight: 700, display: "flex", gap: 8, alignItems: "center" }}><div style={{ width: 28, height: 28, background: C.primary, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>{SITE.logoChar}</div>{SITE.adminName}</div>}
          <div style={{ padding: "8px 0" }}>{nav.map(([k, l]) => <div key={k} onClick={() => { setSec(k); if (isMobile) setOpen(false); }} style={{ padding: "11px 18px", cursor: "pointer", color: sec === k ? "#fff" : "rgba(255,255,255,0.6)", background: sec === k ? "rgba(232,57,42,0.15)" : "transparent", borderLeft: sec === k ? `3px solid ${C.primary}` : "3px solid transparent", fontSize: "calc(14px * var(--fsc,1))" }}>{l}</div>)}</div>
        </div>
      )}
      <div style={{ flex: 1, background: "#F0F4F8", overflow: "auto" }}>
        <div style={{ background: "#fff", borderBottom: `1px solid ${C.gray200}`, padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
          <AdminFontToggle />
          <Link href="/"><Btn size="sm" variant="outline">← 前台</Btn></Link>
          <Btn size="sm" variant="ghost" onClick={logout}>登出</Btn>
        </div>
        <div style={{ padding: isMobile ? 16 : 24 }}>
          {sec === "dashboard" && <Dash />}
          {sec === "accounts"  && <Accounts showToast={showToast} isMobile={isMobile} meId={meId} meRole={meRole} />}
          {sec === "content"   && <Content showToast={showToast} isMobile={isMobile} onJumpToQuiz={jumpToQuiz} />}
          {sec === "quizzes"   && <Quizzes showToast={showToast} isMobile={isMobile} initCourseId={quizJump?.courseId} initUnitId={quizJump?.unitId} onMounted={() => setQuizJump(null)} />}
          {sec === "materials" && <Materials showToast={showToast} isMobile={isMobile} />}
          {sec === "banners"   && <div style={{ padding: 40, textAlign: "center", color: "#9CA3AF" }}>此功能暫未開放。</div>}
          {sec === "features"  && <FeatureCards showToast={showToast} isMobile={isMobile} />}
          {sec === "progress"  && <ProgressView />}
          {sec === "logs"      && <Logs />}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 課程分類管理面板（嵌入 Content 內）
// ═══════════════════════════════════════════════════════════════
function CategoryManager({ categories, reloadCats, showToast, isMobile }) {
  const [showAdd, setShowAdd] = useState(false);
  const blank = { name: "", bg_color: "#DBEAFE", text_color: "#1E40AF", sort_order: 0 };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [ef, setEf] = useState({});
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!form.name.trim()) { showToast("請填寫分類名稱", "error"); return; }
    setBusy(true);
    try { await api.adminCategoryCreate(form); setForm(blank); setShowAdd(false); reloadCats(); showToast("分類已建立"); }
    catch (e) { showToast(e.message, "error"); } finally { setBusy(false); }
  };
  const save = async (id) => {
    try { await api.adminCategoryPatch({ id, ...ef }); setEditId(null); reloadCats(); showToast("已更新"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const toggle = async (ct) => {
    try { await api.adminCategoryPatch({ id: ct.id, status: ct.status === "active" ? "inactive" : "active" }); reloadCats(); showToast(ct.status === "active" ? "已停用" : "已啟用"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const del = async (id) => {
    try { await api.adminCategoryDelete(id); reloadCats(); showToast("已刪除", "error"); }
    catch (e) { showToast(e.message, "error"); }
  };

  const colorOpts = [
    ["#FDECEA","#E8392A","紅"], ["#DBEAFE","#1A73E8","藍"], ["#D1FAE5","#10B981","綠"],
    ["#FEF3C7","#92400E","黃"], ["#EDE9FE","#7C3AED","紫"], ["#FCE7F3","#DB2777","粉"],
  ];

  return (
    <div style={{ background: "#EBF4FF", borderRadius: 12, padding: 16, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: "calc(14px * var(--fsc,1))" }}>🏷️ 課程分類管理</span>
        <Btn size="sm" onClick={() => setShowAdd(!showAdd)}>＋ 新增分類</Btn>
      </div>

      {showAdd && (
        <div style={{ background: "#fff", borderRadius: 10, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto", gap: 8, marginBottom: 8 }}>
            <div><label style={lbl}>分類名稱 *</label><input placeholder="例：基礎護理" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></div>
            <div>
              <label style={lbl}>顏色主題</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {colorOpts.map(([bg, text, label]) => (
                  <button key={bg} type="button" onClick={() => setForm({ ...form, bg_color: bg, text_color: text })}
                    style={{ background: bg, color: text, border: form.bg_color === bg ? "2px solid " + text : "2px solid transparent", borderRadius: 6, padding: "3px 10px", fontSize: "calc(12px * var(--fsc,1))", fontWeight: 700, cursor: "pointer" }}>{label}</button>
                ))}
              </div>
            </div>
            <div><label style={lbl}>排序</label><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: Number(e.target.value) })} style={{ ...inp, width: 70 }} /></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}><Btn size="sm" onClick={add} disabled={busy}>建立</Btn><Btn size="sm" variant="ghost" onClick={() => setShowAdd(false)}>取消</Btn></div>
        </div>
      )}

      {categories.length === 0 && <div style={{ color: C.gray400, fontSize: "calc(13px * var(--fsc,1))" }}>尚無分類，請新增</div>}
      {categories.map(ct => (
        <div key={ct.id} style={{ background: "#fff", borderRadius: 8, padding: "8px 12px", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
          {editId === ct.id ? (
            <>
              <input defaultValue={ct.name} onChange={e => setEf({ ...ef, name: e.target.value })} style={{ ...inp, flex: 1, marginBottom: 0 }} />
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {colorOpts.map(([bg, text, label]) => (
                  <button key={bg} type="button" onClick={() => setEf({ ...ef, bg_color: bg, text_color: text })}
                    style={{ background: bg, color: text, border: (ef.bg_color || ct.bg_color) === bg ? "2px solid " + text : "2px solid transparent", borderRadius: 6, padding: "2px 8px", fontSize: "calc(11px * var(--fsc,1))", fontWeight: 700, cursor: "pointer" }}>{label}</button>
                ))}
              </div>
              <Btn size="sm" onClick={() => save(ct.id)}>儲存</Btn>
              <Btn size="sm" variant="ghost" onClick={() => { setEditId(null); setEf({}); }}>取消</Btn>
            </>
          ) : (
            <>
              <span style={{ background: ct.bg_color, color: ct.text_color, borderRadius: 999, padding: "3px 12px", fontWeight: 700, fontSize: "calc(13px * var(--fsc,1))" }}>{ct.name}</span>
              <span style={{ fontSize: "calc(12px * var(--fsc,1))", color: C.gray400 }}>排序 {ct.sort_order}</span>
              <Badge text={ct.status === "active" ? "啟用" : "停用"} color={ct.status === "active" ? "green" : "gray"} />
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                <Btn size="sm" variant="outline" onClick={() => { setEditId(ct.id); setEf({}); }}>✏️</Btn>
                <Btn size="sm" variant="ghost" onClick={() => toggle(ct)}>{ct.status === "active" ? "⏸" : "▶"}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => del(ct.id)}>🗑</Btn>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 課程 / 影片管理
// ═══════════════════════════════════════════════════════════════
// 排序工具函數（在任意 list 中移動一個 item）
function moveItem(list, idx, dir) {
  const a = [...list];
  if (dir === "top")    { const [it] = a.splice(idx, 1); a.unshift(it); }
  else if (dir === "up")    { if (idx > 0) { [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; } }
  else if (dir === "down")  { if (idx < a.length - 1) { [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; } }
  else if (dir === "bottom"){ const [it] = a.splice(idx, 1); a.push(it); }
  return a;
}

function Content({ showToast, isMobile, onJumpToQuiz }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [showAddCourse, setShowAddCourse] = useState(false);
  const blankCourse = { title: "", category: "", description: "", emoji: "🍽️", sort_order: "" };
  const [courseForm, setCourseForm] = useState(blankCourse);
  const [editCourse, setEditCourse] = useState(null);
  const [showAddUnit, setShowAddUnit] = useState(null);
  const blankUnit = { title: "", description: "", type: "video", video_kind: "r2", video_url: "", duration: "", sort_order: "", source_type: "", original_url: "", storage_key: "", file_name: "", file_size: "", track_progress: false };
  const [unitForm, setUnitForm] = useState(blankUnit);
  const [editUnit, setEditUnit] = useState(null);
  // 編輯影片單元時，若影片來源真的改變，先跳出確認提示再決定是否重置該單元進度
  const [pendingUnitSave, setPendingUnitSave] = useState(null); // { id, payload }
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const editFileRef = useRef(null);
  const r2FileRef = useRef(null);
  const editR2FileRef = useRef(null);
  // 課程排序
  const [sortCourseMode, setSortCourseMode] = useState(false);
  const [sortCourseList, setSortCourseList] = useState([]);
  const [sortCourseBusy, setSortCourseBusy] = useState(false);
  // 單元排序
  const [sortUnitCourseId, setSortUnitCourseId] = useState(null);
  const [sortUnitList, setSortUnitList] = useState([]);
  const [sortUnitBusy, setSortUnitBusy] = useState(false);
  // 影片庫（status != archived 的 video 素材）
  const [videoLibrary, setVideoLibrary] = useState([]);
  // HTML 素材庫（互動網頁單元專用，只列出已上架的 HTML 素材）
  const [htmlLibrary, setHtmlLibrary] = useState([]);
  // 課程分類
  const [categories, setCategories] = useState([]);
  const [showCatMgr, setShowCatMgr] = useState(false);
  // quiz 題目數量 map (unitId → count)
  const [quizCountMap, setQuizCountMap] = useState({});
  // 內嵌 quiz 題目管理面板
  const [inlineQuiz, setInlineQuiz] = useState(null); // {courseId, unitId, title}

  const loadQuizCounts = (cs) => {
    const pairs = (cs || []).flatMap(c => (c.units || []).filter(u => u.type === "quiz").map(u => ({ cid: c.id, uid: u.id })));
    if (!pairs.length) return;
    Promise.all(pairs.map(({ cid, uid }) => api.adminQuizQuestions(cid, uid).then(({ questions }) => [uid, (questions || []).length]).catch(() => [uid, null])))
      .then(results => { const m = {}; results.forEach(([uid, n]) => { if (n !== null) m[uid] = n; }); setQuizCountMap(m); });
  };

  const load = () => { setLoading(true); api.adminAllCourses().then(({ courses: cs }) => { setCourses(cs || []); loadQuizCounts(cs); }).catch(() => showToast("載入失敗", "error")).finally(() => setLoading(false)); };
  const loadCats = () => api.adminCategories().then(({ categories: cs }) => setCategories(cs || [])).catch(() => {});
  useEffect(() => { load(); loadCats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.adminVideoLibrary().then(({ materials: ms }) => setVideoLibrary((ms || []).filter(m => m.status !== "archived"))).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.adminHtmlLibrary().then(({ materials: ms }) => setHtmlLibrary(ms || [])).catch(() => {}); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (file, onDone) => {
    if (!file) return;
    setUploading(true);
    try {
      const { uploadUrl, publicUrl } = await api.adminUploadUrl(file.name);
      await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      onDone(publicUrl);
    } catch (e) { showToast(e.message || "上傳失敗", "error"); }
    finally { setUploading(false); }
  };

  const handleR2Upload = async (file, courseId, onDone) => {
    if (!file) return;
    const MAX_MB = 500;
    if (file.size > MAX_MB * 1024 * 1024) { showToast(`影片不可超過 ${MAX_MB} MB`, "error"); return; }
    setUploading(true);
    try {
      const { uploadUrl, publicUrl, key } = await api.adminR2UploadUrl(file.name, courseId);
      const resp = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": "video/mp4" } });
      if (!resp.ok) throw new Error(`R2 上傳失敗（HTTP ${resp.status}）`);
      onDone({ publicUrl, key, fileName: file.name, fileSize: file.size });
      showToast("影片已上傳至 R2");
    } catch (e) { showToast(e.message || "R2 上傳失敗", "error"); }
    finally { setUploading(false); }
  };

  // Google Drive URL 工具：從各種 Drive 分享連結抽出 FILE_ID
  const extractDriveId = (url) => {
    if (!url) return null;
    const m = url.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
    if (m) return m[1];
    const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/);
    return m2 ? m2[1] : null;
  };
  const toDrivePreview = (url) => {
    const id = extractDriveId(url);
    return id ? `https://drive.google.com/file/d/${id}/preview` : null;
  };

  // URL 自動偵測（用於「貼上影片連結」選項）
  const detectUrl = (url) => {
    if (!url || !url.trim()) return null;
    if (/youtube\.com|youtu\.be/.test(url)) return { label: "✅ 已偵測為 YouTube，可自動紀錄進度", bg: "#D1FAE5", color: "#065F46" };
    if (/drive\.google\.com/.test(url)) return { label: "⚠️ 已偵測為 Google Drive，可播放但不紀錄進度", bg: "#FEF3C7", color: "#92400E" };
    if (/\.(mp4|m4v|webm|ogg)(\?|#|$)/i.test(url)) return { label: "✅ 已偵測為影片網址，可自動紀錄進度", bg: "#D1FAE5", color: "#065F46" };
    return { label: "❓ 無法判斷影片來源，請確認是否為 YouTube、Google Drive 或 mp4 連結", bg: "#FDECEA", color: C.primary };
  };

  // 儲存前處理影片單元 payload（Drive URL 轉換、source_type 設定）
  const buildUnitVideoPayload = (form) => {
    if (form.type !== "video") return form;
    const vk = form.video_kind;
    let extra = {};
    if (vk === "drive") {
      const previewUrl = toDrivePreview(form.video_url);
      if (!previewUrl) throw new Error("無法解析 Google Drive 連結，請確認連結格式（需包含 /d/FILE_ID）");
      extra = { video_url: previewUrl, original_url: form.video_url, source_type: "google_drive_iframe" };
    } else if (vk === "link") {
      // 自動判斷連結類型
      const url = form.video_url || "";
      if (/youtube\.com|youtu\.be/.test(url)) {
        extra = { source_type: "youtube", video_kind: "youtube" };
      } else if (/drive\.google\.com/.test(url)) {
        const previewUrl = toDrivePreview(url);
        if (!previewUrl) throw new Error("無法解析 Google Drive 連結，請確認連結格式");
        extra = { video_url: previewUrl, original_url: url, source_type: "google_drive_iframe", video_kind: "drive" };
      } else {
        extra = { source_type: "external_mp4", video_kind: "url" };
      }
    } else if (vk === "youtube") {
      extra = { source_type: "youtube" };
    } else if (vk === "r2") {
      extra = { source_type: "r2_video", video_kind: "r2" };
    } else if (vk === "upload") {
      extra = { source_type: "html5_video" };
    } else if (vk === "library") {
      extra = { source_type: "html5_video" };
    } else if (vk === "url") {
      extra = { source_type: "external_mp4" };
    }
    return { ...form, ...extra };
  };

  const addCourse = async () => {
    try { await api.adminCourseCreate({ ...courseForm, sort_order: Number(courseForm.sort_order) || 0 }); setCourseForm(blankCourse); setShowAddCourse(false); load(); showToast("課程已建立"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const saveCourse = async () => {
    const { id, ...patch } = editCourse;
    try { await api.adminCoursePatch({ id, ...patch, sort_order: Number(patch.sort_order) || 0 }); setEditCourse(null); load(); showToast("課程已更新"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const deleteCourse = async (c) => {
    const unitCount = c.units?.length || 0;
    const msg = unitCount > 0
      ? `確定刪除課程「${c.title}」？此課程含 ${unitCount} 個單元，刪除後一併移除，無法復原。`
      : `確定刪除課程「${c.title}」？此動作無法復原。`;
    if (!confirm(msg)) return;
    try { await api.adminCourseDelete(c.id, true); load(); showToast("課程已刪除", "error"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const togglePublish = async (c) => {
    try { await api.adminCoursePatch({ id: c.id, published: !c.published }); load(); showToast(c.published ? "課程已下架" : "課程已上架"); }
    catch (e) { showToast(e.message, "error"); }
  };

  const addUnit = async (courseId) => {
    const isQuiz = unitForm.type === "quiz";
    const unitTitle = unitForm.title;
    try {
      const payload = buildUnitVideoPayload({ ...unitForm, sort_order: Number(unitForm.sort_order) || 0 });
      const { unit: newUnit } = await api.adminUnitCreate({ course_id: courseId, ...payload });
      setUnitForm(blankUnit); setShowAddUnit(null); load(); showToast("單元已建立");
      if (isQuiz && newUnit?.id) {
        setExpanded(e => ({ ...e, [courseId]: true }));
        setTimeout(() => setInlineQuiz({ courseId, unitId: newUnit.id, title: newUnit.title || unitTitle }), 400);
      }
    } catch (e) { showToast(e.message, "error"); }
  };
  // 實際送出單元更新；resetProgress 只在「內容來源真的改變」且管理員明確選擇重置時才會是 true
  const doSaveUnit = async (id, payload, resetProgress, sourceChanged) => {
    try {
      const { progressReset } = await api.adminUnitPatch({ id, ...payload, resetProgress });
      setEditUnit(null); setPendingUnitSave(null); load();
      if (progressReset) showToast("單元已更新，並已重置此單元的學員學習進度");
      else if (sourceChanged) showToast("單元已更新，原有學員學習進度已保留");
      else showToast("單元已更新");
    } catch (e) { showToast(e.message, "error"); }
  };
  // 適用「影片」與「互動網頁（HTML）」單元：兩者都是透過 video_url / storage_key 存放內容來源
  const CONTENT_TYPES = ["video", "interactive_html"];
  const saveUnit = async () => {
    const { id, _origVideoUrl, _origStorageKey, ...patch } = editUnit;
    try {
      const payload = buildUnitVideoPayload({ ...patch, sort_order: Number(patch.sort_order) || 0 });
      const sourceChanged = CONTENT_TYPES.includes(payload.type) && (
        String(payload.video_url || "") !== String(_origVideoUrl || "") ||
        String(payload.storage_key || "") !== String(_origStorageKey || "")
      );
      if (sourceChanged) { setPendingUnitSave({ id, payload }); return; }
      await doSaveUnit(id, payload, false, false);
    } catch (e) { showToast(e.message, "error"); }
  };
  const deleteUnit = async (id) => {
    if (!confirm("確定刪除此單元？")) return;
    try { await api.adminUnitDelete(id); load(); showToast("單元已刪除", "error"); }
    catch (e) { showToast(e.message, "error"); }
  };

  // 課程排序
  const openSortCourse = () => { setSortCourseList([...courses]); setSortCourseMode(true); };
  const saveSortCourse = async () => {
    setSortCourseBusy(true);
    try {
      await api.adminCourseSort(sortCourseList.map((c, i) => ({ id: c.id, sort_order: i })));
      setSortCourseMode(false); load(); showToast("課程排序已儲存");
    } catch (e) { showToast(e.message, "error"); } finally { setSortCourseBusy(false); }
  };

  // 單元排序
  const openSortUnit = (c) => { setSortUnitCourseId(c.id); setSortUnitList([...(c.units || [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))); };
  const saveSortUnit = async () => {
    setSortUnitBusy(true);
    try {
      await api.adminUnitSort(sortUnitList.map((u, i) => ({ id: u.id, sort_order: i })));
      setSortUnitCourseId(null); load(); showToast("單元排序已儲存");
    } catch (e) { showToast(e.message, "error"); } finally { setSortUnitBusy(false); }
  };

  const vidKindLabel = k => ({ youtube: "YouTube", url: "mp4 直連", upload: "Supabase 上傳", library: "平台影片庫", drive: "Google Drive", r2: "平台影片庫 (R2)", link: "影片連結", html: "HTML 素材庫" }[k] || k || "—");
  const sortBtnStyle = { border: `1px solid ${C.gray200}`, background: "#fff", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: "calc(16px * var(--fsc,1))", lineHeight: 1 };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>載入中…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800 }}>課程／影片管理</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="ghost" size="sm" onClick={() => setShowCatMgr(!showCatMgr)}>🏷️ 分類管理</Btn>
          {courses.length > 1 && <Btn variant="outline" size="sm" onClick={openSortCourse}>📋 排序課程</Btn>}
          <Btn onClick={() => { setShowAddCourse(true); setEditCourse(null); }}>＋ 新增課程</Btn>
        </div>
      </div>
      {showCatMgr && <CategoryManager categories={categories} reloadCats={loadCats} showToast={showToast} isMobile={isMobile} />}

      {/* 課程排序面板 */}
      {sortCourseMode && (
        <div style={{ background: "#EBF4FF", borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>拖動排序（上移 ↑ / 下移 ↓ / 置頂 ⤒ / 置底 ⤓）</div>
          {sortCourseList.map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 8, padding: "8px 12px", marginBottom: 6 }}>
              <span style={{ fontWeight: 700, color: C.gray400, width: 24 }}>{i + 1}</span>
              <span style={{ fontSize: "calc(18px * var(--fsc,1))" }}>{c.emoji}</span>
              <span style={{ flex: 1, fontWeight: 600, fontSize: "calc(14px * var(--fsc,1))" }}>{c.title}</span>
              <button style={sortBtnStyle} onClick={() => setSortCourseList(l => moveItem(l, i, "top"))} title="置頂">⤒</button>
              <button style={sortBtnStyle} onClick={() => setSortCourseList(l => moveItem(l, i, "up"))} title="上移" disabled={i === 0}>↑</button>
              <button style={sortBtnStyle} onClick={() => setSortCourseList(l => moveItem(l, i, "down"))} title="下移" disabled={i === sortCourseList.length - 1}>↓</button>
              <button style={sortBtnStyle} onClick={() => setSortCourseList(l => moveItem(l, i, "bottom"))} title="置底">⤓</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Btn size="sm" onClick={saveSortCourse} disabled={sortCourseBusy}>{sortCourseBusy ? "儲存中…" : "儲存排序"}</Btn>
            <Btn size="sm" variant="ghost" onClick={() => setSortCourseMode(false)}>取消</Btn>
          </div>
        </div>
      )}

      {showAddCourse && (
        <div style={{ background: C.primaryLight, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>新增課程</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 60px 80px", gap: 10, marginBottom: 8 }}>
            <div><label style={lbl}>課程標題 *</label><input placeholder="例：口腔護理入門" value={courseForm.title} onChange={e => setCourseForm({ ...courseForm, title: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>分類 *</label><select value={courseForm.category} onChange={e => setCourseForm({ ...courseForm, category: e.target.value })} style={inp}><option value="">請選擇分類</option>{categories.map(ct => <option key={ct.id} value={ct.name}>{ct.name}</option>)}</select></div>
            <div><label style={lbl}>排序</label><input type="number" placeholder="0" value={courseForm.sort_order} onChange={e => setCourseForm({ ...courseForm, sort_order: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>Emoji</label><input placeholder="🍽️" value={courseForm.emoji} onChange={e => setCourseForm({ ...courseForm, emoji: e.target.value })} style={inp} /></div>
          </div>
          <div style={{ marginBottom: 8 }}><label style={lbl}>說明</label><input placeholder="課程介紹（選填）" value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} style={inp} /></div>
          <div style={{ display: "flex", gap: 8 }}><Btn onClick={addCourse} disabled={!courseForm.title || !courseForm.category}>建立</Btn><Btn variant="outline" onClick={() => setShowAddCourse(false)}>取消</Btn></div>
        </div>
      )}

      {courses.length === 0 && !showAddCourse && <div style={{ background: "#fff", borderRadius: 14, padding: 50, textAlign: "center", color: C.gray400 }}>尚無課程，請點「新增課程」建立</div>}

      {courses.map(c => (
        <div key={c.id} style={{ background: "#fff", borderRadius: 14, marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          {editCourse?.id === c.id ? (
            <div style={{ padding: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 60px 80px", gap: 10, marginBottom: 8 }}>
                <div><label style={lbl}>課程標題</label><input value={editCourse.title} onChange={e => setEditCourse({ ...editCourse, title: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>分類</label><select value={editCourse.category} onChange={e => setEditCourse({ ...editCourse, category: e.target.value })} style={inp}><option value="">請選擇分類</option>{categories.map(ct => <option key={ct.id} value={ct.name}>{ct.name}</option>)}</select></div>
                <div><label style={lbl}>排序</label><input type="number" value={editCourse.sort_order || ""} onChange={e => setEditCourse({ ...editCourse, sort_order: e.target.value })} style={inp} /></div>
                <div><label style={lbl}>Emoji</label><input value={editCourse.emoji || ""} onChange={e => setEditCourse({ ...editCourse, emoji: e.target.value })} style={inp} /></div>
              </div>
              <div style={{ marginBottom: 8 }}><label style={lbl}>說明</label><input value={editCourse.description || ""} onChange={e => setEditCourse({ ...editCourse, description: e.target.value })} style={inp} /></div>
              <div style={{ display: "flex", gap: 8 }}><Btn size="sm" onClick={saveCourse}>儲存</Btn><Btn size="sm" variant="ghost" onClick={() => setEditCourse(null)}>取消</Btn></div>
            </div>
          ) : (
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: expanded[c.id] ? `1px solid ${C.gray200}` : "none", cursor: "pointer" }} onClick={() => setExpanded(ex => ({ ...ex, [c.id]: !ex[c.id] }))}>
              <span style={{ fontSize: "calc(22px * var(--fsc,1))" }}>{c.emoji || "🍽️"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "calc(15px * var(--fsc,1))" }}>{c.title}</div>
                <div style={{ marginTop: 3, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {c.category && <Badge text={c.category} color="blue" />}
                  <span style={{ fontSize: "calc(12px * var(--fsc,1))", color: C.gray600 }}>{c.units?.length || 0} 個單元</span>
                  {c.sort_order != null && c.sort_order !== 0 && <span style={{ fontSize: "calc(12px * var(--fsc,1))", color: C.gray400 }}>排序 {c.sort_order}</span>}
                </div>
              </div>
              <Badge text={c.published ? "已上架" : "草稿"} color={c.published ? "green" : "gray"} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }} onClick={e => e.stopPropagation()}>
                <Btn size="sm" variant="outline" onClick={() => { setEditCourse({ id: c.id, title: c.title, category: c.category, description: c.description || "", emoji: c.emoji || "🍽️", sort_order: c.sort_order ?? 0 }); setShowAddCourse(false); }}>✏️ 編輯</Btn>
                <Btn size="sm" variant="ghost" onClick={() => togglePublish(c)}>{c.published ? "⏸ 下架" : "▶ 上架"}</Btn>
                <Btn size="sm" variant="ghost" onClick={() => deleteCourse(c)}>🗑</Btn>
              </div>
              <span style={{ color: C.gray400, fontSize: "calc(12px * var(--fsc,1))", whiteSpace: "nowrap" }}>{expanded[c.id] ? "▲ 收合" : "▼ 管理單元"}</span>
            </div>
          )}

          {expanded[c.id] && (
            <div style={{ padding: "10px 16px 16px" }}>
              {/* 單元排序面板 */}
              {sortUnitCourseId === c.id ? (
                <div style={{ background: "#EBF4FF", borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: "calc(13px * var(--fsc,1))", marginBottom: 8 }}>單元排序</div>
                  {sortUnitList.map((u, i) => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 8, padding: "7px 10px", marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, color: C.gray400, width: 20, fontSize: "calc(12px * var(--fsc,1))" }}>{i + 1}</span>
                      <span style={{ fontSize: "calc(14px * var(--fsc,1))" }}>{u.type === "quiz" ? "📝" : u.type === "text" ? "📄" : u.type === "interactive_html" ? "🌐" : "🎬"}</span>
                      <span style={{ flex: 1, fontSize: "calc(13px * var(--fsc,1))", fontWeight: 600 }}>{u.title}</span>
                      <button style={sortBtnStyle} onClick={() => setSortUnitList(l => moveItem(l, i, "top"))} title="置頂">⤒</button>
                      <button style={sortBtnStyle} onClick={() => setSortUnitList(l => moveItem(l, i, "up"))} title="上移" disabled={i === 0}>↑</button>
                      <button style={sortBtnStyle} onClick={() => setSortUnitList(l => moveItem(l, i, "down"))} title="下移" disabled={i === sortUnitList.length - 1}>↓</button>
                      <button style={sortBtnStyle} onClick={() => setSortUnitList(l => moveItem(l, i, "bottom"))} title="置底">⤓</button>
                    </div>
                  ))}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <Btn size="sm" onClick={saveSortUnit} disabled={sortUnitBusy}>{sortUnitBusy ? "儲存中…" : "儲存排序"}</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => setSortUnitCourseId(null)}>取消</Btn>
                  </div>
                </div>
              ) : (
                (c.units || []).length > 1 && <Btn size="sm" variant="outline" style={{ marginBottom: 8 }} onClick={() => openSortUnit(c)}>📋 單元排序</Btn>
              )}

              {(c.units || []).length === 0 && <div style={{ color: C.gray400, fontSize: "calc(13px * var(--fsc,1))", padding: "6px 0 10px" }}>尚無單元</div>}
              {(c.units || []).map(u => (
                <div key={u.id} style={{ background: C.gray100, borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                  {editUnit?.id === u.id ? (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : (editUnit.type === "video" || editUnit.type === "interactive_html") ? "2fr 1fr 1fr 1fr 60px" : "2fr 1fr 60px", gap: 8, marginBottom: 8 }}>
                        <div><label style={lbl}>標題</label><input value={editUnit.title} onChange={e => setEditUnit({ ...editUnit, title: e.target.value })} style={inp} /></div>
                        <div><label style={lbl}>類型</label><select value={editUnit.type} onChange={e => setEditUnit({ ...editUnit, type: e.target.value, video_kind: e.target.value === "interactive_html" ? "html" : "r2", video_url: "", storage_key: "", source_type: "" })} style={inp}><option value="video">影片</option><option value="interactive_html">互動網頁（HTML）</option><option value="quiz">測驗</option><option value="text">文字</option></select></div>
                        {editUnit.type === "video" && <>
                          <div>
                            <label style={lbl}>影片來源</label>
                            <select value={editUnit.video_kind} onChange={e => setEditUnit({ ...editUnit, video_kind: e.target.value, video_url: "" })} style={inp}>
                              <option value="r2">上傳影片</option>
                              <option value="library">從素材庫選擇</option>
                              {editUnit.video_kind && !["r2", "library"].includes(editUnit.video_kind) && <option value={editUnit.video_kind}>{vidKindLabel(editUnit.video_kind)}（現有設定）</option>}
                            </select>
                          </div>
                          <div>
                            <label style={lbl}>{editUnit.video_kind === "upload" || editUnit.video_kind === "r2" ? "上傳檔案" : editUnit.video_kind === "library" ? "選擇影片" : "影片網址"}</label>
                            {editUnit.video_kind === "library"
                              ? <select value={editUnit.video_url || ""} onChange={e => setEditUnit({ ...editUnit, video_url: e.target.value })} style={inp}><option value="">請選擇影片庫中的影片</option>{videoLibrary.map(v => <option key={v.id} value={v.file_url}>{v.title}</option>)}</select>
                              : editUnit.video_kind === "r2"
                              ? <><input type="file" accept="video/mp4,video/*" ref={editR2FileRef} style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (f) handleR2Upload(f, editUnit.course_id, ({ publicUrl, key, fileName, fileSize }) => setEditUnit(eu => ({ ...eu, video_url: publicUrl, storage_key: key, file_name: fileName, file_size: fileSize }))); }} /><div style={{ display: "flex", gap: 6 }}><input value={editUnit.video_url || ""} readOnly placeholder="上傳後自動填入" style={{ ...inp, flex: 1 }} /><Btn size="sm" variant="outline" onClick={() => editR2FileRef.current?.click()} disabled={uploading}>{uploading ? "上傳中…" : "選擇"}</Btn></div></>
                              : editUnit.video_kind === "upload"
                              ? <><input type="file" accept="video/*" ref={editFileRef} style={{ display: "none" }} onChange={e => handleUpload(e.target.files[0], url => setEditUnit({ ...editUnit, video_url: url }))} /><div style={{ display: "flex", gap: 6 }}><input value={editUnit.video_url || ""} readOnly placeholder="上傳後自動填入" style={{ ...inp, flex: 1 }} /><Btn size="sm" variant="outline" onClick={() => editFileRef.current?.click()} disabled={uploading}>{uploading ? "上傳中…" : "選擇"}</Btn></div></>
                              : <>
                                  <input
                                    value={editUnit.video_url || ""}
                                    onChange={e => setEditUnit({ ...editUnit, video_url: e.target.value })}
                                    placeholder={editUnit.video_kind === "drive" ? "https://drive.google.com/file/d/…/view" : editUnit.video_kind === "link" ? "貼上 YouTube、Google Drive 或 mp4 網址" : "https://..."}
                                    style={inp}
                                  />
                                  {editUnit.video_kind === "drive" && <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray400, marginTop: 2 }}>請確認 Drive 分享設定為「知道連結的人均可查看」</div>}
                                  {editUnit.video_kind === "link" && (() => { const d = detectUrl(editUnit.video_url); return d ? <div style={{ fontSize: "calc(11px * var(--fsc,1))", marginTop: 4, padding: "4px 8px", borderRadius: 6, background: d.bg, color: d.color }}>{d.label}</div> : null; })()}
                                </>}
                          </div>
                        </>}
                        {editUnit.type === "interactive_html" && <>
                          <div>
                            <label style={lbl}>HTML 來源</label>
                            <input value="從素材庫選擇" readOnly style={{ ...inp, color: C.gray400, background: C.gray100 }} />
                          </div>
                          <div>
                            <label style={lbl}>選擇 HTML</label>
                            <select value={editUnit.storage_key || ""} onChange={e => { const m = htmlLibrary.find(x => x.storage_key === e.target.value); setEditUnit({ ...editUnit, storage_key: m?.storage_key || "", video_url: m?.file_url || "", file_name: m?.file_name || "", file_size: m?.file_size || "", mime_type: m?.mime_type || "", source_type: "html_material", video_kind: "html" }); }} style={inp}>
                              <option value="">請選擇已上架的 HTML 素材</option>
                              {htmlLibrary.map(m => <option key={m.id} value={m.storage_key}>{m.title}</option>)}
                            </select>
                            {htmlLibrary.length === 0 && <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray400, marginTop: 2 }}>尚無已上架的 HTML 素材，請先至「素材管理」上傳並上架。</div>}
                          </div>
                        </>}
                        <div><label style={lbl}>排序</label><input type="number" value={editUnit.sort_order || ""} onChange={e => setEditUnit({ ...editUnit, sort_order: e.target.value })} style={inp} /></div>
                      </div>
                      {editUnit.type === "quiz" && <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: "calc(12px * var(--fsc,1))", color: "#92400E" }}>💡 測驗題目請至「測驗管理」設定，此處僅調整單元位置與標題。</div>}
                      {editUnit.type === "video" && editUnit.video_kind === "drive" && <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: "calc(12px * var(--fsc,1))", color: "#92400E" }}>⚠️ Google Drive 影片可播放，但不支援自動觀看進度追蹤。若需要進度追蹤，請改用 Cloudflare R2 上傳影片、YouTube 或 mp4 直連。</div>}
                      {editUnit.type === "interactive_html" && (
                        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 8, cursor: "pointer" }}>
                          <input type="checkbox" checked={editUnit.track_progress === true} onChange={e => setEditUnit({ ...editUnit, track_progress: e.target.checked })} style={{ marginTop: 3 }} />
                          <span style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray700 }}>
                            <b>計入課程進度</b>
                            <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray600, marginTop: 2 }}>若此 HTML 僅為自我評估、工具或補充內容，建議不要計入課程完成度。</div>
                          </span>
                        </label>
                      )}
                      <div style={{ marginBottom: 8 }}><label style={lbl}>說明</label><input value={editUnit.description || ""} onChange={e => setEditUnit({ ...editUnit, description: e.target.value })} placeholder="單元說明（選填）" style={inp} /></div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <Btn size="sm" onClick={saveUnit}>儲存</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => setEditUnit(null)}>取消</Btn>
                        <label style={{ display: "flex", gap: 4, alignItems: "center", fontSize: "calc(13px * var(--fsc,1))", cursor: "pointer" }}>
                          <input type="checkbox" checked={editUnit.published !== false} onChange={e => setEditUnit({ ...editUnit, published: e.target.checked })} />已發布
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: "calc(16px * var(--fsc,1))" }}>{u.type === "quiz" ? "📝" : u.type === "text" ? "📄" : u.type === "interactive_html" ? "🌐" : "🎬"}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: "calc(13px * var(--fsc,1))" }}>{u.title}</div>
                        <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray600, marginTop: 2 }}>{vidKindLabel(u.video_kind)}{u.duration ? ` · ${u.duration}` : ""}{u.sort_order != null ? ` · 排序 ${u.sort_order}` : ""}</div>
                        {u.type === "quiz" && quizCountMap[u.id] === 0 && (
                          <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.primary, fontWeight: 600, marginTop: 2 }}>⚠️ 尚未設定題目</div>
                        )}
                      </div>
                      {u.type === "interactive_html" && u.track_progress !== true && <Badge text="自我評估．不計入進度" color="gray" />}
                      <Badge text={u.published !== false ? "已發布" : "草稿"} color={u.published !== false ? "green" : "gray"} />
                      <div style={{ display: "flex", gap: 6 }}>
                        {u.type === "quiz" && (
                          <Btn size="sm" variant="outline" onClick={() => setInlineQuiz(inlineQuiz?.unitId === u.id ? null : { courseId: c.id, unitId: u.id, title: u.title })}>📋 題目</Btn>
                        )}
                        <Btn size="sm" variant="outline" onClick={() => { setEditUnit({ id: u.id, course_id: u.course_id, title: u.title, description: u.description || "", type: u.type || "video", video_kind: u.video_kind || "r2", video_url: u.video_url || "", duration: u.duration || "", sort_order: u.sort_order ?? 0, published: u.published !== false, source_type: u.source_type || "", original_url: u.original_url || "", storage_key: u.storage_key || "", file_name: u.file_name || "", file_size: u.file_size || "", track_progress: u.track_progress === true, _origVideoUrl: u.video_url || "", _origStorageKey: u.storage_key || "" }); setShowAddUnit(null); setInlineQuiz(null); }}>✏️</Btn>
                        <Btn size="sm" variant="ghost" onClick={() => deleteUnit(u.id)}>🗑</Btn>
                      </div>
                    </div>
                  )}
                  {/* 內嵌題目管理面板 */}
                  {inlineQuiz?.unitId === u.id && (
                    <InlineQuizPanel
                      courseId={inlineQuiz.courseId}
                      unitId={inlineQuiz.unitId}
                      title={inlineQuiz.title}
                      showToast={showToast}
                      isMobile={isMobile}
                      onClose={() => setInlineQuiz(null)}
                      onCountChange={(n) => setQuizCountMap(m => ({ ...m, [inlineQuiz.unitId]: n }))}
                    />
                  )}
                </div>
              ))}

              {showAddUnit === c.id ? (
                <div style={{ background: "#EBF4FF", borderRadius: 10, padding: 14, marginTop: 4 }}>
                  <div style={{ fontWeight: 600, fontSize: "calc(13px * var(--fsc,1))", marginBottom: 10 }}>新增單元</div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : (unitForm.type === "video" || unitForm.type === "interactive_html") ? "2fr 1fr 1fr 1fr 60px" : "2fr 1fr 60px", gap: 8, marginBottom: 8 }}>
                    <div><label style={lbl}>標題 *</label><input placeholder="單元名稱" value={unitForm.title} onChange={e => setUnitForm({ ...unitForm, title: e.target.value })} style={inp} /></div>
                    <div><label style={lbl}>類型</label><select value={unitForm.type} onChange={e => setUnitForm({ ...unitForm, type: e.target.value, video_kind: e.target.value === "interactive_html" ? "html" : "r2", video_url: "", storage_key: "", source_type: "" })} style={inp}><option value="video">影片</option><option value="interactive_html">互動網頁（HTML）</option><option value="quiz">測驗</option><option value="text">文字</option></select></div>
                    {unitForm.type === "video" && <>
                      <div>
                        <label style={lbl}>影片來源</label>
                        <select value={unitForm.video_kind} onChange={e => setUnitForm({ ...unitForm, video_kind: e.target.value, video_url: "" })} style={inp}>
                          <option value="r2">上傳影片</option>
                          <option value="library">從素材庫選擇</option>
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>{unitForm.video_kind === "upload" || unitForm.video_kind === "r2" ? "上傳檔案" : unitForm.video_kind === "library" ? "選擇影片" : "影片網址"}</label>
                        {unitForm.video_kind === "library"
                          ? <select value={unitForm.video_url} onChange={e => setUnitForm({ ...unitForm, video_url: e.target.value })} style={inp}><option value="">請選擇影片庫中的影片</option>{videoLibrary.map(v => <option key={v.id} value={v.file_url}>{v.title}</option>)}</select>
                          : unitForm.video_kind === "r2"
                          ? <><input type="file" accept="video/mp4,video/*" ref={r2FileRef} style={{ display: "none" }} onChange={e => { const f = e.target.files[0]; if (f) handleR2Upload(f, c.id, ({ publicUrl, key, fileName, fileSize }) => setUnitForm(fm => ({ ...fm, video_url: publicUrl, storage_key: key, file_name: fileName, file_size: fileSize }))); }} /><div style={{ display: "flex", gap: 6 }}><input value={unitForm.video_url} readOnly placeholder="上傳後自動填入" style={{ ...inp, flex: 1 }} /><Btn size="sm" variant="outline" onClick={() => r2FileRef.current?.click()} disabled={uploading}>{uploading ? "上傳中…" : "選擇"}</Btn></div></>
                          : unitForm.video_kind === "upload"
                          ? <><input type="file" accept="video/*" ref={fileRef} style={{ display: "none" }} onChange={e => handleUpload(e.target.files[0], url => setUnitForm(f => ({ ...f, video_url: url })))} /><div style={{ display: "flex", gap: 6 }}><input value={unitForm.video_url} readOnly placeholder="上傳後自動填入" style={{ ...inp, flex: 1 }} /><Btn size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "上傳中…" : "選擇"}</Btn></div></>
                          : <>
                              <input
                                placeholder={unitForm.video_kind === "drive" ? "https://drive.google.com/file/d/…/view" : unitForm.video_kind === "link" ? "貼上 YouTube、Google Drive 或 mp4 網址" : "https://..."}
                                value={unitForm.video_url}
                                onChange={e => setUnitForm({ ...unitForm, video_url: e.target.value })}
                                style={inp}
                              />
                              {unitForm.video_kind === "drive" && <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray400, marginTop: 2 }}>請確認 Drive 分享設定為「知道連結的人均可查看」</div>}
                              {unitForm.video_kind === "link" && (() => { const d = detectUrl(unitForm.video_url); return d ? <div style={{ fontSize: "calc(11px * var(--fsc,1))", marginTop: 4, padding: "4px 8px", borderRadius: 6, background: d.bg, color: d.color }}>{d.label}</div> : null; })()}
                            </>}
                      </div>
                    </>}
                    {unitForm.type === "interactive_html" && <>
                      <div>
                        <label style={lbl}>HTML 來源</label>
                        <input value="從素材庫選擇" readOnly style={{ ...inp, color: C.gray400, background: C.gray100 }} />
                      </div>
                      <div>
                        <label style={lbl}>選擇 HTML</label>
                        <select value={unitForm.storage_key || ""} onChange={e => { const m = htmlLibrary.find(x => x.storage_key === e.target.value); setUnitForm(f => ({ ...f, storage_key: m?.storage_key || "", video_url: m?.file_url || "", file_name: m?.file_name || "", file_size: m?.file_size || "", mime_type: m?.mime_type || "", source_type: "html_material", video_kind: "html" })); }} style={inp}>
                          <option value="">請選擇已上架的 HTML 素材</option>
                          {htmlLibrary.map(m => <option key={m.id} value={m.storage_key}>{m.title}</option>)}
                        </select>
                        {htmlLibrary.length === 0 && <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray400, marginTop: 2 }}>尚無已上架的 HTML 素材，請先至「素材管理」上傳並上架。</div>}
                      </div>
                    </>}
                    <div><label style={lbl}>排序</label><input type="number" placeholder="0" value={unitForm.sort_order} onChange={e => setUnitForm({ ...unitForm, sort_order: e.target.value })} style={inp} /></div>
                  </div>
                  {unitForm.type === "quiz" && <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: "calc(12px * var(--fsc,1))", color: "#92400E" }}>💡 建立測驗單元後，可直接在單元底下新增題目，也可至「測驗管理」設定。</div>}
                  {unitForm.type === "video" && unitForm.video_kind === "drive" && <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: "calc(12px * var(--fsc,1))", color: "#92400E" }}>⚠️ Google Drive 影片可播放，但不支援自動觀看進度追蹤。若需要進度追蹤，請改用 Cloudflare R2 上傳影片、YouTube 或 mp4 直連。</div>}
                  {unitForm.type === "interactive_html" && (
                    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#fff", borderRadius: 8, padding: "10px 12px", marginBottom: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={unitForm.track_progress === true} onChange={e => setUnitForm({ ...unitForm, track_progress: e.target.checked })} style={{ marginTop: 3 }} />
                      <span style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray700 }}>
                        <b>計入課程進度</b>
                        <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray600, marginTop: 2 }}>若此 HTML 僅為自我評估、工具或補充內容，建議不要計入課程完成度。</div>
                      </span>
                    </label>
                  )}
                  <div style={{ marginBottom: 8 }}><label style={lbl}>說明</label><input placeholder="單元說明（選填）" value={unitForm.description} onChange={e => setUnitForm({ ...unitForm, description: e.target.value })} style={inp} /></div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn size="sm" onClick={() => addUnit(c.id)} disabled={!unitForm.title || uploading || (unitForm.type === "interactive_html" && !unitForm.storage_key)}>新增單元</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => { setShowAddUnit(null); setUnitForm(blankUnit); }}>取消</Btn>
                  </div>
                </div>
              ) : (
                <Btn size="sm" variant="outline" style={{ marginTop: 6 }} onClick={() => { setShowAddUnit(c.id); setEditUnit(null); }}>＋ 新增單元</Btn>
              )}
            </div>
          )}
        </div>
      ))}

      {pendingUnitSave && (
        <ContentChangeConfirmModal
          isHtml={pendingUnitSave.payload.type === "interactive_html"}
          onReset={() => doSaveUnit(pendingUnitSave.id, pendingUnitSave.payload, true, true)}
          onKeep={() => doSaveUnit(pendingUnitSave.id, pendingUnitSave.payload, false, true)}
          onCancel={() => setPendingUnitSave(null)}
        />
      )}
    </div>
  );
}

// 內容來源真的改變時的確認提示：A. 保留進度 / B. 重置此單元進度 / C. 取消
// 適用影片單元（換影片）與互動網頁單元（換 HTML 素材）
function ContentChangeConfirmModal({ isHtml, onKeep, onReset, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ fontWeight: 800, fontSize: "calc(17px * var(--fsc,1))", marginBottom: 12 }}>⚠️ {isHtml ? "互動內容已變更" : "影片來源已變更"}</div>
        <div style={{ fontSize: "calc(14px * var(--fsc,1))", color: C.gray700, lineHeight: 1.7, marginBottom: 22 }}>
          {isHtml
            ? "您正在更換此互動單元的內容，是否重置此單元的學習進度？"
            : "您正在更換此單元的影片。若影片內容已更換，建議重置此單元的學員觀看進度，避免舊進度對應到新影片。是否重置此單元進度？"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn onClick={onReset} style={{ width: "100%", justifyContent: "center" }}>B. 重置此單元進度</Btn>
          <Btn variant="outline" onClick={onKeep} style={{ width: "100%", justifyContent: "center" }}>A. 保留進度</Btn>
          <Btn variant="ghost" onClick={onCancel} style={{ width: "100%", justifyContent: "center" }}>C. 取消</Btn>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 分類管理
// ═══════════════════════════════════════════════════════════════
function Groups({ showToast, isMobile }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const blank = { name: "", description: "", sort_order: "", status: "active" };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [ef, setEf] = useState({});

  const load = () => { setLoading(true); api.adminGroups().then(({ groups: gs }) => setGroups(gs || [])).catch(() => showToast("載入失敗", "error")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    try { await api.adminGroupCreate({ ...form, sort_order: Number(form.sort_order) || 0 }); setForm(blank); setShowAdd(false); load(); showToast("分類已建立"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const save = async (id) => {
    try { await api.adminGroupPatch({ id, ...ef, sort_order: Number(ef.sort_order) || 0 }); setEditId(null); load(); showToast("分類已更新"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const toggleStatus = async (g) => {
    const ns = g.status === "active" ? "inactive" : "active";
    try { await api.adminGroupPatch({ id: g.id, status: ns }); load(); showToast(ns === "active" ? "已啟用" : "已停用"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const del = async (g) => {
    if (g.user_count > 0) { showToast("此分類已有使用者，請先移轉或停用", "error"); return; }
    if (!confirm(`確定刪除分類「${g.name}」？`)) return;
    try { await api.adminGroupDelete(g.id); load(); showToast("分類已刪除", "error"); }
    catch (e) { showToast(e.message, "error"); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>載入中…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800 }}>分類管理</h2>
        <Btn onClick={() => setShowAdd(true)}>＋ 新增分類</Btn>
      </div>

      {showAdd && (
        <div style={{ background: C.primaryLight, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 80px 1fr", gap: 10, marginBottom: 8 }}>
            <div><label style={lbl}>分類名稱 *</label><input placeholder="例：北區衛生所" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>說明</label><input placeholder="選填" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>排序</label><input type="number" placeholder="0" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>狀態</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}><option value="active">啟用</option><option value="inactive">停用</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}><Btn onClick={add} disabled={!form.name}>建立</Btn><Btn variant="outline" onClick={() => setShowAdd(false)}>取消</Btn></div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflowX: "auto" }}>
        {groups.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>尚無分類</div> : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "calc(13px * var(--fsc,1))", minWidth: 700 }}>
            <thead><tr style={{ background: C.gray100 }}>{["分類名稱", "說明", "排序", "人數", "狀態", "建立時間", "操作"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>{groups.map(g => (
              <tr key={g.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                <td style={td}>{editId === g.id ? <input defaultValue={g.name} onChange={e => setEf({ ...ef, name: e.target.value })} style={{ ...inp, width: 140, marginBottom: 0 }} /> : <strong>{g.name}</strong>}</td>
                <td style={td}>{editId === g.id ? <input defaultValue={g.description || ""} onChange={e => setEf({ ...ef, description: e.target.value })} style={{ ...inp, width: 160, marginBottom: 0 }} /> : (g.description || "—")}</td>
                <td style={td}>{editId === g.id ? <input type="number" defaultValue={g.sort_order ?? 0} onChange={e => setEf({ ...ef, sort_order: e.target.value })} style={{ ...inp, width: 60, marginBottom: 0 }} /> : (g.sort_order ?? 0)}</td>
                <td style={td}>{g.user_count || 0}</td>
                <td style={td}><Badge text={g.status === "active" ? "啟用" : "停用"} color={g.status === "active" ? "green" : "gray"} /></td>
                <td style={{ ...td, fontSize: "calc(12px * var(--fsc,1))", color: C.gray600 }}>{g.created_at ? new Date(g.created_at).toLocaleDateString("zh-TW") : "—"}</td>
                <td style={td}>{editId === g.id
                  ? <div style={{ display: "flex", gap: 6 }}><Btn size="sm" onClick={() => save(g.id)}>儲存</Btn><Btn size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Btn></div>
                  : <div style={{ display: "flex", gap: 6 }}>
                      <Btn size="sm" variant="outline" onClick={() => { setEditId(g.id); setEf({}); }}>✏️ 編輯</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => toggleStatus(g)}>{g.status === "active" ? "⏸ 停用" : "▶ 啟用"}</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => del(g)} disabled={g.user_count > 0} style={g.user_count > 0 ? { opacity: 0.4 } : {}}>🗑</Btn>
                    </div>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      <p style={{ fontSize: "calc(12px * var(--fsc,1))", color: C.gray400, marginTop: 8 }}>有使用者的分類不可直接刪除，請先移轉使用者或停用分類。</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 課程管理內嵌測驗題目面板
// ═══════════════════════════════════════════════════════════════
function InlineQuizPanel({ courseId, unitId, title, showToast, isMobile, onClose, onCountChange }) {
  const OPTS = ["A", "B", "C", "D"];
  const blank = { question: "", options: ["", "", "", ""], answer: 0, explanation: "", sort_order: 0, published: true };
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [editQ, setEditQ] = useState(null);

  const loadQs = () => {
    setLoading(true);
    api.adminQuizQuestions(courseId, unitId)
      .then(({ questions: qs }) => { const list = qs || []; setQuestions(list); if (onCountChange) onCountChange(list.length); })
      .catch(() => showToast("載入題目失敗", "error"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadQs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const optChange = (setter, idx, val) =>
    setter(f => { const o = [...(f.options || ["", "", "", ""])]; o[idx] = val; return { ...f, options: o }; });

  const renderForm = (q, setter) => (
    <>
      <div style={{ marginBottom: 8 }}>
        <label style={lbl}>題目 *</label>
        <input value={q.question} onChange={e => setter(f => ({ ...f, question: e.target.value }))} placeholder="請輸入題目內容" style={inp} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 8 }}>
        {OPTS.map((o, i) => (
          <div key={i}>
            <label style={lbl}>選項 {o} *</label>
            <input value={q.options?.[i] || ""} onChange={e => optChange(setter, i, e.target.value)} placeholder={`選項 ${o}`} style={inp} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr 60px", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={lbl}>正確答案 *</label>
          <select value={q.answer ?? 0} onChange={e => setter(f => ({ ...f, answer: Number(e.target.value) }))} style={inp}>
            {OPTS.map((o, i) => <option key={i} value={i}>選項 {o}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>解析（選填）</label>
          <input value={q.explanation || ""} onChange={e => setter(f => ({ ...f, explanation: e.target.value }))} placeholder="解析會在使用者完成測驗後顯示，用來說明為什麼這個答案正確。" style={inp} />
        </div>
        <div>
          <label style={lbl}>排序</label>
          <input type="number" value={q.sort_order ?? 0} onChange={e => setter(f => ({ ...f, sort_order: e.target.value }))} style={inp} />
        </div>
      </div>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "calc(13px * var(--fsc,1))", cursor: "pointer", marginBottom: 10 }}>
        <input type="checkbox" checked={q.published !== false} onChange={e => setter(f => ({ ...f, published: e.target.checked }))} />
        已發布（前台可進行此題測驗）
      </label>
    </>
  );

  const add = async () => {
    if (!form.question.trim() || form.options.some(o => !o.trim())) { showToast("請填寫題目和所有選項（A/B/C/D）", "error"); return; }
    try {
      await api.adminQuizCreate({ ...form, course_id: courseId, unit_id: unitId, sort_order: Number(form.sort_order) || 0 });
      setForm(blank); setShowAdd(false); loadQs(); showToast("題目已新增");
    } catch (e) { showToast(e.message, "error"); }
  };
  const save = async () => {
    const { id, ...patch } = editQ;
    try {
      await api.adminQuizPatch({ id, ...patch, sort_order: Number(patch.sort_order) || 0 });
      setEditId(null); setEditQ(null); loadQs(); showToast("已更新");
    } catch (e) { showToast(e.message, "error"); }
  };
  const del = async (id) => {
    if (!confirm("確定刪除此題目？此動作無法復原。")) return;
    try { await api.adminQuizDelete(id); loadQs(); showToast("已刪除", "error"); }
    catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div style={{ background: "#EBF4FF", borderRadius: 10, padding: 14, marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: "calc(13px * var(--fsc,1))" }}>📝 {title} — 題目管理</div>
        <div style={{ display: "flex", gap: 6 }}>
          <Btn size="sm" onClick={() => { setShowAdd(true); setEditId(null); }}>＋ 新增題目</Btn>
          <Btn size="sm" variant="ghost" onClick={onClose}>✕</Btn>
        </div>
      </div>
      <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray600, marginBottom: 8 }}>⚠️ 正確答案僅後台可見，前台由後端計分，不對外洩漏。</div>

      {showAdd && (
        <div style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 10, fontSize: "calc(13px * var(--fsc,1))" }}>新增題目</div>
          {renderForm(form, setForm)}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn size="sm" onClick={add}>新增題目</Btn>
            <Btn size="sm" variant="ghost" onClick={() => { setShowAdd(false); setForm(blank); }}>取消</Btn>
          </div>
        </div>
      )}

      {loading
        ? <div style={{ padding: 16, textAlign: "center", color: C.gray400, fontSize: "calc(13px * var(--fsc,1))" }}>載入中…</div>
        : questions.length === 0 && !showAdd
          ? <div style={{ padding: 12, textAlign: "center", color: C.gray400, fontSize: "calc(13px * var(--fsc,1))" }}>尚無題目，點「＋ 新增題目」開始設定</div>
          : questions.map((q, qi) => (
            <div key={q.id} style={{ background: "#fff", borderRadius: 10, padding: 12, marginBottom: 8 }}>
              {editId === q.id ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 10, fontSize: "calc(13px * var(--fsc,1))" }}>編輯第 {qi + 1} 題</div>
                  {renderForm(editQ, setEditQ)}
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn size="sm" onClick={save}>儲存</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => { setEditId(null); setEditQ(null); }}>取消</Btn>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                    <div>
                      <span style={{ color: C.gray600, fontSize: "calc(11px * var(--fsc,1))" }}>第 {qi + 1} 題 · 排序 {q.sort_order ?? 0}</span>
                      <div style={{ fontWeight: 600, fontSize: "calc(13px * var(--fsc,1))", marginTop: 2 }}>{q.question}</div>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "center" }}>
                      <Badge text={q.published !== false ? "已發布" : "草稿"} color={q.published !== false ? "green" : "gray"} />
                      <Btn size="sm" variant="outline" onClick={() => { setEditId(q.id); setEditQ({ ...q, options: Array.isArray(q.options) ? [...q.options] : ["", "", "", ""] }); setShowAdd(false); }}>✏️</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => del(q.id)}>🗑</Btn>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 4 }}>
                    {(Array.isArray(q.options) ? q.options : []).map((o, i) => (
                      <div key={i} style={{ padding: "6px 10px", borderRadius: 6, fontSize: "calc(12px * var(--fsc,1))", background: i === q.answer ? "#D1FAE5" : C.gray100, border: `1.5px solid ${i === q.answer ? C.green : C.gray200}`, fontWeight: i === q.answer ? 700 : 400 }}>
                        {["A","B","C","D"][i]}. {o}
                        {i === q.answer && <span style={{ color: C.green, fontSize: "calc(10px * var(--fsc,1))", marginLeft: 3 }}>✓</span>}
                      </div>
                    ))}
                  </div>
                  {q.explanation && <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray700, background: "#FFFBEB", padding: "6px 10px", borderRadius: 6, borderLeft: `2px solid ${C.orange}`, marginTop: 6 }}>💡 {q.explanation}</div>}
                </div>
              )}
            </div>
          ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 測驗題目管理
// ═══════════════════════════════════════════════════════════════
function Quizzes({ showToast, isMobile, initCourseId, initUnitId, onMounted }) {
  const [courses, setCourses] = useState([]);
  const [courseId, setCourseId] = useState(initCourseId || "");
  const [unitId, setUnitId] = useState(""); // 篩選特定測驗單元的題目（必選）
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const OPTS = ["A", "B", "C", "D"];
  const blank = { question: "", options: ["", "", "", ""], answer: 0, explanation: "", sort_order: 0, published: true };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [editQ, setEditQ] = useState(null);

  // 目前課程中的測驗單元清單
  const quizUnits = (courses.find(c => c.id === courseId)?.units || []).filter(u => u.type === "quiz");

  useEffect(() => {
    api.adminAllCourses().then(({ courses: cs }) => {
      setCourses(cs || []);
      if (cs?.length > 0) {
        const targetCid = initCourseId || cs[0].id;
        setCourseId(prev => prev || targetCid);
        // 若從課程管理跳轉並帶入 unitId，在課程載入後設定（延後執行以讓 courseId 變更 effect 先清除）
        if (initUnitId) setTimeout(() => setUnitId(initUnitId), 0);
      }
      if (onMounted) onMounted();
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 切換課程時重置單元選擇
  useEffect(() => { setUnitId(""); }, [courseId]);

  const loadQs = (cid, uid) => {
    if (!cid) return;
    setLoading(true);
    api.adminQuizQuestions(cid, uid || "")
      .then(({ questions: qs }) => setQuestions(qs || []))
      .catch((e) => showToast(e.message || "載入題目失敗", "error"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadQs(courseId, unitId); }, [courseId, unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const optChange = (setter, idx, val) =>
    setter(f => { const o = [...(f.options || ["", "", "", ""])]; o[idx] = val; return { ...f, options: o }; });

  const renderForm = (q, setter) => (
    <>
      <div style={{ marginBottom: 8 }}>
        <label style={lbl}>題目 *</label>
        <input value={q.question} onChange={e => setter(f => ({ ...f, question: e.target.value }))} placeholder="請輸入題目內容" style={inp} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 8 }}>
        {OPTS.map((o, i) => (
          <div key={i}>
            <label style={lbl}>選項 {o} *</label>
            <input value={q.options?.[i] || ""} onChange={e => optChange(setter, i, e.target.value)} placeholder={`選項 ${o}`} style={inp} />
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 2fr 60px", gap: 8, marginBottom: 8 }}>
        <div>
          <label style={lbl}>正確答案 *</label>
          <select value={q.answer ?? 0} onChange={e => setter(f => ({ ...f, answer: Number(e.target.value) }))} style={inp}>
            {OPTS.map((o, i) => <option key={i} value={i}>選項 {o}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>解析（選填）</label>
          <input value={q.explanation || ""} onChange={e => setter(f => ({ ...f, explanation: e.target.value }))} placeholder="解析會在使用者完成測驗後顯示，用來說明為什麼這個答案正確。" style={inp} />
        </div>
        <div>
          <label style={lbl}>排序</label>
          <input type="number" value={q.sort_order ?? 0} onChange={e => setter(f => ({ ...f, sort_order: e.target.value }))} style={inp} />
        </div>
      </div>
      <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "calc(13px * var(--fsc,1))", cursor: "pointer", marginBottom: 10 }}>
        <input type="checkbox" checked={q.published !== false} onChange={e => setter(f => ({ ...f, published: e.target.checked }))} />
        已發布（前台可進行此題測驗）
      </label>
    </>
  );

  const add = async () => {
    if (!form.question.trim() || form.options.some(o => !o.trim())) { showToast("請填寫題目和所有選項（A/B/C/D）", "error"); return; }
    try {
      await api.adminQuizCreate({ ...form, course_id: courseId, unit_id: unitId || null, sort_order: Number(form.sort_order) || 0 });
      setForm(blank); setShowAdd(false); loadQs(courseId, unitId); showToast("題目已新增");
    } catch (e) { showToast(e.message, "error"); }
  };
  const save = async () => {
    const { id, ...patch } = editQ;
    try {
      await api.adminQuizPatch({ id, ...patch, sort_order: Number(patch.sort_order) || 0 });
      setEditId(null); setEditQ(null); loadQs(courseId, unitId); showToast("已更新");
    } catch (e) { showToast(e.message, "error"); }
  };
  const del = async (id) => {
    if (!confirm("確定刪除此題目？此動作無法復原。")) return;
    try { await api.adminQuizDelete(id); loadQs(courseId, unitId); showToast("已刪除", "error"); }
    catch (e) { showToast(e.message, "error"); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800 }}>測驗題目管理</h2>
        <Btn onClick={() => { setShowAdd(true); setEditId(null); }} disabled={!courseId || !unitId} title={!unitId ? "請先選擇測驗單元" : ""}>＋ 新增題目</Btn>
      </div>
      <p style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600, marginBottom: 16 }}>⚠️ 正確答案僅後台可見，前台測驗由後端計分，答案不對外洩漏。</p>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={lbl}>選擇課程</label>
          <select value={courseId} onChange={e => { setCourseId(e.target.value); setShowAdd(false); setEditId(null); }} style={{ ...inp, marginBottom: 0 }}>
            {courses.length === 0 && <option value="">（請先建立課程）</option>}
            {courses.map(c => <option key={c.id} value={c.id}>{c.emoji || "📚"} {c.title}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>測驗單元（必選，題目需綁定單元）</label>
          <select value={unitId} onChange={e => { setUnitId(e.target.value); setShowAdd(false); setEditId(null); }} style={{ ...inp, marginBottom: 0 }}>
            <option value="">— 請選擇測驗單元 —</option>
            {quizUnits.map(u => <option key={u.id} value={u.id}>📝 {u.title}</option>)}
          </select>
          {quizUnits.length === 0 && courseId && <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray400, marginTop: 3 }}>請先在「課程管理」中新增 quiz 類型單元</div>}
        </div>
      </div>

      {courseId && !unitId && (
        <div style={{ background: "#FEF3C7", borderRadius: 10, padding: "12px 16px", marginBottom: 14, fontSize: "calc(13px * var(--fsc,1))", color: "#92400E" }}>
          ⚠️ 請先選擇「測驗單元」後再新增題目。每道題目需綁定到特定測驗單元，才能在前台正確顯示。
        </div>
      )}

      {showAdd && (
        <div style={{ background: "#EBF4FF", borderRadius: 12, padding: 16, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>新增題目</div>
          {renderForm(form, setForm)}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn size="sm" onClick={add}>新增題目</Btn>
            <Btn size="sm" variant="ghost" onClick={() => { setShowAdd(false); setForm(blank); }}>取消</Btn>
          </div>
        </div>
      )}

      {loading
        ? <div style={{ padding: 32, textAlign: "center", color: C.gray400 }}>載入中…</div>
        : questions.length === 0
          ? <div style={{ background: "#fff", borderRadius: 14, padding: 40, textAlign: "center", color: C.gray400 }}>{unitId ? "此測驗單元尚無題目，點「新增題目」開始設定" : courseId ? "請先選擇上方的「測驗單元」" : "請先選擇課程"}</div>
          : questions.map((q, qi) => (
            <div key={q.id} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              {editId === q.id ? (
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 12 }}>編輯第 {qi + 1} 題</div>
                  {renderForm(editQ, setEditQ)}
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn size="sm" onClick={save}>儲存</Btn>
                    <Btn size="sm" variant="ghost" onClick={() => { setEditId(null); setEditQ(null); }}>取消</Btn>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: C.gray600, fontSize: "calc(12px * var(--fsc,1))" }}>第 {qi + 1} 題 · 排序 {q.sort_order ?? 0}</span>
                      <div style={{ fontWeight: 700, fontSize: "calc(15px * var(--fsc,1))", marginTop: 2 }}>{q.question}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                      <Badge text={q.published !== false ? "已發布" : "草稿"} color={q.published !== false ? "green" : "gray"} />
                      <Btn size="sm" variant="outline" onClick={() => { setEditId(q.id); setEditQ({ ...q, options: Array.isArray(q.options) ? [...q.options] : ["", "", "", ""] }); setShowAdd(false); }}>✏️</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => del(q.id)}>🗑</Btn>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr", gap: 6, marginBottom: q.explanation ? 8 : 0 }}>
                    {(Array.isArray(q.options) ? q.options : []).map((o, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderRadius: 8, fontSize: "calc(13px * var(--fsc,1))", background: i === q.answer ? "#D1FAE5" : C.gray100, border: `1.5px solid ${i === q.answer ? C.green : C.gray200}`, fontWeight: i === q.answer ? 700 : 400 }}>
                        <span style={{ color: C.gray600 }}>{OPTS[i]}.</span> {o}
                        {i === q.answer && <span style={{ color: C.green, marginLeft: 4, fontSize: "calc(11px * var(--fsc,1))" }}>✓ 正解</span>}
                      </div>
                    ))}
                  </div>
                  {q.explanation && <div style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray700, background: "#FFFBEB", padding: "8px 12px", borderRadius: 8, borderLeft: `3px solid ${C.orange}` }}>💡 {q.explanation}</div>}
                </div>
              )}
            </div>
          ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 帳號管理（整合使用者 + 管理員）
// ═══════════════════════════════════════════════════════════════
function Accounts({ showToast, isMobile, meId, meRole }) {
  const canManageAdmins = meRole === "admin" || meRole === "superadmin";
  const [tab, setTab] = useState("users");
  return (
    <div>
      {canManageAdmins && (
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${C.gray200}` }}>
          {[["users", "👥 一般使用者"], ["admins", "🔐 管理員帳號"]].map(([t, l]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "9px 20px", background: "transparent", border: "none", borderBottom: tab === t ? `2.5px solid ${C.primary}` : "2.5px solid transparent", color: tab === t ? C.primary : C.gray600, fontWeight: tab === t ? 700 : 500, cursor: "pointer", fontSize: "calc(14px * var(--fsc,1))", marginBottom: -1 }}>{l}</button>
          ))}
        </div>
      )}
      {(!canManageAdmins || tab === "users")
        ? <Users showToast={showToast} isMobile={isMobile} />
        : <AdminUsers showToast={showToast} isMobile={isMobile} meId={meId} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 管理員管理
// ═══════════════════════════════════════════════════════════════
function AdminUsers({ showToast, isMobile, meId }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const blank = { email: "", password: "", confirm: "", name: "", role: "admin", status: "active" };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState(null);
  const [ef, setEf] = useState({});

  const load = () => { setLoading(true); api.adminAdmins().then(({ admins: as }) => setAdmins(as || [])).catch(() => showToast("載入失敗", "error")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (form.password !== form.confirm) { showToast("兩次密碼不一致", "error"); return; }
    try { await api.adminAdminCreate({ email: form.email, password: form.password, name: form.name, role: form.role, status: form.status }); setForm(blank); setShowAdd(false); load(); showToast("管理員已建立"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const save = async (id) => {
    try { await api.adminAdminPatch({ id, ...ef }); setEditId(null); load(); showToast("已更新"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const toggleStatus = async (a) => {
    const ns = a.status === "active" ? "inactive" : "active";
    try { await api.adminAdminPatch({ id: a.id, status: ns }); load(); showToast(ns === "active" ? "已啟用" : "已停用"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const del = async (a) => {
    if (a.id === meId) { showToast("不可刪除自己", "error"); return; }
    if (!confirm(`確定刪除管理員「${a.email}」？`)) return;
    try { await api.adminAdminDelete(a.id); load(); showToast("管理員已刪除", "error"); }
    catch (e) { showToast(e.message, "error"); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>載入中…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800 }}>管理員管理</h2>
        <Btn onClick={() => setShowAdd(true)}>＋ 新增管理員</Btn>
      </div>
      <p style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600, marginBottom: 16 }}>密碼以 bcrypt 雜湊儲存，不可明文查看。不可刪除或停用自己，不可停用最後一個啟用的管理員。</p>

      {showAdd && (
        <div style={{ background: C.primaryLight, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>新增管理員</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div><label style={lbl}>Email *</label><input type="email" placeholder="admin@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>密碼 *（至少 8 碼）</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>確認密碼 *</label><input type="password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>名稱</label><input placeholder="管理員" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>角色</label><select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inp}><option value="admin">admin</option><option value="superadmin">superadmin</option></select></div>
            <div><label style={lbl}>狀態</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}><option value="active">啟用</option><option value="inactive">停用</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}><Btn onClick={add} disabled={!form.email || form.password.length < 8 || !form.confirm}>建立</Btn><Btn variant="outline" onClick={() => setShowAdd(false)}>取消</Btn></div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "calc(13px * var(--fsc,1))", minWidth: 780 }}>
          <thead><tr style={{ background: C.gray100 }}>{["Email", "名稱", "角色", "狀態", "最後登入", "建立時間", "操作"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{admins.map(a => (
            <tr key={a.id} style={{ borderBottom: `1px solid ${C.gray100}`, background: a.id === meId ? "#FFFBEB" : "transparent" }}>
              <td style={td}>{editId === a.id ? <input defaultValue={a.email} onChange={e => setEf({ ...ef, email: e.target.value })} style={{ ...inp, width: 180, marginBottom: 0 }} /> : a.email}{a.id === meId && <span style={{ marginLeft: 6, fontSize: "calc(11px * var(--fsc,1))", color: C.orange }}>(我)</span>}</td>
              <td style={td}>{editId === a.id ? <input defaultValue={a.name || ""} onChange={e => setEf({ ...ef, name: e.target.value })} style={{ ...inp, width: 100, marginBottom: 0 }} /> : (a.name || "—")}</td>
              <td style={td}>{editId === a.id ? <select defaultValue={a.role || "admin"} onChange={e => setEf({ ...ef, role: e.target.value })} style={{ ...inp, width: 110, marginBottom: 0 }}><option value="admin">admin</option><option value="superadmin">superadmin</option></select> : <Badge text={a.role || "admin"} color="blue" />}</td>
              <td style={td}>{editId === a.id
                ? <select defaultValue={a.status || "active"} onChange={e => setEf({ ...ef, status: e.target.value })} style={{ ...inp, width: 90, marginBottom: 0 }}><option value="active">啟用</option><option value="inactive">停用</option></select>
                : <Badge text={a.status === "active" ? "啟用" : "停用"} color={a.status === "active" ? "green" : "gray"} />}
              </td>
              <td style={{ ...td, fontSize: "calc(12px * var(--fsc,1))", color: C.gray600 }}>{a.last_login_at ? new Date(a.last_login_at).toLocaleString("zh-TW", { hour12: false }) : "—"}</td>
              <td style={{ ...td, fontSize: "calc(12px * var(--fsc,1))", color: C.gray600 }}>{a.created_at ? new Date(a.created_at).toLocaleDateString("zh-TW") : "—"}</td>
              <td style={td}>{editId === a.id ? (
                <div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 4 }}><Btn size="sm" onClick={() => save(a.id)}>儲存</Btn><Btn size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Btn></div>
                  <input placeholder="新密碼（留空不更改）" type="password" onChange={e => setEf({ ...ef, password: e.target.value })} style={{ ...inp, width: 180, fontSize: "calc(12px * var(--fsc,1))", marginBottom: 0 }} />
                </div>
              ) : (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Btn size="sm" variant="outline" onClick={() => { setEditId(a.id); setEf({}); }}>✏️ 編輯</Btn>
                  {a.id !== meId && <Btn size="sm" variant="ghost" onClick={() => toggleStatus(a)}>{a.status === "active" ? "⏸ 停用" : "▶ 啟用"}</Btn>}
                  {a.id !== meId && <Btn size="sm" variant="ghost" onClick={() => del(a)}>🗑</Btn>}
                </div>
              )}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ── 標籤輸入元件 ──────────────────────────────────────────────────────────────
function TagInput({ value = [], onChange, allTags = [] }) {
  const [inputVal, setInputVal] = useState("");
  const addTag = (t) => { const tag = t.trim(); if (tag && !value.includes(tag)) onChange([...value, tag]); setInputVal(""); };
  const removeTag = (t) => onChange(value.filter(x => x !== t));
  const onKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); if (inputVal.trim()) addTag(inputVal); }
    else if (e.key === "Backspace" && !inputVal && value.length > 0) removeTag(value[value.length - 1]);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, border: `1px solid ${C.gray200}`, borderRadius: 8, padding: "5px 7px", background: "#fff", minHeight: 36 }}>
      {value.map(t => (
        <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#DBEAFE", color: "#1E40AF", borderRadius: 999, padding: "2px 9px", fontSize: "calc(12px * var(--fsc,1))", fontWeight: 600 }}>
          {t}<button type="button" onClick={() => removeTag(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: "#1E40AF", fontWeight: 700 }}>×</button>
        </span>
      ))}
      <input list="tag-datalist" value={inputVal} onChange={e => setInputVal(e.target.value)}
        onKeyDown={onKey} onBlur={() => { if (inputVal.trim()) addTag(inputVal); }}
        placeholder={value.length === 0 ? "輸入標籤後按 Enter" : ""}
        style={{ border: "none", outline: "none", fontSize: "calc(13px * var(--fsc,1))", minWidth: 120, flex: 1, padding: 0 }} />
      <datalist id="tag-datalist">{allTags.filter(t => !value.includes(t)).map(t => <option key={t} value={t} />)}</datalist>
    </div>
  );
}

// 使用者管理
// ═══════════════════════════════════════════════════════════════
function Users({ showToast, isMobile }) {
  const [users, setUsers] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [q, setQ] = useState(""); const [filterTag, setFilterTag] = useState("");
  const [editId, setEditId] = useState(null); const [ef, setEf] = useState({});
  const [showAdd, setShowAdd] = useState(false); const [form, setForm] = useState({ name: "", phone: "", status: "active", tags: [] });
  const [showImport, setShowImport] = useState(false); const [importResult, setImportResult] = useState(null);

  const loadTags = () => api.adminTags().then(({ tags: ts }) => setAllTags(ts || [])).catch(() => {});
  const load = (query = q, tag = filterTag) => api.adminUsers(query, "", tag).then(({ users: us }) => setUsers(us || [])).catch(() => {});
  useEffect(() => { load(); loadTags(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const doSearch = () => load(q, filterTag);
  const add = async () => {
    try { await api.adminUserCreate(form); setForm({ name: "", phone: "", status: "active", tags: [] }); setShowAdd(false); load(); loadTags(); showToast("已建立使用者，登入序號＝手機號"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const save = async (id) => { try { await api.adminUserPatch({ id, ...ef }); setEditId(null); load(); loadTags(); showToast("已更新"); } catch (e) { showToast(e.message, "error"); } };
  const toggleStatus = async (u) => { try { await api.adminUserPatch({ id: u.id, status: u.status === "active" ? "inactive" : "active" }); load(); showToast(u.status === "active" ? "已停用" : "已啟用"); } catch (e) { showToast(e.message, "error"); } };
  const reset = async (u) => { if (!confirm(`將 ${u.name} 的登入序號重設為手機號 ${u.phone}？`)) return; try { await api.adminUserPatch({ id: u.id, resetCode: true }); load(); showToast("序號已重設為手機號"); } catch (e) { showToast(e.message, "error"); } };
  const del = async (id) => { if (!confirm("確定刪除此使用者？此動作無法復原。")) return; await api.adminUserDelete(id); load(); loadTags(); showToast("已刪除", "error"); };
  const copy = (c) => { navigator.clipboard?.writeText(c); showToast(`已複製序號 ${c}`); };
  const exportCsv = () => { window.open(api.exportUrl("users"), "_blank"); };

  const onCsvFile = (file) => {
    if (!file) return;
    import("papaparse").then(({ default: Papa }) => {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: async (res) => {
          try { const r = await api.adminImport(res.data); setImportResult(r); load(); showToast(`匯入完成：成功 ${r.inserted}、略過 ${r.skipped}、錯誤 ${r.errorCount}`); }
          catch (e) { showToast(e.message, "error"); }
        },
      });
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800 }}>使用者管理</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="outline" onClick={() => setShowImport(!showImport)}>📥 批次匯入</Btn>
          <Btn variant="outline" onClick={exportCsv}>📤 匯出 CSV</Btn>
          <Btn onClick={() => setShowAdd(true)}>＋ 新增使用者</Btn>
        </div>
      </div>
      <p style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600, marginBottom: 14 }}>民眾不可自行註冊，須由此開通帳號。登入序號預設＝手機號，可修改或重設。</p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input placeholder="搜尋姓名 / 手機 / 登入序號" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && doSearch()} style={{ ...inp, maxWidth: 240, marginBottom: 0 }} />
        <select value={filterTag} onChange={e => { setFilterTag(e.target.value); load(q, e.target.value); }} style={{ ...inp, maxWidth: 140, marginBottom: 0 }}>
          <option value="">所有標籤</option>
          {allTags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <Btn onClick={doSearch}>搜尋</Btn>
        {(q || filterTag) && <Btn variant="ghost" onClick={() => { setQ(""); setFilterTag(""); load("", ""); }}>清除</Btn>}
      </div>

      {showImport && (
        <div style={{ background: "#EBF4FF", borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>批次匯入使用者（CSV / Excel 另存為 CSV）</div>
          <div style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray700, marginBottom: 10, lineHeight: 1.7 }}>
            欄位標題：<b>name, phone, group, status</b>（中文：姓名, 手機, 分組, 狀態）。<br />
            手機號自動成為登入序號；重複者略過；status 可填 active / inactive。<br />
            <span style={{ color: C.orange }}>⚠️ 分組名稱須已存在於分類管理中，不存在時該使用者分組設為未分組。</span>
          </div>
          <input type="file" accept=".csv,text/csv" onChange={e => onCsvFile(e.target.files[0])} />
          {importResult && <div style={{ marginTop: 10, fontSize: "calc(13px * var(--fsc,1))", color: C.gray700 }}>✅ 成功 {importResult.inserted}、略過 {importResult.skipped}、錯誤 {importResult.errorCount}{importResult.errors?.length ? <ul style={{ margin: "6px 0 0 18px", color: C.primary }}>{importResult.errors.map((e, i) => <li key={i}>{e}</li>)}</ul> : null}</div>}
        </div>
      )}

      {showAdd && (
        <div style={{ background: C.primaryLight, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div><label style={lbl}>姓名</label><input placeholder="王小明" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>手機號碼（＝登入序號）</label><input placeholder="0912345678" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })} style={{ ...inp, fontFamily: "monospace" }} /></div>
            <div><label style={lbl}>啟用狀態</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}><option value="active">啟用</option><option value="inactive">停用</option></select></div>
          </div>
          <div style={{ marginBottom: 8 }}><label style={lbl}>標籤（選填）</label><TagInput value={form.tags} onChange={tags => setForm({ ...form, tags })} allTags={allTags} /></div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}><Btn onClick={add} disabled={!form.name || form.phone.length !== 10}>建立</Btn><Btn variant="outline" onClick={() => setShowAdd(false)}>取消</Btn></div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "calc(13px * var(--fsc,1))", minWidth: 820 }}>
          <thead><tr style={{ background: C.gray100 }}>{["姓名", "登入序號", "標籤", "狀態", "最後登入", "操作"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>{users.length === 0 ? <tr><td colSpan={6} style={{ ...td, textAlign: "center", color: C.gray400, padding: 30 }}>查無使用者</td></tr> : users.map(u => <tr key={u.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
            <td style={td}>{editId === u.id ? <input defaultValue={u.name} onChange={e => setEf({ ...ef, name: e.target.value })} style={{ ...inp, width: 100, marginBottom: 0 }} /> : <>👤 {u.name}</>}</td>
            <td style={td}>{editId === u.id ? <input defaultValue={u.login_code} onChange={e => setEf({ ...ef, loginCode: e.target.value.replace(/\D/g, "").slice(0, 10) })} style={{ ...inp, width: 130, fontFamily: "monospace", marginBottom: 0 }} /> : <span onClick={() => copy(u.login_code)} title="點擊複製" style={{ fontFamily: "monospace", fontWeight: 700, color: C.primary, background: C.primaryLight, padding: "3px 10px", borderRadius: 6, cursor: "pointer" }}>{u.login_code} 📋</span>}</td>
            <td style={{ ...td, minWidth: 160 }}>{editId === u.id
              ? <TagInput value={ef.tags !== undefined ? ef.tags : (u.tags || [])} onChange={tags => setEf({ ...ef, tags })} allTags={allTags} />
              : (u.tags && u.tags.length > 0
                  ? <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{u.tags.map(t => <span key={t} style={{ background: "#DBEAFE", color: "#1E40AF", borderRadius: 999, padding: "2px 8px", fontSize: "calc(11px * var(--fsc,1))", fontWeight: 600 }}>{t}</span>)}</div>
                  : <span style={{ color: C.gray400 }}>—</span>)}</td>
            <td style={td}><Badge text={u.status === "active" ? "啟用" : "停用"} color={u.status === "active" ? "green" : "gray"} /></td>
            <td style={{ ...td, fontSize: "calc(12px * var(--fsc,1))", color: C.gray600 }}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString("zh-TW", { hour12: false }) : "—"}</td>
            <td style={td}>{editId === u.id
              ? <div style={{ display: "flex", gap: 6 }}><Btn size="sm" onClick={() => save(u.id)}>儲存</Btn><Btn size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Btn></div>
              : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Btn size="sm" variant="outline" onClick={() => { setEditId(u.id); setEf({}); }}>✏️ 編輯</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => toggleStatus(u)}>{u.status === "active" ? "⏸ 停用" : "▶ 啟用"}</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => reset(u)}>🔄 重設序號</Btn>
                  <Btn size="sm" variant="ghost" onClick={() => del(u.id)}>🗑</Btn>
                </div>}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 儀表板
// ═══════════════════════════════════════════════════════════════
function Dash() {
  const [d, setD] = useState(null);
  useEffect(() => { api.adminOverview().then(setD).catch(() => {}); }, []);
  if (!d) return <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>載入中…</div>;
  const cards = [
    ["👥", d.stats.totalUsers,         "啟用使用者數",   "#EEF2FF", "#6366F1"],
    ["🔥", d.stats.activeRecent,       "近 7 日活躍",    "#FEF3C7", C.orange],
    ["🎬", d.stats.totalCourses ?? "—","課程數",         "#FFF0EF", C.primary],
    ["📹", d.stats.totalUnits   ?? "—","單元數",         "#DBEAFE", C.accent],
    ["📝", d.stats.totalQuizzes ?? "—","測驗題目數",     "#EDE9FE", "#7C3AED"],
    ["📊", `${d.stats.completionRate}%`,"平均完成率",    "#D1FAE5", C.green],
  ];
  return (
    <div>
      <h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800, marginBottom: 20 }}>儀表板</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 14, marginBottom: 24 }}>
        {cards.map(([ic, v, l, bg, col], i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "20px 18px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "calc(20px * var(--fsc,1))", marginBottom: 12 }}>{ic}</div>
            <div style={{ fontSize: "calc(30px * var(--fsc,1))", fontWeight: 900, color: col, lineHeight: 1 }}>{v}</div>
            <div style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600, marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressView() {
  const [d, setD] = useState(null);
  useEffect(() => { api.adminOverview().then(setD).catch(() => {}); }, []);
  if (!d) return <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>載入中…</div>;
  const exportCsv = () => window.open(api.exportUrl("progress"), "_blank");
  return <div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
      <h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800 }}>學習進度總覽</h2>
      <Btn variant="outline" onClick={exportCsv}>📤 匯出 CSV</Btn>
    </div>
    {d.progressRows.length === 0 ? <div style={{ background: "#fff", borderRadius: 14, padding: 50, textAlign: "center", color: C.gray400 }}>尚無學習記錄</div> :
      <Card><Table head={["使用者", "課程", "完成度", "測驗分數", "是否通過", "作答時間"]} rows={d.progressRows.map(r => [
        r.user, r.course,
        <div key="p" style={{ display: "flex", gap: 8, alignItems: "center" }}><div style={{ width: 90 }}><Bar pct={r.pct} color={r.pct === 100 ? C.green : C.accent} /></div><span style={{ fontSize: "calc(12px * var(--fsc,1))" }}>{r.pct}%</span></div>,
        r.quizScore != null ? `${r.quizScore} 分` : "—",
        r.quizScore != null ? <Badge key="b" text={r.passed ? "通過" : "未通過"} color={r.passed ? "green" : "gray"} /> : "—",
        r.attemptedAt || "—",
      ])} /></Card>}
  </div>;
}

function Logs() {
  const [d, setD] = useState(null);
  useEffect(() => { api.adminOverview().then(setD).catch(() => {}); }, []);
  if (!d) return <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>載入中…</div>;
  return <div><h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800, marginBottom: 20 }}>活動紀錄</h2><Card><Table head={["時間", "身分", "對象", "動作", "說明", "IP"]} rows={d.logs.map(l => [l.time, l.actorType === "admin" ? "管理員" : l.actorType === "user" ? "民眾" : "系統", l.actorName, l.action, l.target, l.ip])} /></Card></div>;
}

const Card = ({ title, children }) => <div style={{ background: "#fff", borderRadius: 14, padding: 18, marginBottom: 16, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>{title && <h3 style={{ fontWeight: 700, fontSize: "calc(15px * var(--fsc,1))", marginBottom: 12 }}>{title}</h3>}<div style={{ overflowX: "auto" }}>{children}</div></div>;
const Table = ({ head, rows }) => <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "calc(13px * var(--fsc,1))", minWidth: 480 }}><thead><tr style={{ background: C.gray100 }}>{head.map(h => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} style={{ borderBottom: `1px solid ${C.gray100}` }}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>)}</tbody></table>;
const th = { padding: "10px 13px", textAlign: "left", fontWeight: 600, color: C.gray600, whiteSpace: "nowrap" };
const td = { padding: "11px 13px", color: C.gray700 };
const lbl = { display: "block", fontSize: "calc(12px * var(--fsc,1))", fontWeight: 600, color: C.gray700, marginBottom: 4 };

// ═══════════════════════════════════════════════════════════════
// Banner 管理
// ═══════════════════════════════════════════════════════════════
function Banners({ showToast, isMobile }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [ef, setEf] = useState({});
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const blank = { title: "", subtitle: "", link_url: "", button_text: "了解更多", sort_order: 0, status: "draft" };
  const [form, setForm] = useState(blank);
  const [pendingFile, setPendingFile] = useState(null);

  const load = () => { setLoading(true); api.adminBanners().then(({ banners: bs }) => setBanners(bs || [])).catch(() => showToast("載入失敗", "error")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBannerFile = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showToast("圖片超過 10MB 限制", "error"); return; }
    setPendingFile(file);
  };

  const add = async () => {
    if (!form.title && !pendingFile) { showToast("請填寫標題或選擇圖片", "error"); return; }
    setUploading(true);
    try {
      let imgData = {};
      if (pendingFile) {
        const { uploadUrl, publicUrl, filePath, storageKey, storageProvider } = await api.adminBannerUploadUrl(pendingFile.name);
        const bResp = await fetch(uploadUrl, { method: "PUT", body: pendingFile, headers: { "Content-Type": pendingFile.type } });
        if (!bResp.ok) throw new Error(`圖片上傳失敗（HTTP ${bResp.status}）。請確認 R2 CORS 設定已允許目前網域。`);
        imgData = { image_url: publicUrl, image_path: filePath, storage_key: storageKey, storage_provider: storageProvider };
      }
      await api.adminBannerCreate({ ...form, ...imgData, sort_order: Number(form.sort_order) || 0 });
      setForm(blank); setPendingFile(null); setShowAdd(false); load(); showToast("Banner 已建立");
    } catch (e) { showToast(e.message, "error"); } finally { setUploading(false); }
  };

  const save = async (id) => {
    try { await api.adminBannerPatch({ id, ...ef }); setEditId(null); load(); showToast("已更新"); }
    catch (e) { showToast(e.message, "error"); }
  };

  const setStatus = async (b, s) => {
    const msg = { published: "已上架", draft: "已下架", archived: "已封存" }[s] || "已更新";
    try { await api.adminBannerPatch({ id: b.id, status: s }); load(); showToast(msg); }
    catch (e) { showToast(e.message, "error"); }
  };

  const del = async (b) => {
    if (!confirm(`確定刪除 Banner「${b.title || b.id}」？`)) return;
    try { await api.adminBannerDelete(b.id); load(); showToast("已刪除", "error"); }
    catch (e) { showToast(e.message, "error"); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>載入中…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800 }}>首頁 Banner 管理</h2>
        <Btn onClick={() => { setShowAdd(true); setEditId(null); }}>＋ 新增 Banner</Btn>
      </div>
      <p style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600, marginBottom: 14 }}>
        圖片儲存於 Cloudflare R2（需設定 .env.local 的 R2 環境變數）。狀態為「已上架」的第一筆 Banner（依排序）會顯示在首頁；若無上架 Banner 則顯示預設 Hero 文案。
      </p>

      {showAdd && (
        <div style={{ background: C.primaryLight, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>新增 Banner</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 10, marginBottom: 8 }}>
            <div><label style={lbl}>標題</label><input placeholder="Banner 主標題" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>按鈕文字</label><input placeholder="了解更多" value={form.button_text} onChange={e => setForm({ ...form, button_text: e.target.value })} style={inp} /></div>
          </div>
          <div style={{ marginBottom: 8 }}><label style={lbl}>副標題</label><input placeholder="副標題（選填）" value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} style={inp} /></div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 60px 1fr", gap: 10, marginBottom: 8 }}>
            <div><label style={lbl}>連結網址（選填）</label><input placeholder="https://..." value={form.link_url} onChange={e => setForm({ ...form, link_url: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>排序</label><input type="number" placeholder="0" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>初始狀態</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}><option value="draft">草稿</option><option value="published">直接上架</option></select></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={lbl}>Banner 圖片（選填，建議 1200×400px，≤10MB）</label>
            <input type="file" ref={fileRef} style={{ display: "none" }} accept="image/*" onChange={e => handleBannerFile(e.target.files[0])} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Btn size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>選擇圖片</Btn>
              {pendingFile && <span style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray700 }}>📎 {pendingFile.name}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={add} disabled={uploading}>{uploading ? "上傳中…" : "建立"}</Btn>
            <Btn variant="outline" onClick={() => { setShowAdd(false); setForm(blank); setPendingFile(null); }}>取消</Btn>
          </div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflowX: "auto" }}>
        {banners.length === 0
          ? <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>尚無 Banner，請點「新增 Banner」</div>
          : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "calc(13px * var(--fsc,1))", minWidth: 700 }}>
              <thead><tr style={{ background: C.gray100 }}>
                {["預覽", "標題 / 副標題", "連結", "排序", "狀態", "操作"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>{banners.map(b => (
                <tr key={b.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                  <td style={td}>{b.image_url ? <img src={b.image_url} alt={b.title} style={{ width: 80, height: 44, objectFit: "cover", borderRadius: 6 }} /> : <span style={{ color: C.gray400 }}>—</span>}</td>
                  <td style={td}>
                    {editId === b.id
                      ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <input defaultValue={b.title} onChange={e => setEf({ ...ef, title: e.target.value })} placeholder="標題" style={{ ...inp, marginBottom: 0 }} />
                          <input defaultValue={b.subtitle || ""} onChange={e => setEf({ ...ef, subtitle: e.target.value })} placeholder="副標題" style={{ ...inp, marginBottom: 0 }} />
                          <input defaultValue={b.button_text || "了解更多"} onChange={e => setEf({ ...ef, button_text: e.target.value })} placeholder="按鈕文字" style={{ ...inp, marginBottom: 0 }} />
                        </div>
                      : <><div style={{ fontWeight: 600 }}>{b.title || "（無標題）"}</div>{b.subtitle && <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray400 }}>{b.subtitle}</div>}</>}
                  </td>
                  <td style={{ ...td, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {editId === b.id
                      ? <input defaultValue={b.link_url || ""} onChange={e => setEf({ ...ef, link_url: e.target.value })} placeholder="https://..." style={{ ...inp, width: 140, marginBottom: 0 }} />
                      : b.link_url ? <a href={b.link_url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: "calc(12px * var(--fsc,1))" }}>🔗</a> : "—"}
                  </td>
                  <td style={td}>
                    {editId === b.id
                      ? <input type="number" defaultValue={b.sort_order ?? 0} onChange={e => setEf({ ...ef, sort_order: Number(e.target.value) })} style={{ ...inp, width: 60, marginBottom: 0 }} />
                      : (b.sort_order ?? 0)}
                  </td>
                  <td style={td}><Badge text={b.status === "published" ? "已上架" : b.status === "archived" ? "已封存" : "草稿"} color={b.status === "published" ? "green" : b.status === "archived" ? "gray" : "orange"} /></td>
                  <td style={td}>{editId === b.id
                    ? <div style={{ display: "flex", gap: 6 }}><Btn size="sm" onClick={() => save(b.id)}>儲存</Btn><Btn size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Btn></div>
                    : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Btn size="sm" variant="outline" onClick={() => { setEditId(b.id); setEf({}); }}>✏️</Btn>
                        {b.status !== "published" && <Btn size="sm" variant="ghost" onClick={() => setStatus(b, "published")}>▶ 上架</Btn>}
                        {b.status === "published" && <Btn size="sm" variant="ghost" onClick={() => setStatus(b, "draft")}>⏸ 下架</Btn>}
                        {b.status !== "archived" && <Btn size="sm" variant="ghost" onClick={() => setStatus(b, "archived")} title="封存">📦</Btn>}
                        <Btn size="sm" variant="ghost" onClick={() => del(b)}>🗑</Btn>
                      </div>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 首頁卡片管理
// ═══════════════════════════════════════════════════════════════
function FeatureCards({ showToast, isMobile }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [ef, setEf] = useState({});
  const blank = { icon: "✨", title: "", description: "", bg_color: "#FDECEA", sort_order: 0, status: "draft" };
  const [form, setForm] = useState(blank);

  const load = () => { setLoading(true); api.adminFeatureCards().then(({ cards: cs }) => setCards(cs || [])).catch(() => showToast("載入失敗", "error")).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!form.title) { showToast("請填寫標題", "error"); return; }
    try { await api.adminFeatureCardCreate({ ...form, sort_order: Number(form.sort_order) || 0 }); setForm(blank); setShowAdd(false); load(); showToast("卡片已建立"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const save = async (id) => {
    try { await api.adminFeatureCardPatch({ id, ...ef }); setEditId(null); load(); showToast("已更新"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const setCardStatus = async (c, s) => {
    try { await api.adminFeatureCardPatch({ id: c.id, status: s }); load(); showToast({ published: "已上架", draft: "已下架", archived: "已封存" }[s] || "已更新"); }
    catch (e) { showToast(e.message, "error"); }
  };
  const del = async (c) => {
    if (!confirm(`確定刪除卡片「${c.title}」？`)) return;
    try { await api.adminFeatureCardDelete(c.id); load(); showToast("已刪除", "error"); }
    catch (e) { showToast(e.message, "error"); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>載入中…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800 }}>首頁卡片管理</h2>
        <Btn onClick={() => { setShowAdd(true); setEditId(null); }}>＋ 新增卡片</Btn>
      </div>
      <p style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600, marginBottom: 14 }}>
        前台最多顯示 6 張已上架卡片，依排序顯示。未設定時顯示預設三格內容。
      </p>

      {showAdd && (
        <div style={{ background: C.primaryLight, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>新增卡片</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "60px 1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div><label style={lbl}>圖示</label><input placeholder="🍽️" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>標題 *</label><input placeholder="卡片標題" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>背景色</label><input placeholder="#FDECEA" value={form.bg_color} onChange={e => setForm({ ...form, bg_color: e.target.value })} style={inp} /></div>
          </div>
          <div style={{ marginBottom: 8 }}><label style={lbl}>說明</label><input placeholder="卡片說明文字" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inp} /></div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "80px 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={lbl}>排序</label><input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>初始狀態</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}><option value="draft">草稿</option><option value="published">直接上架</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}><Btn onClick={add} disabled={!form.title}>建立</Btn><Btn variant="outline" onClick={() => { setShowAdd(false); setForm(blank); }}>取消</Btn></div>
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflowX: "auto" }}>
        {cards.length === 0
          ? <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>尚無自訂卡片（顯示內建預設）</div>
          : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "calc(13px * var(--fsc,1))", minWidth: 580 }}>
              <thead><tr style={{ background: C.gray100 }}>
                {["圖示", "標題 / 說明", "背景色", "排序", "狀態", "操作"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>{cards.map(c => (
                <tr key={c.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                  <td style={td}><div style={{ width: 44, height: 44, borderRadius: 10, background: c.bg_color || "#FDECEA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "calc(22px * var(--fsc,1))" }}>{c.icon}</div></td>
                  <td style={td}>
                    {editId === c.id
                      ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <input defaultValue={c.title} onChange={e => setEf({ ...ef, title: e.target.value })} placeholder="標題" style={{ ...inp, marginBottom: 0 }} />
                          <input defaultValue={c.description || ""} onChange={e => setEf({ ...ef, description: e.target.value })} placeholder="說明" style={{ ...inp, marginBottom: 0 }} />
                          <input defaultValue={c.icon || ""} onChange={e => setEf({ ...ef, icon: e.target.value })} placeholder="圖示" style={{ ...inp, marginBottom: 0, width: 80 }} />
                        </div>
                      : <><div style={{ fontWeight: 600 }}>{c.title}</div>{c.description && <div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray400 }}>{c.description.slice(0, 40)}{c.description.length > 40 ? "…" : ""}</div>}</>}
                  </td>
                  <td style={td}>
                    {editId === c.id
                      ? <input defaultValue={c.bg_color || "#FDECEA"} onChange={e => setEf({ ...ef, bg_color: e.target.value })} style={{ ...inp, width: 100, marginBottom: 0 }} />
                      : <span style={{ background: c.bg_color || "#FDECEA", padding: "3px 10px", borderRadius: 6, fontSize: "calc(12px * var(--fsc,1))" }}>{c.bg_color}</span>}
                  </td>
                  <td style={td}>
                    {editId === c.id
                      ? <input type="number" defaultValue={c.sort_order ?? 0} onChange={e => setEf({ ...ef, sort_order: Number(e.target.value) })} style={{ ...inp, width: 60, marginBottom: 0 }} />
                      : (c.sort_order ?? 0)}
                  </td>
                  <td style={td}><Badge text={c.status === "published" ? "已上架" : c.status === "archived" ? "已封存" : "草稿"} color={c.status === "published" ? "green" : c.status === "archived" ? "gray" : "orange"} /></td>
                  <td style={td}>{editId === c.id
                    ? <div style={{ display: "flex", gap: 6 }}><Btn size="sm" onClick={() => save(c.id)}>儲存</Btn><Btn size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Btn></div>
                    : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Btn size="sm" variant="outline" onClick={() => { setEditId(c.id); setEf({}); }}>✏️</Btn>
                        {c.status !== "published" && <Btn size="sm" variant="ghost" onClick={() => setCardStatus(c, "published")}>▶ 上架</Btn>}
                        {c.status === "published" && <Btn size="sm" variant="ghost" onClick={() => setCardStatus(c, "draft")}>⏸ 下架</Btn>}
                        <Btn size="sm" variant="ghost" onClick={() => del(c)}>🗑</Btn>
                      </div>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// 素材管理
// ═══════════════════════════════════════════════════════════════
function Materials({ showToast, isMobile }) {
  const [materials, setMaterials] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCourse, setFilterCourse] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const blank = { title: "", description: "", course_id: "", unit_id: "", status: "draft", asset_type: "document", sort_order: "" };
  const [form, setForm] = useState(blank);
  const [pendingFile, setPendingFile] = useState(null);
  const [editId, setEditId] = useState(null);
  const [ef, setEf] = useState({});

  const load = () => {
    setLoading(true);
    Promise.all([
      api.adminMaterials(filterCourse || undefined).then(({ materials: ms }) => setMaterials(ms || [])),
      api.adminAllCourses().then(({ courses: cs }) => setCourses(cs || [])),
    ]).catch(() => showToast("載入失敗", "error")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!loading) {
      api.adminMaterials(filterCourse || undefined).then(({ materials: ms }) => setMaterials(ms || [])).catch(() => {});
    }
  }, [filterCourse]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCourseUnits = courses.find(c => c.id === form.course_id)?.units || [];

  const VIDEO_EXTS = new Set(["mp4", "mov", "webm", "avi", "m4v"]);
  const handleFile = (file) => {
    if (!file) return;
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const isVideoFile = VIDEO_EXTS.has(ext) || (file.type || "").startsWith("video/");
    const maxSize = isVideoFile ? 2 * 1024 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast(`檔案超過 ${isVideoFile ? "2 GB" : "100 MB"} 限制。`, "error");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setPendingFile(file);
    setForm(f => ({
      ...f,
      asset_type: isVideoFile ? "video" : f.asset_type,
      title: f.title || file.name.replace(/\.[^.]+$/, ""),
    }));
  };

  const add = async () => {
    if (!pendingFile && !form.title) { showToast("請選擇檔案或填入標題", "error"); return; }
    setUploading(true);
    try {
      let fileData = {};
      if (pendingFile) {
        const { uploadUrl, publicUrl, filePath, fileName, fileSize, storageKey, storageProvider, mimeType } = await api.adminMaterialUploadUrl(pendingFile.name, pendingFile.size, { courseId: form.course_id || undefined, unitId: form.unit_id || undefined });
        // Content-Type 必須跟建立 presigned URL 時簽章用的一致（server 端 mimeType 為準），
        // 否則瀏覽器自行判斷的 pendingFile.type 若不同，R2 會回傳簽章不符而上傳失敗。
        const putContentType = mimeType || pendingFile.type || "application/octet-stream";
        const mResp = await fetch(uploadUrl, { method: "PUT", body: pendingFile, headers: { "Content-Type": putContentType } });
        if (!mResp.ok) throw new Error(`教材上傳失敗（HTTP ${mResp.status}）。請確認 R2 CORS 設定已允許目前網域。`);
        // 素材種類（含 HTML）一律用共用的 detectMaterialType 判斷，避免和素材庫查詢、
        // 前台顯示各自寫一套不同的規則。
        const fileType = detectMaterialType({ filename: pendingFile.name, mimeType: putContentType });
        fileData = { file_name: fileName, file_path: filePath, file_url: publicUrl, file_type: fileType, file_size: fileSize, storage_key: storageKey, storage_provider: storageProvider, mime_type: putContentType };
      } else {
        fileData = { file_name: form.title, file_path: form.title, file_url: "", file_type: "other", file_size: 0 };
      }
      await api.adminMaterialCreate({ ...form, ...fileData, sort_order: Number(form.sort_order) || 0 });
      setForm(blank); setPendingFile(null); setShowAdd(false); load(); showToast("素材已建立");
    } catch (e) { showToast(e.message, "error"); } finally { setUploading(false); }
  };

  const save = async (id) => {
    try { await api.adminMaterialPatch({ id, ...ef }); setEditId(null); load(); showToast("已更新"); }
    catch (e) { showToast(e.message, "error"); }
  };

  const setMatStatus = async (m, newStatus) => {
    const msg = { published: "已上架", draft: "已設為草稿", archived: "已封存" }[newStatus] || "已更新";
    try { await api.adminMaterialPatch({ id: m.id, status: newStatus }); load(); showToast(msg); }
    catch (e) { showToast(e.message, "error"); }
  };

  const del = async (m) => {
    if (!confirm(`確定刪除素材「${m.title}」？\n此操作會刪除資料庫紀錄，並同步刪除雲端儲存中的實體檔案。`)) return;
    try {
      const result = await api.adminMaterialDelete(m.id);
      load();
      if (result.fileDeleteWarning) {
        showToast(result.fileDeleteWarning, "error");
      } else {
        showToast("素材已刪除");
      }
    } catch (e) { showToast(e.message, "error"); }
  };

  const fmtSize = s => {
    if (!s) return "—";
    return s >= 1048576 ? `${(s / 1048576).toFixed(1)} MB` : s >= 1024 ? `${Math.round(s / 1024)} KB` : `${s} B`;
  };
  const typeIcon = t => ({ pdf: "📄", docx: "📝", pptx: "📊", image: "🖼️", html: "🌐", video: "🎬" }[t] || "📎");
  const courseName = id => courses.find(c => c.id === id)?.title || "—";

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>載入中…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h2 style={{ fontSize: "calc(20px * var(--fsc,1))", fontWeight: 800 }}>素材管理</h2>
        <Btn onClick={() => setShowAdd(true)}>＋ 上傳素材</Btn>
      </div>
      <p style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600, marginBottom: 14 }}>教材儲存於 Cloudflare R2（需設定 .env.local 的 R2 環境變數）。</p>

      {/* 篩選 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} style={{ ...inp, maxWidth: 260, marginBottom: 0 }}>
          <option value="">全部課程</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>)}
        </select>
      </div>

      {/* 新增表單 */}
      {showAdd && (
        <div style={{ background: C.primaryLight, borderRadius: 12, padding: 18, marginBottom: 18 }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>上傳素材</div>
          <div style={{ marginBottom: 8 }}>
            <label style={lbl}>選擇檔案（PDF / Word / PPT / 圖片 / HTML / 影片）</label>
            <input type="file" ref={fileRef} style={{ display: "none" }} accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.html,.htm,.mp4,.mov,.webm" onChange={e => handleFile(e.target.files[0])} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Btn size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>選擇檔案</Btn>
              {pendingFile && <span style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray700 }}>📎 {pendingFile.name} ({fmtSize(pendingFile.size)})</span>}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 10, marginBottom: 8 }}>
            <div><label style={lbl}>標題 *</label><input placeholder="顯示名稱" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>說明</label><input placeholder="選填" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inp} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 80px", gap: 10, marginBottom: 8 }}>
            <div>
              <label style={lbl}>所屬課程</label>
              <select value={form.course_id} onChange={e => setForm({ ...form, course_id: e.target.value, unit_id: "" })} style={inp}>
                <option value="">全站通用（不綁定課程）</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.title}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>綁定單元（選填）</label>
              <select value={form.unit_id} onChange={e => setForm({ ...form, unit_id: e.target.value })} style={inp} disabled={!form.course_id}>
                <option value="">不綁定特定單元</option>
                {selectedCourseUnits.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}
              </select>
            </div>
            <div><label style={lbl}>排序</label><input type="number" placeholder="0" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} style={inp} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, marginBottom: 8 }}>
            <div><label style={lbl}>素材類型</label><select value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })} style={inp}><option value="document">文件</option><option value="video">影片</option><option value="image">圖片</option><option value="other">其他</option></select></div>
            <div><label style={lbl}>初始狀態</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}><option value="draft">草稿（暫存，前台不顯示）</option><option value="published">直接上架</option></select></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn onClick={add} disabled={!form.title || uploading}>{uploading ? "上傳中…" : "建立教材"}</Btn>
            <Btn variant="outline" onClick={() => { setShowAdd(false); setForm(blank); setPendingFile(null); }}>取消</Btn>
          </div>
        </div>
      )}

      {/* 教材列表 */}
      <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflowX: "auto" }}>
        {materials.length === 0
          ? <div style={{ padding: 40, textAlign: "center", color: C.gray400 }}>尚無素材，請點「上傳素材」</div>
          : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "calc(13px * var(--fsc,1))", minWidth: 780 }}>
              <thead><tr style={{ background: C.gray100 }}>
                {["素材", "標題", "大小", "所屬課程", "綁定單元", "排序", "狀態", "操作"].map(h => <th key={h} style={th}>{h}</th>)}
              </tr></thead>
              <tbody>{materials.map(m => (
                <tr key={m.id} style={{ borderBottom: `1px solid ${C.gray100}` }}>
                  <td style={td}><span style={{ fontSize: "calc(18px * var(--fsc,1))" }}>{isHtmlMaterial(m) ? "🌐" : typeIcon(m.file_type)}</span><div style={{ fontSize: "calc(10px * var(--fsc,1))", color: C.gray400, marginTop: 1 }}>{isHtmlMaterial(m) ? "互動網頁" : ({ document: "文件", video: "影片", image: "圖片", other: "其他" }[m.asset_type] || "文件")}</div></td>
                  <td style={td}>
                    {editId === m.id
                      ? <input defaultValue={m.title} onChange={e => setEf({ ...ef, title: e.target.value })} style={{ ...inp, width: 160, marginBottom: 0 }} />
                      : <><div style={{ fontWeight: 600 }}>{m.title}</div><div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray400, marginTop: 2 }}>{m.file_name}</div></>}
                  </td>
                  <td style={td}>{fmtSize(m.file_size)}</td>
                  <td style={td}>{courseName(m.course_id)}</td>
                  <td style={{ ...td, fontSize: "calc(11px * var(--fsc,1))", color: C.gray600 }}>{m.unit_id ? (courses.find(c => c.id === m.course_id)?.units?.find(u => u.id === m.unit_id)?.title || m.unit_id.slice(0, 8) + "…") : "—"}</td>
                  <td style={td}>{editId === m.id ? <input type="number" defaultValue={m.sort_order ?? 0} onChange={e => setEf({ ...ef, sort_order: Number(e.target.value) })} style={{ ...inp, width: 60, marginBottom: 0 }} /> : (m.sort_order ?? 0)}</td>
                  <td style={td}><Badge text={m.status === "published" ? "已上架" : m.status === "archived" ? "已封存" : "草稿"} color={m.status === "published" ? "green" : m.status === "archived" ? "gray" : "orange"} /></td>
                  <td style={td}>{editId === m.id
                    ? <div style={{ display: "flex", gap: 6 }}><Btn size="sm" onClick={() => save(m.id)}>儲存</Btn><Btn size="sm" variant="ghost" onClick={() => setEditId(null)}>取消</Btn></div>
                    : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {m.file_url && <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: "calc(12px * var(--fsc,1))", fontWeight: 700, textDecoration: "none", cursor: "pointer" }}>🔍</a>}
                        <Btn size="sm" variant="outline" onClick={() => { setEditId(m.id); setEf({}); }}>✏️</Btn>
                        {m.status !== "published" && <Btn size="sm" variant="ghost" onClick={() => setMatStatus(m, "published")}>▶ 上架</Btn>}
                        {m.status === "published" && <Btn size="sm" variant="ghost" onClick={() => setMatStatus(m, "draft")}>⏸ 下架</Btn>}
                        {m.status !== "archived" && <Btn size="sm" variant="ghost" onClick={() => setMatStatus(m, "archived")} title="封存">📦</Btn>}
                        <Btn size="sm" variant="ghost" onClick={() => del(m)}>🗑</Btn>
                      </div>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
      </div>
    </div>
  );
}
