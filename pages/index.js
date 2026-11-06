import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { api } from "../lib/api";
import { SITE } from "../lib/siteConfig";
import { isHtmlMaterial } from "../lib/materialType";
import { isProgressCountedUnit } from "../lib/unitProgress";

const C = { primary: "#E8392A", primaryLight: "#FDECEA", accent: "#1A73E8", dark: "#1A1A2E", gray900: "#1F2937", gray700: "#374151", gray600: "#5B6472", gray400: "#9CA3AF", gray200: "#E5E7EB", gray100: "#F3F4F6", green: "#10B981", orange: "#F59E0B" };
function useIsMobile() { const [m, setM] = useState(false); useEffect(() => { const fn = () => setM(window.innerWidth < 768); fn(); window.addEventListener("resize", fn); return () => window.removeEventListener("resize", fn); }, []); return m; }
const ProgressBar = ({ pct, color = C.primary, h = 8 }) => <div style={{ background: C.gray200, borderRadius: 999, height: h, overflow: "hidden" }}><div style={{ width: `${Math.min(100, pct || 0)}%`, height: "100%", background: color, transition: "width .4s" }} /></div>;
const Badge = ({ text, color = "blue" }) => { const m = { red: ["#FDECEA", C.primary], green: ["#D1FAE5", "#065F46"], blue: ["#DBEAFE", "#1E40AF"], gray: [C.gray100, C.gray600] }[color]; return <span style={{ background: m[0], color: m[1], padding: "3px 11px", borderRadius: 999, fontSize: "calc(12px * var(--fsc,1))", fontWeight: 700 }}>{text}</span>; };
const Btn = ({ children, onClick, variant = "primary", size = "md", full, disabled, style = {} }) => { const pad = { sm: "8px 16px", md: "12px 24px", lg: "16px 32px" }[size]; const fs = { sm: "calc(14px * var(--fsc,1))", md: "calc(16px * var(--fsc,1))", lg: "calc(18px * var(--fsc,1))" }[size]; const v = { primary: { background: C.primary, color: "#fff" }, outline: { background: "#fff", color: C.primary, border: `2px solid ${C.primary}` }, ghost: { background: "transparent", color: C.gray600 }, dark: { background: C.dark, color: "#fff" }, green: { background: C.green, color: "#fff" } }[variant]; return <button onClick={onClick} disabled={disabled} style={{ touchAction: "manipulation", border: "none", borderRadius: 12, cursor: disabled ? "not-allowed" : "pointer", fontWeight: 700, padding: pad, fontSize: fs, width: full ? "100%" : "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: disabled ? 0.5 : 1, ...v, ...style }}>{children}</button>; };
const Toast = ({ msg, type, onClose }) => { useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]); return <div style={{ position: "fixed", top: 78, right: 16, left: 16, maxWidth: 380, marginLeft: "auto", zIndex: 9999, background: type === "error" ? C.primary : C.green, color: "#fff", padding: "14px 22px", borderRadius: 12, fontWeight: 700, boxShadow: "0 6px 24px rgba(0,0,0,0.18)", animation: "slideIn .2s" }}>{type === "error" ? "⚠️ " : "✅ "}{msg}</div>; };
const CAT = { "咀嚼照護": ["#FDECEA", C.primary], "吞嚥訓練": ["#DBEAFE", C.accent], "飲食調整": ["#D1FAE5", C.green] };

function FontToggle() {
  const [cur, setCur] = useState("");
  useEffect(() => {
    try {
      const s = localStorage.getItem("fc");
      const cls = s !== null ? s : "font-lg"; // 預設「中」字級
      document.documentElement.classList.remove("font-lg", "font-xl");
      if (cls) document.documentElement.classList.add(cls);
      setCur(cls);
      if (s === null) localStorage.setItem("fc", cls);
    } catch (_) {}
  }, []);
  const set = (cls) => {
    document.documentElement.classList.remove("font-lg", "font-xl");
    if (cls) document.documentElement.classList.add(cls);
    setCur(cls);
    try { localStorage.setItem("fc", cls); } catch (_) {}
  };
  const b = (cls, fs) => ({ border: `1px solid ${cur === cls ? C.primary : C.gray200}`, background: cur === cls ? C.primaryLight : "#fff", borderRadius: 6, padding: "4px 10px", fontSize: `calc(${fs}px * var(--fsc,1))`, cursor: "pointer", fontWeight: 700, color: cur === cls ? C.primary : C.dark });
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }} aria-label="字級調整">
      <span style={{ fontSize: "calc(12px * var(--fsc,1))", color: C.gray600 }}>字級</span>
      <button onClick={() => set("")} style={b("", 13)}>小</button>
      <button onClick={() => set("font-lg")} style={b("font-lg", 15)}>中</button>
      <button onClick={() => set("font-xl")} style={b("font-xl", 18)}>大</button>
    </div>
  );
}

