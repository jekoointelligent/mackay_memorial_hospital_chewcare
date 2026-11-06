import Head from "next/head";
import Link from "next/link";
import { SITE } from "../lib/siteConfig";

export default function Privacy() {
  return (
    <>
      <Head><title>隱私權政策 — {SITE.name}</title></Head>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 24px", lineHeight: 1.9, color: "#374151", fontFamily: "'Noto Sans TC',sans-serif" }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, color: "#1A1A2E", marginBottom: 20 }}>隱私權政策</h1>
        <p style={{ color: "#9CA3AF", marginBottom: 28 }}>最後更新：2025 年</p>

        <h2 style={h2}>一、我們蒐集的資料</h2>
        <p>本平台為提供衛教學習服務，僅蒐集下列必要資料：姓名、手機號碼（作為登入序號）、所屬單位、以及您的課程學習進度與測驗成績。本平台<strong>不蒐集任何病歷、診斷或個人健康狀況等敏感醫療資料</strong>。</p>

        <h2 style={h2}>二、資料使用目的</h2>
        <p>您的資料僅用於：身分識別與登入、記錄與顯示學習進度、提供學習成效統計給衛教單位。我們不會將您的資料用於上述以外目的，亦不會販售或提供給第三方。</p>

        <h2 style={h2}>三、資料保護措施</h2>
        <p>本平台採用 HTTPS 加密傳輸，登入狀態以加密 Cookie 保存。系統保留登入與操作稽核紀錄，僅供管理稽核之用。我們依個人資料保護法規範保護您的資料安全。</p>

        <h2 style={h2}>四、您的權利</h2>
        <p>您得隨時向衛教單位申請查詢、更正或刪除您的個人資料。如需協助，請聯絡所屬衛生所或本平台管理單位。</p>

        <h2 style={h2}>五、Cookie 使用</h2>
        <p>本平台使用必要性 Cookie 維持您的登入狀態，不使用第三方廣告追蹤 Cookie。</p>

        <p style={{ marginTop: 40 }}><Link href="/" style={{ color: "#E8392A", fontWeight: 700 }}>← 返回首頁</Link></p>
      </div>
    </>
  );
}
const h2 = { fontSize: 19, fontWeight: 700, color: "#1A1A2E", margin: "28px 0 10px" };