export default function Home() {
  const isMobile = useIsMobile();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("home");
  const [courses, setCourses] = useState([]);
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState(null);
  // 登入後回到的頁面（例如未登入點課程後要回到 courseDetail）
  const [returnPage, setReturnPage] = useState(null);
  const showToast = useCallback((msg, type = "success") => setToast({ msg, type }), []);

  const [catMap, setCatMap] = useState({});
  useEffect(() => {
    api.publicCategories().then(({ categories: cs }) => {
      const m = {}; (cs || []).forEach(cat => { m[cat.name] = [cat.bg_color, cat.text_color]; }); setCatMap(m);
    }).catch(() => {});
  }, []);
  useEffect(() => { api.me().then(({ user }) => setUser(user)).catch(() => {}).finally(() => setLoading(false)); }, []);
  const loadCourses = useCallback(() => { api.courses().then(({ courses }) => setCourses(courses)).catch(() => {}); }, []);
  useEffect(() => { loadCourses(); }, [loadCourses]);
  // 切換到課程專區或個人頁時重新讀取進度（確保 course detail 的進度同步回來）
  useEffect(() => {
    if (user && (page === "courses" || page === "dashboard")) loadCourses();
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps
  const logout = async () => { await api.logout(); setUser(null); setPage("home"); showToast("已登出", "error"); };

  // 點課程卡片（可在首頁或課程專區）
  const handleCourseClick = (c) => {
    setActive(c);
    if (user) { setPage("courseDetail"); }
    else { setReturnPage("courseDetail"); setPage("login"); }
  };

  if (loading) return <div style={{ padding: 80, textAlign: "center", color: C.gray600 }}>載入中…</div>;

  return (
    <div style={{ minHeight: "100vh" }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      <Nav {...{ page, setPage, user, logout, isMobile }} />
      {page === "home"       && <HomePage setPage={setPage} isMobile={isMobile} user={user} courses={courses} handleCourseClick={handleCourseClick} />}
      {page === "courses"    && <Courses {...{ courses, user, handleCourseClick, isMobile, catMap }} />}
      {page === "login"      && <Login {...{ setUser, setPage, showToast, isMobile, returnPage, active }} />}
      {page === "dashboard"  && user && <Dashboard {...{ user, courses, handleCourseClick, isMobile }} />}
      {page === "courseDetail" && user && active && <CourseDetail {...{ course: active, setPage, isMobile, showToast, reload: loadCourses, catMap, user }} />}
      {page === "about"      && <About setPage={setPage} isMobile={isMobile} user={user} />}
      {user?.actorType === "admin" && (
        <div style={{ position: "fixed", bottom: 18, right: 16, zIndex: 100 }}>
          <Link href="/platform" style={{ textDecoration: "none" }}>
            <Btn variant="dark" size="sm" style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>⚙️ {isMobile ? "" : "回後台"}</Btn>
          </Link>
        </div>
      )}
    </div>
  );
}

function Nav({ page, setPage, user, logout, isMobile }) {
  const [open, setOpen] = useState(false);
  const links = [["home", "首頁"], ["courses", "課程專區"], ["about", "關於我們"]];
  return (
    <nav style={{ position: "sticky", top: 0, zIndex: 200, background: "#fff", borderBottom: `1px solid ${C.gray200}`, padding: isMobile ? "0 16px" : "0 32px", display: "flex", alignItems: "center", height: 64, gap: isMobile ? 0 : 26 }}>
      <div onClick={() => setPage("home")} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "pointer" }}>
        <div style={{ width: 38, height: 38, background: C.primary, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "calc(18px * var(--fsc,1))" }}>{SITE.logoChar}</div>
        {!isMobile && <div><div style={{ fontWeight: 700, fontSize: "calc(16px * var(--fsc,1))" }}>{SITE.name}</div><div style={{ fontSize: "calc(11px * var(--fsc,1))", color: C.gray400 }}>{SITE.subtitle}</div></div>}
      </div>
      <div style={{ flex: 1 }} />
      {!isMobile && links.map(([k, l]) => <span key={k} onClick={() => setPage(k)} style={{ cursor: "pointer", fontSize: "calc(16px * var(--fsc,1))", fontWeight: 500, color: page === k ? C.primary : C.gray600, borderBottom: page === k ? `2px solid ${C.primary}` : "2px solid transparent", paddingBottom: 3 }}>{l}</span>)}
      {!isMobile && <FontToggle />}
      {!isMobile && (user ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span onClick={() => setPage("dashboard")} style={{ cursor: "pointer", fontWeight: 700 }}>👤 {user.name}</span><Btn size="sm" variant="ghost" onClick={logout}>登出</Btn></div> : <Btn onClick={() => setPage("login")}>登入</Btn>)}
      {isMobile && <div onClick={() => setOpen(!open)} style={{ cursor: "pointer", padding: 8 }} aria-label="選單">{[0, 1, 2].map(i => <div key={i} style={{ width: 26, height: 3, background: C.dark, margin: "5px 0", borderRadius: 2 }} />)}</div>}
      {isMobile && open && (
        <div style={{ position: "absolute", top: 64, left: 0, right: 0, background: "#fff", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", zIndex: 300, padding: "8px 0" }}>
          {links.map(([k, l]) => <div key={k} onClick={() => { setPage(k); setOpen(false); }} style={{ padding: "15px 20px", fontSize: "calc(17px * var(--fsc,1))", fontWeight: 500, color: page === k ? C.primary : C.gray900, cursor: "pointer" }}>{l}</div>)}
          <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.gray200}` }}><FontToggle /></div>
          {user ? <><div onClick={() => { setPage("dashboard"); setOpen(false); }} style={{ padding: "15px 20px", fontSize: "calc(17px * var(--fsc,1))", cursor: "pointer" }}>我的學習</div><div onClick={() => { logout(); setOpen(false); }} style={{ padding: "15px 20px", fontSize: "calc(17px * var(--fsc,1))", color: C.primary, fontWeight: 700, cursor: "pointer" }}>登出</div></> : <div onClick={() => { setPage("login"); setOpen(false); }} style={{ padding: "15px 20px", fontSize: "calc(17px * var(--fsc,1))", color: C.primary, fontWeight: 700, cursor: "pointer" }}>登入</div>}
        </div>
      )}
    </nav>
  );
}

// ── 首頁 ───────────────────────────────────────────────────────────────────
const DEFAULT_FEATS = [
  ["🍽️", "咀嚼照護教學", "認識咀嚼困難成因，學習協助長者安全進食，預防嗆咳。", C.primaryLight],
  ["💪", "吞嚥訓練影片", "口腔肌肉運動與吞嚥技巧示範，改善吞嚥功能。", "#DBEAFE"],
  ["🥣", "飲食質地調整", "軟食、細碎食、糊狀食製備教學，吃得安全又營養。", "#D1FAE5"],
];

function HomePage({ setPage, isMobile, user, courses, handleCourseClick }) {
  const [stats, setStats] = useState(null);
  const [banner, setBanner] = useState(undefined); // undefined=loading, null=none
  const [featureCards, setFeatureCards] = useState(null); // null=loading
  useEffect(() => { api.publicStats().then(setStats).catch(() => {}); }, []);
  useEffect(() => { api.publicBanners().then(({ banner: b }) => setBanner(b || null)).catch(() => setBanner(null)); }, []);
  useEffect(() => { api.publicFeatureCards().then(({ cards: cs }) => setFeatureCards(cs || [])).catch(() => setFeatureCards([])); }, []);
  const feats = featureCards && featureCards.length > 0
    ? featureCards.map(c => [c.icon, c.title, c.description, c.bg_color])
    : DEFAULT_FEATS;

  const previewCourses = courses.slice(0, isMobile ? 2 : 3);

  return (
    <div>
      {/* Hero / Banner */}
      {banner
        ? (
          <section style={{ position: "relative", maxWidth: "100%", overflow: "hidden", background: C.dark, minHeight: isMobile ? 200 : 320, display: "flex", alignItems: "center" }}>
            {banner.image_url && <img src={banner.image_url} alt={banner.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.55 }} />}
            <div style={{ position: "relative", zIndex: 1, padding: isMobile ? "32px 20px" : "56px 64px", maxWidth: 700 }}>
              {banner.title && <h1 style={{ fontSize: isMobile ? 26 : 40, fontWeight: 900, color: "#fff", lineHeight: 1.3, marginBottom: 10 }}>{banner.title}</h1>}
              {banner.subtitle && <p style={{ fontSize: isMobile ? 15 : 18, color: "rgba(255,255,255,0.85)", marginBottom: 20, lineHeight: 1.7 }}>{banner.subtitle}</p>}
              {banner.link_url && (
                <a href={banner.link_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <Btn size={isMobile ? "md" : "lg"}>{banner.button_text || "了解更多"}</Btn>
                </a>
              )}
            </div>
          </section>
        )
        : (
          <section style={{ padding: isMobile ? "40px 20px" : "72px 64px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 32 : 56, alignItems: "center", maxWidth: 1180, margin: "0 auto" }}>
            <div>
              <div style={{ display: "inline-block", background: C.primaryLight, color: C.primary, padding: "7px 16px", borderRadius: 999, fontSize: "calc(14px * var(--fsc,1))", fontWeight: 700, marginBottom: 20 }}>❤️ 專業・安全・值得信賴</div>
              <h1 style={{ fontSize: isMobile ? 34 : 48, fontWeight: 900, lineHeight: 1.25, marginBottom: 18 }}>守護進食安全，<br /><span style={{ color: C.primary }}>從學會吞嚥照護開始</span></h1>
              <p style={{ fontSize: isMobile ? 17 : 19, color: C.gray600, lineHeight: 1.9, marginBottom: 30 }}>專為腦中風患者家屬與照護者設計的衛教課程，影片教學搭配課後測驗，在家也能輕鬆學習。</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <Btn size="lg" onClick={() => setPage(user ? "courses" : "login")}>▶ 立即觀看課程</Btn>
                <Btn size="lg" variant="outline" onClick={() => setPage("about")}>了解更多</Btn>
              </div>
            </div>
            <div style={{ background: "linear-gradient(135deg,#FFF0EF,#EBF4FF)", borderRadius: 20, padding: 36, textAlign: "center", boxShadow: "0 16px 56px rgba(0,0,0,0.08)" }}><div style={{ fontSize: "calc(96px * var(--fsc,1))" }}>🍽️</div></div>
          </section>
        )
      }

      {/* 功能特色 */}
      <section style={{ background: C.gray100, padding: isMobile ? "40px 20px" : "56px 64px" }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 20, maxWidth: 1180, margin: "0 auto" }}>
          {feats.map(([ic, t, d, bg], i) => <div key={i} style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}><div style={{ width: 56, height: 56, borderRadius: 14, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "calc(28px * var(--fsc,1))", marginBottom: 14 }}>{ic}</div><h3 style={{ fontSize: "calc(19px * var(--fsc,1))", fontWeight: 700, marginBottom: 8 }}>{t}</h3><p style={{ fontSize: "calc(16px * var(--fsc,1))", color: C.gray600, lineHeight: 1.75 }}>{d}</p></div>)}
        </div>
      </section>

      {/* 課程預覽 */}
      {previewCourses.length > 0 && (
        <section style={{ padding: isMobile ? "36px 20px" : "56px 64px", maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800 }}>精選課程</h2>
            <button onClick={() => setPage("courses")} style={{ background: "none", border: `1.5px solid ${C.primary}`, color: C.primary, borderRadius: 8, padding: "7px 16px", fontWeight: 700, cursor: "pointer", fontSize: "calc(14px * var(--fsc,1))" }}>查看全部 →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${previewCourses.length},1fr)`, gap: 20 }}>
            {previewCourses.map(c => {
              const cat = CAT[c.category] || [C.primaryLight, C.primary];
              return (
                <div key={c.id}
                  onClick={() => handleCourseClick(c)}
                  style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: "pointer", transition: "transform .15s, box-shadow .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
                >
                  <div style={{ background: cat[0], height: 130, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "calc(52px * var(--fsc,1))" }}>{c.emoji}</div>
                  <div style={{ padding: 18 }}>
                    <Badge text={c.category} color={c.category === "咀嚼照護" ? "red" : c.category === "吞嚥訓練" ? "blue" : "green"} />
                    <h3 style={{ fontSize: "calc(17px * var(--fsc,1))", fontWeight: 700, margin: "8px 0 6px" }}>{c.title}</h3>
                    <p style={{ fontSize: "calc(14px * var(--fsc,1))", color: C.gray600, lineHeight: 1.6, marginBottom: 12 }}>{(c.description || "").slice(0, 60)}{c.description?.length > 60 ? "…" : ""}</p>
                    <div style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600 }}>{c.units?.length || 0} 個單元 · {user ? `已完成 ${c.progress || 0}%` : "登入後開始學習"}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      {stats?.visitCount > 0 && (
        <div style={{ padding: isMobile ? "8px 20px 20px" : "8px 64px 24px", fontSize: "calc(12px * var(--fsc,1))", color: C.gray400 }}>
          累計使用人次：<b style={{ color: C.gray600 }}>{(stats.visitCount || 0).toLocaleString()}</b>
        </div>
      )}
    </div>
  );
}

// ── 課程專區 ───────────────────────────────────────────────────────────────
function Courses({ courses, user, handleCourseClick, isMobile, catMap }) {
  const [filter, setFilter] = useState("全部");
  const [dbCats, setDbCats] = useState(null); // null=載入中
  useEffect(() => { api.publicCategories().then(({ categories: cs }) => setDbCats(cs || [])).catch(() => setDbCats([])); }, []);
  // 完全從資料庫讀取，不寫死預設分類
  const cats = ["全部", ...(dbCats || []).map(c => c.name)];
  const list = filter === "全部" ? courses : courses.filter(c => c.category === filter);
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 32px" }}>
      <h2 style={{ fontSize: isMobile ? 27 : 33, fontWeight: 800, marginBottom: 6 }}>課程專區</h2>
      <p style={{ color: C.gray600, marginBottom: 24, fontSize: "calc(17px * var(--fsc,1))" }}>由專業團隊製作審核的吞嚥照護衛教課程</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>{cats.map(c => <button key={c} onClick={() => setFilter(c)} style={{ padding: "10px 20px", borderRadius: 999, background: filter === c ? C.primary : "#fff", color: filter === c ? "#fff" : C.gray600, border: `2px solid ${filter === c ? C.primary : C.gray200}`, fontWeight: 700, fontSize: "calc(15px * var(--fsc,1))", cursor: "pointer" }}>{c}</button>)}</div>
      {courses.length === 0 && <div style={{ padding: 60, textAlign: "center", color: C.gray400 }}>目前尚無課程。</div>}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 20 }}>
        {list.map(c => {
          const cat = catMap?.[c.category] || CAT[c.category] || [C.primaryLight, C.primary];
          // 這門課有沒有任何「計入課程進度」的單元（video / quiz / track_progress=true 的
          // interactive_html）。全部都是自我評估型 HTML 時，不顯示 0% 與進度條，改標示
          // 「自我評估」——單元數仍照 c.units?.length 顯示，不受影響。
          const hasProgress = (c.units || []).filter(isProgressCountedUnit).length > 0;
          return (
            <div key={c.id}
              onClick={() => handleCourseClick(c)}
              style={{ background: "#fff", borderRadius: 16, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", cursor: "pointer", transition: "transform .15s, box-shadow .15s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(0,0,0,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)"; }}
            >
              <div style={{ background: cat[0], height: 140, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "calc(58px * var(--fsc,1))" }}>{c.emoji}</div>
              <div style={{ padding: 20 }}>
                <Badge text={c.category} color={c.category === "咀嚼照護" ? "red" : c.category === "吞嚥訓練" ? "blue" : "green"} />
                <h3 style={{ fontSize: "calc(18px * var(--fsc,1))", fontWeight: 700, margin: "8px 0 6px" }}>{c.title}</h3>
                <p style={{ fontSize: "calc(15px * var(--fsc,1))", color: C.gray600, lineHeight: 1.6, marginBottom: 14 }}>{c.description}</p>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: "calc(14px * var(--fsc,1))", color: C.gray600 }}>{c.units?.length || 0} 個單元</span>
                  {user && (hasProgress
                    ? <span style={{ fontSize: "calc(15px * var(--fsc,1))", fontWeight: 700, color: c.progress === 100 ? C.green : C.primary }}>{c.progress}%</span>
                    : <span style={{ fontSize: "calc(13px * var(--fsc,1))", fontWeight: 700, color: C.gray400 }}>自我評估</span>)}
                </div>
                {!user
                  ? <div style={{ fontSize: "calc(14px * var(--fsc,1))", color: C.gray400 }}>登入後開始學習</div>
                  : hasProgress && <ProgressBar pct={c.progress} color={c.progress === 100 ? C.green : cat[1]} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 登入（民眾用序號，無註冊）─────────────────────────────────────────────
function Login({ setUser, setPage, showToast, isMobile, returnPage, active }) {
  const [code, setCode] = useState(""); const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr(""); setBusy(true);
    try {
      const { user } = await api.login(code);
      setUser(user);
      showToast(`歡迎回來，${user.name}！`);
      setPage("home");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div style={{ minHeight: "calc(100vh - 64px)", background: "linear-gradient(135deg,#FFF5F5,#EBF4FF)", display: "flex", alignItems: "center" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 32px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 24 : 64, alignItems: "center", width: "100%" }}>
        {!isMobile && (
          <div>
            <h1 style={{ fontSize: "calc(38px * var(--fsc,1))", fontWeight: 900, lineHeight: 1.3, marginBottom: 14 }}>輸入序號，立即開始<br /><span style={{ color: C.primary }}>吞嚥照護</span>學習</h1>
            {active && <div style={{ background: C.primaryLight, borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: "calc(15px * var(--fsc,1))", color: C.primary, fontWeight: 600 }}>登入後即可繼續觀看：{active.emoji} {active.title}</div>}
            <div style={{ width: 48, height: 4, background: C.primary, borderRadius: 999, marginBottom: 22 }} />
            <p style={{ fontSize: "calc(17px * var(--fsc,1))", color: C.gray600, lineHeight: 1.85, marginBottom: 22 }}>專為長者設計的簡易登入 —— 只要輸入由衛教單位提供的 10 碼登入序號即可，不需記憶密碼。</p>
            <div style={{ background: "#fff", borderRadius: 12, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ fontWeight: 700, fontSize: "calc(15px * var(--fsc,1))", marginBottom: 6 }}>👵 沒有登入序號嗎？</div>
              <div style={{ fontSize: "calc(15px * var(--fsc,1))", color: C.gray600 }}>登入序號需由衛教單位（管理人員）開通。</div>
            </div>
          </div>
        )}
        <div style={{ background: "#fff", borderRadius: 20, padding: isMobile ? 24 : 40, boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
          {isMobile && active && <div style={{ background: C.primaryLight, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: "calc(14px * var(--fsc,1))", color: C.primary }}>登入後繼續觀看：{active.title}</div>}
          <h2 style={{ fontSize: "calc(22px * var(--fsc,1))", fontWeight: 800, marginBottom: 6, textAlign: "center" }}>民眾登入</h2>
          <p style={{ fontSize: "calc(15px * var(--fsc,1))", color: C.gray600, textAlign: "center", marginBottom: 24 }}>請輸入您的 10 碼登入序號</p>
          <input value={code} onChange={e => { setCode(e.target.value.replace(/\D/g, "").slice(0, 10)); setErr(""); }} type="tel" inputMode="numeric" placeholder="10 碼序號" onKeyDown={e => e.key === "Enter" && go()} aria-label="登入序號" style={{ width: "100%", padding: "18px", border: `2px solid ${err ? C.primary : C.gray200}`, borderRadius: 14, fontSize: "calc(28px * var(--fsc,1))", textAlign: "center", letterSpacing: 5, fontFamily: "monospace", fontWeight: 700, outline: "none", boxSizing: "border-box" }} />
          <div style={{ fontSize: "calc(14px * var(--fsc,1))", color: C.gray400, marginTop: 8, textAlign: "center" }}>例：0912345678</div>
          {err && <div style={{ background: C.primaryLight, color: C.primary, padding: "12px 16px", borderRadius: 10, marginTop: 16, fontSize: "calc(15px * var(--fsc,1))", lineHeight: 1.5 }}>{err}</div>}
          <Btn full size="lg" disabled={busy} onClick={go} style={{ marginTop: 18, padding: "16px 0", fontSize: "calc(19px * var(--fsc,1))" }}>{busy ? "登入中…" : "登入"}</Btn>
          {isMobile && <div style={{ marginTop: 18, fontSize: "calc(14px * var(--fsc,1))", color: C.gray600, textAlign: "center", lineHeight: 1.6 }}>登入序號需由衛教單位開通，<br />如未取得請洽所屬衛生所或據點。</div>}
        </div>
      </div>
    </div>
  );
}

// ── 我的學習（Dashboard）─────────────────────────────────────────────────
function Dashboard({ user, courses, handleCourseClick, isMobile }) {
  const totalPct = courses.length ? Math.round(courses.reduce((a, c) => a + (c.progress || 0), 0) / courses.length) : 0;
  const done = courses.filter(c => c.progress === 100).length;
  const inProg = courses.filter(c => c.progress > 0 && c.progress < 100).length;
  const stats = [["📚", courses.filter(c => c.progress > 0).length, "已選課程", C.primaryLight], ["▶", inProg, "進行中", "#DBEAFE"], ["✅", done, "已完成", "#D1FAE5"], ["📊", `${totalPct}%`, "總進度", "#FEF3C7"]];
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: isMobile ? "20px 16px" : "32px" }}>
      <div style={{ background: "linear-gradient(135deg,#FFF0EF,#FFF5F5)", borderRadius: 16, padding: isMobile ? 20 : "24px 28px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14, border: `1px solid ${C.primaryLight}` }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.primaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "calc(26px * var(--fsc,1))" }}>👤</div>
        <div><h2 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800 }}>你好，{user.name}！</h2><p style={{ color: C.gray600, fontSize: "calc(15px * var(--fsc,1))" }}>持續學習，守護家人進食安全！</p></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
        {stats.map(([ic, v, l, bg], i) => <div key={i} style={{ background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}><div style={{ width: 40, height: 40, borderRadius: 9, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "calc(18px * var(--fsc,1))", marginBottom: 10 }}>{ic}</div><div style={{ fontSize: "calc(28px * var(--fsc,1))", fontWeight: 900 }}>{v}</div><div style={{ fontSize: "calc(14px * var(--fsc,1))", color: C.gray600 }}>{l}</div></div>)}
      </div>
      <h3 style={{ fontWeight: 700, fontSize: "calc(19px * var(--fsc,1))", marginBottom: 14 }}>我的課程</h3>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        {courses.map(c => {
          const cat = CAT[c.category] || [C.primaryLight, C.primary];
          return (
            <div key={c.id}
              onClick={() => handleCourseClick(c)}
              style={{ background: "#fff", borderRadius: 14, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", cursor: "pointer", display: "flex", transition: "transform .15s, box-shadow .15s" }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)"; }}
            >
              <div style={{ width: 96, background: cat[0], display: "flex", alignItems: "center", justifyContent: "center", fontSize: "calc(36px * var(--fsc,1))", flexShrink: 0 }}>{c.emoji}</div>
              <div style={{ padding: 16, flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: "calc(16px * var(--fsc,1))", fontWeight: 700, marginBottom: 6 }}>{c.title}</h4>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600 }}>已完成 {c.completedUnits?.length || 0}/{(c.units || []).filter(u => !u.type || u.type === "video" || u.type === "quiz").length} 單元</span><span style={{ fontSize: "calc(14px * var(--fsc,1))", fontWeight: 700, color: c.progress === 100 ? C.green : C.primary }}>{c.progress}%</span></div>
                <ProgressBar pct={c.progress} color={c.progress === 100 ? C.green : cat[1]} />
                <Btn size="sm" variant={c.progress === 100 ? "outline" : "primary"} style={{ marginTop: 10, fontSize: "calc(13px * var(--fsc,1))", padding: "6px 14px" }}>{c.progress === 100 ? "複習課程" : c.progress > 0 ? "繼續學習" : "開始學習"}</Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 課程詳細頁 ──────────────────────────────────────────────────────────────
function CourseDetail({ course, setPage, isMobile, showToast, reload, catMap, user }) {
  const isAdminPreview = user?.actorType === "admin";
  const allUnits = useMemo(() => course.units || [], [course.units]); // eslint-disable-line react-hooks/exhaustive-deps
  const videoUnits = useMemo(() => allUnits.filter(u => !u.type || u.type === "video"), [allUnits]);
  const initDone = course.completedUnits || [];
  const [done, setDone] = useState(initDone);
  const [active, setActive] = useState(
    allUnits.find(u => !initDone.includes(u.id)) || allUnits[0]
  );
  const [unitProg, setUnitProg] = useState({});
  const [unitLastPos, setUnitLastPos] = useState({});
  const [materials, setMaterials] = useState([]);
  const [justCompletedUnit, setJustCompletedUnit] = useState(null);

  useEffect(() => { setJustCompletedUnit(null); }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const cat = catMap?.[course.category] || CAT[course.category] || [C.primaryLight, C.primary];

  // 進度計算：所有可完成單元 progress_percent 平均值（含影片觀看比例 + 測驗完成 +
  // 「有勾選計入進度」的互動網頁完成）。單一規則來源見 lib/unitProgress.js，
  // 不要只因為 type === "interactive_html" 就列入分母 —— 自我評估型 HTML
  // （track_progress !== true）必須被排除，否則會造成錯誤的 100% / 卡住不動。
  const playableUnits = allUnits.filter(isProgressCountedUnit);
  const total = playableUnits.length;
  const pct = total > 0 ? Math.round(playableUnits.reduce((sum, u) => sum + (unitProg[u.id] || 0), 0) / total) : 0;
  // 右側「課程進度」卡片：整門課如果沒有任何計入進度的單元（例如只有 track_progress=false
  // 的自我評估 HTML），就不要顯示 0% + 空清單，直接不 render 整張卡片。
  const showProgressPanel = total > 0;

  useEffect(() => {
    api.videoProgress(course.id)
      .then(({ progress }) => {
        const percMap = {};
        const posMap = {};
        const doneFromServer = [];
        (progress || []).forEach(p => {
          percMap[p.unit_id] = p.progress_percent;
          posMap[p.unit_id] = p.last_position_seconds;
          if (p.completed) doneFromServer.push(p.unit_id);
        });
        setUnitProg(percMap);
        setUnitLastPos(posMap);
        // 合併伺服器資料（含測驗完成狀態）
        setDone(prev => {
          const merged = new Set([...prev, ...doneFromServer]);
          return [...merged];
        });
      })
      .catch(() => {});
    api.courseMaterials(course.id)
      .then(({ materials: ms }) => setMaterials(ms || []))
      .catch(() => {});
  }, [course.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProgress = useCallback(async (unitId, percent, positionSec, durationSec) => {
    try {
      const result = await api.saveVideoProgress({ unitId, courseId: course.id, positionSeconds: positionSec, durationSeconds: durationSec, percent });
      setUnitProg(prev => ({ ...prev, [unitId]: percent }));
      setUnitLastPos(prev => ({ ...prev, [unitId]: positionSec }));
      // 90% 時靜默標記完成（不顯示提示，等 ended 事件才顯示）
      if (result.justCompleted && !done.includes(unitId)) {
        setDone(nd => nd.includes(unitId) ? nd : [...nd, unitId]);
        if (!isAdminPreview) reload();
      }
    } catch (e) {
      console.warn("[handleProgress]", e.message);
    }
  }, [course.id, done, reload, isAdminPreview]); // eslint-disable-line

  // 影片真正播放結束時才顯示「本單元已完成」提示與下一單元按鈕
  const handleEnded = useCallback((unitId) => {
    setJustCompletedUnit(unitId);
    showToast("✅ 本單元已完成");
  }, [showToast]);

  const handleQuizDone = useCallback((unitId) => {
    const nd = done.includes(unitId) ? done : [...done, unitId];
    setDone(nd);
    setUnitProg(prev => ({ ...prev, [unitId]: 100 }));
    reload();
  }, [done, reload]); // eslint-disable-line

  // 互動網頁單元按下「完成本單元」：percent=100 → 後端 upsert unit_progress(completed=true) 並重算課程進度。
  // 管理員預覽時 /api/video-progress 會直接略過寫入（見後端 sess.actorType === "admin" 分支），這裡仍呼叫
  // 同一支 API 以維持與影片單元一致的行為，只是不觸發 reload()。
  const handleHtmlComplete = useCallback(async (unitId) => {
    try {
      await api.saveVideoProgress({ unitId, courseId: course.id, positionSeconds: 0, durationSeconds: 0, percent: 100 });
      setDone(nd => nd.includes(unitId) ? nd : [...nd, unitId]);
      setUnitProg(prev => ({ ...prev, [unitId]: 100 }));
      if (!isAdminPreview) reload();
      showToast("✅ 本單元已完成");
    } catch (e) {
      showToast(e.message || "操作失敗，請稍後再試", "error");
    }
  }, [course.id, reload, isAdminPreview, showToast]);

  const unitTypeIcon = (u, i) => {
    if (u.type === "quiz") return "📝";
    if (u.type === "material") return "📎";
    if (u.type === "text") return "📄";
    if (u.type === "interactive_html") return "🌐";
    return i + 1;
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: isMobile ? 16 : "24px 32px" }}>
      <div style={{ fontSize: "calc(14px * var(--fsc,1))", color: C.gray600, marginBottom: 14 }}>
        <span onClick={() => setPage("courses")} style={{ cursor: "pointer", color: C.accent }}>課程專區</span> › {course.title}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile || !showProgressPanel ? "1fr" : "1fr 320px", gap: 20 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, marginBottom: 6 }}>{course.title}</h1>
          <p style={{ fontSize: "calc(16px * var(--fsc,1))", color: C.gray600, marginBottom: 16 }}>{course.description}</p>

          {/* 管理員預覽提示 */}
          {isAdminPreview && (
            <div style={{ background: "#FFF8E1", border: "1px solid #F59E0B", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: "calc(13px * var(--fsc,1))", color: "#92400E" }}>
              👁️ 管理員預覽模式：課程、影片、測驗、互動內容均可正常預覽，但學習進度不會被記錄。
            </div>
          )}

          {/* 主內容區：依單元類型渲染 */}
          {active?.type === "quiz" ? (
            <div style={{ borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
              <Quiz
                course={course}
                unitId={active.id}
                onDone={() => {
                  const quizId = active.id;
                  handleQuizDone(quizId);
                  const curIdx = allUnits.findIndex(u => u.id === quizId);
                  const next = allUnits.slice(curIdx + 1).find(u => !done.includes(u.id) && (!u.type || u.type === "video" || u.type === "quiz" || u.type === "interactive_html"));
                  setActive(next || videoUnits[0] || allUnits[0]);
                }}
                onBack={() => setActive(videoUnits[0] || allUnits[0])}
                isMobile={isMobile}
                showToast={showToast}
              />
            </div>
          ) : active?.type === "interactive_html" ? (
            <>
              <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", marginBottom: 16 }}>
                <HtmlUnitPlayer
                  unit={active}
                  isMobile={isMobile}
                  completed={done.includes(active.id)}
                  onComplete={() => handleHtmlComplete(active.id)}
                />
              </div>
              {/* 教材下載 */}
              <MaterialsSection materials={materials} courseId={course.id} showToast={showToast} />
            </>
          ) : videoUnits.length === 0 ? (
            <div style={{ borderRadius: 14, background: cat[0], padding: "48px 24px", textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: "calc(52px * var(--fsc,1))", marginBottom: 12 }}>🎬</div>
              <div style={{ fontSize: "calc(16px * var(--fsc,1))", fontWeight: 700, color: C.gray700 }}>此課程尚未上架影片</div>
              <div style={{ fontSize: "calc(14px * var(--fsc,1))", color: C.gray600, marginTop: 6 }}>請至後台「課程管理」展開課程後新增單元</div>
            </div>
          ) : (
            <>
              <div style={{ borderRadius: 14, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", marginBottom: 16, background: "#000" }}>
                <VideoPlayer
                  unit={active}
                  cat={cat}
                  isMobile={isMobile}
                  onProgress={handleProgress}
                  onEnded={handleEnded}
                  initialPosition={unitLastPos[active?.id] || 0}
                  isAdminPreview={isAdminPreview}
                />
              </div>
              {/* 單元完成提示 — 手動選擇是否前往下一單元 */}
              {justCompletedUnit === active?.id && (() => {
                const cIdx = allUnits.findIndex(u => u.id === justCompletedUnit);
                const nxt = cIdx >= 0 ? allUnits.slice(cIdx + 1).find(u => !done.includes(u.id) && (!u.type || u.type === "video" || u.type === "quiz" || u.type === "interactive_html")) : null;
                return (
                  <div style={{ background: "#D1FAE5", border: "1px solid #10B981", borderRadius: 10, padding: "10px 16px", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: "calc(14px * var(--fsc,1))", color: "#065F46", fontWeight: 600 }}>✅ 本單元已完成！</span>
                    {nxt
                      ? <Btn size="sm" variant="green" onClick={() => { setActive(nxt); setJustCompletedUnit(null); }}>前往下一單元 →</Btn>
                      : <span style={{ fontSize: "calc(13px * var(--fsc,1))", color: "#065F46" }}>🎉 課程全部完成！</span>
                    }
                  </div>
                );
              })()}
              {/* 教材下載 */}
              <MaterialsSection materials={materials} courseId={course.id} showToast={showToast} />
            </>
          )}
        </div>

        {/* 右側進度欄 —— 只列出真正計入課程進度的單元（isProgressCountedUnit）。
            track_progress=false 的自我評估 HTML 完全不出現在這裡：不占清單、不顯示
            完成勾勾、不影響 %，但仍可在左側主內容區正常開啟、iframe 正常、可重複使用。
            如果整門課沒有任何計入進度的單元，就不 render 這張卡片（不顯示 0% + 空清單）。 */}
        {showProgressPanel && (
          <div>
            <div style={{ background: "#fff", borderRadius: 16, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", position: isMobile ? "static" : "sticky", top: 76 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, fontSize: "calc(16px * var(--fsc,1))" }}>課程進度</h3>
                <span style={{ color: cat[1], fontWeight: 700 }}>{pct}%</span>
              </div>
              <ProgressBar pct={pct} color={cat[1]} />
              <div style={{ marginTop: 14 }}>
                {playableUnits.map((u, i) => {
                  const isDone = done.includes(u.id);
                  const isAct = active?.id === u.id;
                  return (
                    <div key={u.id} onClick={() => setActive(u)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", borderRadius: 10, marginBottom: 4, cursor: "pointer", background: isAct ? C.primaryLight : "transparent" }}>
                      <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: isDone ? cat[1] : C.primaryLight, color: isDone ? "#fff" : cat[1], display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "calc(14px * var(--fsc,1))" }}>
                        {isDone ? "✓" : unitTypeIcon(u, i)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "calc(15px * var(--fsc,1))", fontWeight: isAct ? 700 : 500, color: isAct ? C.primary : C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.title}</div>
                        {u.duration && <div style={{ fontSize: "calc(12px * var(--fsc,1))", color: C.gray400 }}>⏱ {u.duration}</div>}
                      </div>
                      {isDone && <span style={{ color: C.green, fontSize: "calc(18px * var(--fsc,1))" }}>✅</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 互動網頁（HTML）單元 ───────────────────────────────────────────────────
// 以 iframe 顯示 R2 上的 HTML 內容（不下載、不使用 dangerouslySetInnerHTML）。
// sandbox="allow-scripts"：允許內嵌 JS 執行，但不給 allow-same-origin，避免內容存取上層頁面。
// 第一版不回傳測驗分數，只在使用者按下「完成本單元」時記錄 100% 完成 —— 但只有勾選
// 「計入課程進度」（track_progress === true）的單元才會顯示這顆按鈕；像 EAT-10 這種
// 自我評估／工具型 HTML（預設 track_progress = false），不顯示按鈕、不寫入
// unit_progress、可不限次數重複使用，分數只留在 HTML 本身，不會回傳平台。
function HtmlUnitPlayer({ unit, isMobile, completed, onComplete }) {
  const [busy, setBusy] = useState(false);
  const htmlUrl = unit.video_url; // 沿用單元的 video_url 欄位存放 HTML 內容的公開 URL（不建立新資料結構）
  const tracked = unit.track_progress === true;

  const go = async () => {
    setBusy(true);
    try { await onComplete(); } finally { setBusy(false); }
  };

  if (!htmlUrl) {
    return (
      <div style={{ borderRadius: 14, background: "#F3F4F6", padding: "48px 24px", textAlign: "center" }}>
        <div style={{ fontSize: "calc(52px * var(--fsc,1))", marginBottom: 12 }}>🌐</div>
        <div style={{ fontSize: "calc(16px * var(--fsc,1))", fontWeight: 700, color: C.gray700 }}>此互動單元尚未設定內容</div>
        <div style={{ fontSize: "calc(14px * var(--fsc,1))", color: C.gray600, marginTop: 6 }}>請至後台「課程管理」為此單元選擇已上架的 HTML 素材</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ width: "100%", overflowX: "hidden", background: "#fff" }}>
        <iframe
          src={htmlUrl}
          sandbox="allow-scripts"
          title={unit.title}
          style={{ width: "100%", height: isMobile ? "80vh" : 720, border: "none", display: "block" }}
        />
      </div>
      <div style={{ marginTop: 14, textAlign: "center" }}>
        {!tracked ? (
          <div style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600 }}>📋 此單元為自我評估／工具內容，可重複使用，不計入課程進度。</div>
        ) : completed ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: C.green, fontWeight: 700, fontSize: "calc(15px * var(--fsc,1))" }}>✅ 本單元已完成</div>
        ) : (
          <Btn onClick={go} disabled={busy}>{busy ? "處理中…" : "✅ 完成本單元"}</Btn>
        )}
      </div>
    </div>
  );
}

// ── 課程教材區塊（線上瀏覽）──────────────────────────────────────────────────
function MaterialsSection({ materials }) {
  const [previewing, setPreviewing] = useState({});
  const [imgError, setImgError] = useState({});
  const togglePreview = (id) => setPreviewing(p => ({ ...p, [id]: !p[id] }));
  // HTML 一律用共用的 isHtmlMaterial() 判斷（相容舊資料 file_type 可能不是 'html'），
  // 其餘類型仍照 file_type 分類。
  const typeIcon = (m) => isHtmlMaterial(m) ? "🌐" : ({ pdf: "📄", docx: "📝", doc: "📝", pptx: "📊", ppt: "📊", image: "🖼️", video: "🎬" }[m.file_type] || "📎");
  const canInline = (m) => isHtmlMaterial(m) || ["pdf", "image"].includes(m.file_type);
  const fmtSize = s => !s ? "" : s >= 1048576 ? `${(s / 1048576).toFixed(1)} MB` : s >= 1024 ? `${(s / 1024).toFixed(0)} KB` : `${s} B`;

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 18, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: 16 }}>
      <h3 style={{ fontWeight: 700, fontSize: "calc(17px * var(--fsc,1))", marginBottom: 12 }}>課程教材</h3>
      {(!materials || materials.length === 0)
        ? <div style={{ fontSize: "calc(14px * var(--fsc,1))", color: C.gray400 }}>本課程尚無教材</div>
        : materials.map(m => (
          <div key={m.id} style={{ marginBottom: 10, borderBottom: `1px solid ${C.gray100}`, paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: "calc(22px * var(--fsc,1))", flexShrink: 0 }}>{typeIcon(m)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "calc(14px * var(--fsc,1))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                {m.file_size > 0 && <div style={{ fontSize: "calc(12px * var(--fsc,1))", color: C.gray400 }}>{fmtSize(m.file_size)}</div>}
              </div>
              {canInline(m)
                ? <button onClick={() => togglePreview(m.id)} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: "calc(13px * var(--fsc,1))", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    {previewing[m.id] ? "收合" : "線上瀏覽"}
                  </button>
                : <a href={m.file_url} target="_blank" rel="noopener noreferrer" style={{ background: C.accent, color: "#fff", borderRadius: 8, padding: "6px 14px", fontSize: "calc(13px * var(--fsc,1))", fontWeight: 600, cursor: "pointer", flexShrink: 0, textDecoration: "none", whiteSpace: "nowrap" }}>
                    開啟教材
                  </a>
              }
            </div>
            {previewing[m.id] && m.file_url && (
              <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden" }}>
                {isHtmlMaterial(m)
                  ? <iframe src={m.file_url} style={{ width: "100%", height: 520, border: "none", borderRadius: 8, display: "block" }} title={m.title} sandbox="allow-scripts allow-same-origin" />
                  : m.file_type === "image"
                    ? imgError[m.id]
                      ? <div style={{ padding: 16, color: C.gray400, fontSize: "calc(13px * var(--fsc,1))" }}>圖片無法顯示，請稍後再試。</div>
                      : <img src={m.file_url} alt={m.title} style={{ maxWidth: "100%", borderRadius: 8, display: "block" }} onError={() => setImgError(e => ({ ...e, [m.id]: true }))} />
                    : <iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(m.file_url)}&embedded=true`} style={{ width: "100%", height: 480, border: "none", borderRadius: 8, display: "block" }} title={m.title} />
                }
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ── Drive URL 工具 ──────────────────────────────────────────────────────────
function isDriveUrl(url) { return url && url.includes("drive.google.com"); }
function drivePreviewUrl(url) {
  const m = url && url.match(/drive\.google\.com\/file\/d\/([^/?]+)/);
  return m ? `https://drive.google.com/file/d/${m[1]}/preview` : url;
}

// ── VideoPlayer（含 YouTube iframe API 進度追蹤 + HTML5 video）───────────────
function VideoPlayer({ unit, cat, isMobile, onProgress, onEnded, initialPosition = 0, isAdminPreview }) {
  const ytRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const timerRef = useRef(null);
  const videoRef = useRef(null);
  const initPosRef = useRef(initialPosition);
  initPosRef.current = initialPosition;
  // 用 ref 持有最新回呼，避免回呼變化觸發 YouTube player 重建
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;

  const h = isMobile ? 210 : 360;

  // YouTube: 在每次 unit 改變時初始化 player
  useEffect(() => {
    const _isYtUrl = /youtube\.com|youtu\.be/.test(unit?.video_url || "");
    const _isYtSrc = unit?.source_type === "youtube" || unit?.video_kind === "youtube" || _isYtUrl;
    if (!unit || !_isYtSrc || !unit.video_url) return;

    // 支援 watch?v=, youtu.be/, embed/, shorts/ 格式
    const videoId = (unit.video_url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/) || [])[1];
    if (!videoId) return;

    clearInterval(timerRef.current);
    const unitId = unit.id; // 捕捉 unitId 至閉包，避免 unit 物件變化影響回呼

    const initPlayer = () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (_) {}
        ytPlayerRef.current = null;
      }
      if (!ytRef.current) return;
      // YT.Player 會把 target 元素從 DOM 移除並換成 iframe，導致 ytRef.current 成為
      // detached 節點。改用 ytRef.current 當穩定外層容器（React 管理），每次建立
      // 一個新的內層 div 給 YT 取代，讓外層 ref 永遠有效。
      ytRef.current.innerHTML = "";
      const target = document.createElement("div");
      ytRef.current.appendChild(target);
      ytPlayerRef.current = new window.YT.Player(target, {
        videoId,
        width: "100%",
        height: h,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: (event) => {
            const pos = initPosRef.current;
            if (pos > 5) event.target.seekTo(pos, true);
          },
          onStateChange: (event) => {
            const p = ytPlayerRef.current;
            if (!p) return;
            // 暫停(2) 或結束(0) 時立即儲存
            if (event.data === 0 || event.data === 2) {
              try {
                const pos = Math.round(p.getCurrentTime() || 0);
                const dur = Math.round(p.getDuration() || 0);
                const pct = dur > 0 ? Math.min(100, Math.round(pos / dur * 100)) : 0;
                if (dur > 0 && onProgressRef.current) onProgressRef.current(unitId, pct, pos, dur);
                // 真正結束時才顯示完成提示
                if (event.data === 0 && onEndedRef.current) onEndedRef.current(unitId);
              } catch (_) {}
            }
            // 開始播放(1) 時啟動 5 秒輪詢
            if (event.data === 1) {
              clearInterval(timerRef.current);
              timerRef.current = setInterval(() => {
                const pl = ytPlayerRef.current;
                if (!pl) return;
                try {
                  const pos = Math.round(pl.getCurrentTime() || 0);
                  const dur = Math.round(pl.getDuration() || 0);
                  const pct = dur > 0 ? Math.min(100, Math.round(pos / dur * 100)) : 0;
                  if (dur > 0 && onProgressRef.current) onProgressRef.current(unitId, pct, pos, dur);
                } catch (_) {}
              }, 5000);
            } else {
              clearInterval(timerRef.current);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === "function") prev();
        initPlayer();
      };
      if (!document.querySelector("script[src*='youtube.com/iframe_api']")) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    }

    return () => {
      clearInterval(timerRef.current);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (_) {}
        ytPlayerRef.current = null;
      }
    };
  }, [unit?.id, h]); // eslint-disable-line react-hooks/exhaustive-deps
  // onProgress 移出 deps，改由 onProgressRef 存取，避免 onProgress 改變時重建 player

  // HTML5 video: 追蹤 timeupdate
  useEffect(() => {
    const el = videoRef.current;
    const _isHtml5Yt = /youtube.com|youtu.be/.test(unit?.video_url || "");
    const _isHtml5Drive = unit?.source_type === "google_drive_iframe" || unit?.video_kind === "drive" || isDriveUrl(unit?.video_url || "");
    if (!el || !unit || unit.video_kind === "youtube" || unit.source_type === "youtube" || _isHtml5Yt || _isHtml5Drive) return;
    let lastSaved = 0;
    const save = () => {
      const dur = el.duration;
      if (!dur || isNaN(dur) || dur <= 0) return;
      const pos = Math.round(el.currentTime);
      const pct = Math.min(100, Math.round(el.currentTime / dur * 100));
      if (onProgress) onProgress(unit.id, pct, pos, Math.round(dur));
    };
    const handleTime = () => {
      const now = Date.now();
      if (now - lastSaved >= 10000) { lastSaved = now; save(); }
    };
    const handleEndedEvent = () => {
      save();
      if (onEndedRef.current) onEndedRef.current(unit.id);
    };
    el.addEventListener("timeupdate", handleTime);
    el.addEventListener("pause", save);
    el.addEventListener("ended", handleEndedEvent);
    return () => {
      el.removeEventListener("timeupdate", handleTime);
      el.removeEventListener("pause", save);
      el.removeEventListener("ended", handleEndedEvent);
    };
  }, [unit?.id, onProgress]); // eslint-disable-line react-hooks/exhaustive-deps

  // HTML5 video: 從上次播放位置繼續
  useEffect(() => {
    const el = videoRef.current;
    const _isSeekYt = /youtube.com|youtu.be/.test(unit?.video_url || "");
    const _isSeekDrive = unit?.source_type === "google_drive_iframe" || unit?.video_kind === "drive" || isDriveUrl(unit?.video_url || "");
    if (!el || !unit || unit.video_kind === "youtube" || unit.source_type === "youtube" || _isSeekYt || _isSeekDrive) return;
    const pos = initPosRef.current;
    if (pos > 5) {
      const doSeek = () => { el.currentTime = pos; };
      if (el.readyState >= 1) doSeek();
      else el.addEventListener("loadedmetadata", doSeek, { once: true });
    }
  }, [unit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!unit) return <div style={{ height: h, background: cat[0], display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}><div style={{ fontSize: "calc(48px * var(--fsc,1))" }}>🎬</div><div style={{ fontSize: "calc(15px * var(--fsc,1))", color: C.gray700 }}>尚無影片</div></div>;

  const _isYt = unit.source_type === "youtube" || unit.video_kind === "youtube" || /youtube.com|youtu.be/.test(unit.video_url || "");
  if (_isYt && unit.video_url) {
    return <div ref={ytRef} style={{ width: "100%", minHeight: h }} />;
  }

  const _isDrive = unit.source_type === "google_drive_iframe" || unit.video_kind === "drive" || isDriveUrl(unit.video_url || "");
  if (_isDrive && unit.video_url) {
    return (
      <div>
        <iframe src={drivePreviewUrl(unit.video_url)} width="100%" height={h} frameBorder="0" allow="autoplay" allowFullScreen style={{ display: "block", background: "#000" }} />
        <div style={{ padding: "10px 14px", background: C.gray100, borderTop: "1px solid " + C.gray200, fontSize: "calc(12px * var(--fsc,1))", color: C.gray600 }}>
          {isAdminPreview
            ? "⚠️ Google Drive preview iframe 不支援自動觀看進度追蹤。如需追蹤進度，請改用 Cloudflare R2、YouTube 或 mp4 直連。"
            : "ℹ️ 此影片來源暫不支援自動觀看進度紀錄。"}
        </div>
      </div>
    );
  }

  if (unit.video_url) {
    return <video ref={videoRef} src={unit.video_url} controls controlsList="nodownload" style={{ width: "100%", height: h, background: "#000", display: "block" }} />;
  }

  return <div style={{ height: h, background: cat[0], display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10 }}><div style={{ fontSize: "calc(52px * var(--fsc,1))" }}>🎬</div><div style={{ fontWeight: 700, fontSize: "calc(17px * var(--fsc,1))" }}>{unit.title}</div></div>;
}

// ── 測驗元件 ────────────────────────────────────────────────────────────────
function Quiz({ course, unitId, onDone, onBack, isMobile, showToast }) {
  const [qs, setQs] = useState(null);
  const [cur, setCur] = useState(0); const [sel, setSel] = useState(null); const [answers, setAnswers] = useState([]); const [result, setResult] = useState(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api.quizQuestions(course.id, unitId).then(({ questions }) => setQs(questions)).catch(() => setQs([])); }, [course.id, unitId]);
  if (!qs) return <div style={{ padding: 60, textAlign: "center", color: C.gray600 }}>載入測驗中…</div>;
  if (qs.length === 0) return <div style={{ maxWidth: 560, margin: "60px auto", textAlign: "center" }}><p style={{ color: C.gray600, fontSize: "calc(16px * var(--fsc,1))" }}>此測驗單元尚未開放，請稍後再試。</p><Btn onClick={onBack} style={{ marginTop: 16 }}>返回</Btn></div>;
  const next = async () => {
    const na = [...answers, sel]; setAnswers(na); setSel(null);
    if (cur < qs.length - 1) { setCur(cur + 1); return; }
    setBusy(true);
    try { const r = await api.submitQuiz({ courseId: course.id, unitId, answers: na }); setResult(r); }
    catch (e) { showToast(e.message, "error"); } finally { setBusy(false); }
  };
  if (result) {
    const OPTS = ["A", "B", "C", "D"];
    return (
      <div style={{ maxWidth: 640, margin: "40px auto", padding: isMobile ? "0 16px" : 0 }}>
        {/* 分數摘要 */}
        <div style={{ background: "#fff", borderRadius: 20, padding: isMobile ? 24 : 40, textAlign: "center", boxShadow: "0 8px 40px rgba(0,0,0,0.08)", marginBottom: 24 }}>
          <div style={{ fontSize: "calc(60px * var(--fsc,1))" }}>{result.passed ? "🎉" : "📚"}</div>
          <h2 style={{ fontSize: "calc(25px * var(--fsc,1))", fontWeight: 800, margin: "8px 0" }}>測驗完成！</h2>
          <div style={{ fontSize: "calc(60px * var(--fsc,1))", fontWeight: 900, color: result.passed ? C.green : C.orange }}>{result.score}</div>
          <p style={{ color: C.gray600, marginBottom: 8, fontSize: "calc(16px * var(--fsc,1))" }}>答對 {result.correct}/{result.total} 題</p>
          <p style={{ marginBottom: 24, fontWeight: 700, color: result.passed ? C.green : C.orange }}>{result.passed ? "恭喜通過！" : "未達 60 分，再加油！"}</p>
          <Btn onClick={onDone} size="lg">返回課程</Btn>
        </div>

        {/* 答題檢討 */}
        {result.review && result.review.length > 0 && (
          <div>
            <h3 style={{ fontWeight: 700, fontSize: "calc(17px * var(--fsc,1))", marginBottom: 12 }}>答題檢討</h3>
            {result.review.map((r, qi) => (
              <div key={qi} style={{ background: "#fff", borderRadius: 14, padding: isMobile ? 16 : 20, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: `4px solid ${r.isCorrect ? C.green : C.primary}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "flex-start" }}>
                  <span style={{ fontSize: "calc(13px * var(--fsc,1))", color: C.gray600 }}>第 {qi + 1} 題</span>
                  <span style={{ fontSize: "calc(13px * var(--fsc,1))", fontWeight: 700, color: r.isCorrect ? C.green : C.primary, background: r.isCorrect ? "#D1FAE5" : "#FDECEA", padding: "2px 10px", borderRadius: 999 }}>{r.isCorrect ? "✓ 答對" : "✗ 答錯"}</span>
                </div>
                <div style={{ fontWeight: 600, fontSize: "calc(15px * var(--fsc,1))", marginBottom: 12, lineHeight: 1.5 }}>{r.question}</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 6, marginBottom: 4 }}>
                  {(r.options || []).map((o, oi) => {
                    const isUser = r.userAnswer === oi;
                    const isCorr = r.correctAnswer === oi;
                    let bg = C.gray100, border = `1.5px solid ${C.gray200}`;
                    if (isCorr) { bg = "#D1FAE5"; border = `1.5px solid ${C.green}`; }
                    else if (isUser) { bg = "#FDECEA"; border = `1.5px solid ${C.primary}`; }
                    return (
                      <div key={oi} style={{ padding: "8px 12px", borderRadius: 8, fontSize: "calc(14px * var(--fsc,1))", background: bg, border, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, color: C.gray600, flexShrink: 0 }}>{OPTS[oi]}.</span>
                        <span style={{ flex: 1 }}>{o}</span>
                        {isCorr && <span style={{ color: C.green, fontSize: "calc(12px * var(--fsc,1))", fontWeight: 700, flexShrink: 0 }}>正確</span>}
                        {isUser && !isCorr && <span style={{ color: C.primary, fontSize: "calc(12px * var(--fsc,1))", fontWeight: 700, flexShrink: 0 }}>你的答案</span>}
                      </div>
                    );
                  })}
                </div>
                {r.explanation && (
                  <div style={{ background: "#FFFBEB", borderRadius: 8, padding: "8px 12px", borderLeft: `3px solid ${C.orange}`, fontSize: "calc(13px * var(--fsc,1))", color: C.gray700, marginTop: 10 }}>
                    💡 解析：{r.explanation}
                  </div>
                )}
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 20, marginBottom: 24 }}>
              <Btn onClick={onDone} size="lg">返回課程</Btn>
              <Btn variant="outline" size="lg" onClick={() => { setResult(null); setCur(0); setSel(null); setAnswers([]); }}>重新測驗</Btn>
            </div>
          </div>
        )}
      </div>
    );
  }
  const q = qs[cur];
  return (
    <div style={{ maxWidth: 560, margin: "40px auto", padding: isMobile ? "0 16px" : 0 }}>
      <Btn variant="ghost" size="sm" onClick={onBack} style={{ marginBottom: 16 }}>← 返回課程</Btn>
      <div style={{ background: "#fff", borderRadius: 20, padding: isMobile ? 20 : 36, boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: "calc(15px * var(--fsc,1))", color: C.gray600 }}><span>{course.title} · 測驗</span><span>{cur + 1} / {qs.length}</span></div>
        <ProgressBar pct={cur / qs.length * 100} />
        <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700, margin: "24px 0 20px", lineHeight: 1.5 }}>{q.question}</h2>
        {q.options.map((o, i) => <div key={i} onClick={() => setSel(i)} style={{ padding: "16px 18px", borderRadius: 12, cursor: "pointer", border: `2px solid ${sel === i ? C.primary : C.gray200}`, background: sel === i ? C.primaryLight : "#fff", marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, border: `2px solid ${sel === i ? C.primary : C.gray200}`, background: sel === i ? C.primary : "transparent", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{sel === i ? "✓" : String.fromCharCode(65 + i)}</div><span style={{ fontSize: "calc(16px * var(--fsc,1))" }}>{o}</span></div>)}
        <Btn full size="lg" disabled={sel === null || busy} onClick={next} style={{ marginTop: 20 }}>{busy ? "送出中…" : cur < qs.length - 1 ? "下一題 →" : "提交答案"}</Btn>
      </div>
    </div>
  );
}

function About({ setPage, isMobile, user }) {
  return (
    <div style={{ maxWidth: 720, margin: "60px auto", padding: "0 20px", textAlign: "center" }}>
      <div style={{ fontSize: "calc(60px * var(--fsc,1))", marginBottom: 16 }}>🍽️</div>
      <h2 style={{ fontSize: isMobile ? 27 : 33, fontWeight: 800, marginBottom: 14 }}>關於{SITE.name}</h2>
      <p style={{ fontSize: "calc(17px * var(--fsc,1))", color: C.gray600, lineHeight: 1.9 }}>本平台為醫院長照衛教教學前期試辦，提供腦中風後吞嚥困難照護、吞嚥訓練與飲食質地調整等課程，協助長照家屬與照護者學習正確的進食照護知識，預防嗆咳與吸入性肺炎。本平台僅提供衛教學習，不涉及任何病歷、診斷或健康評估資料。</p>
      <Btn size="lg" style={{ marginTop: 32 }} onClick={() => setPage(user ? "courses" : "login")}>{user ? "前往課程專區 →" : "登入開始學習 →"}</Btn>
      <div style={{ marginTop: 40, fontSize: "calc(14px * var(--fsc,1))" }}><Link href="/privacy" style={{ color: C.gray400 }}>隱私權政策</Link></div>
    </div>
  );
}
