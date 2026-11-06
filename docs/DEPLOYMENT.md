# Render 部署指南

## 部署前準備

完成以下步驟再進行 Render 部署：

- [ ] GitHub repo 已建立並推送程式碼
- [ ] Supabase 專案已建立
- [ ] `supabase/schema_production.sql` 已執行
- [ ] Cloudflare R2 bucket 已建立（見 [R2_SETUP.md](R2_SETUP.md)）
- [ ] R2 Public URL 或 custom domain 已設定
- [ ] R2 CORS 已設定
- [ ] `.env.example` 所有變數均已備齊真實值

---

## 一、在 Render 建立 Web Service

1. 前往 [https://render.com](https://render.com) → **New → Web Service**
2. 連接 GitHub 帳號 → 選擇此 repo
3. 填入以下設定：

| 項目 | 值 |
|------|-----|
| **Name** | `chewcare-platform`（自訂）|
| **Environment** | Node |
| **Root Directory** | 若 repo 根目錄就是 `chewcare/`，留空；若有外層資料夾，填入相對路徑 |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |
| **Plan** | Starter（最低方案即可）|

---

## 二、設定環境變數

在 Render 服務頁面 → **Environment** → 逐一新增以下變數：

| 變數名稱 | 說明 |
|---------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key（機密）|
| `SESSION_SECRET` | HMAC 簽章密鑰（隨機 32 bytes hex）|
| `ADMIN_EMAIL` | 初始管理員 Email |
| `ADMIN_PASSWORD` | 初始管理員密碼 |
| `R2_ACCOUNT_ID` | Cloudflare Account ID |
| `R2_ACCESS_KEY_ID` | R2 API Token Access Key |
| `R2_SECRET_ACCESS_KEY` | R2 API Token Secret（機密）|
| `R2_BUCKET_NAME` | R2 bucket 名稱 |
| `R2_PUBLIC_BASE_URL` | R2 公開播放 URL |
| `NODE_VERSION` | `20`（建議指定，避免版本不穩）|

> **注意**：`SUPABASE_SERVICE_ROLE_KEY` 與 `R2_SECRET_ACCESS_KEY` 是機密，Render Environment Variables 預設為加密儲存，不會顯示在 logs 中。

---

## 三、Node 版本設定

在 Environment Variables 加入：
```
NODE_VERSION = 20
```

或在 `package.json` 的 `engines` 欄位指定：
```json
"engines": { "node": ">=20" }
```

---

## 四、Auto Deploy 設定

Render 預設會在 `git push` 到主要分支時自動重新部署。  
可在 **Settings → Build & Deploy → Auto Deploy** 確認已開啟。

---

## 五、部署後測試

部署完成後，依序確認：

- [ ] 首頁（`/`）可正常開啟
- [ ] 一般使用者可在 `/` 以 login_code 登入
- [ ] 管理員可在 `/platform` 登入後台
- [ ] 後台課程管理可開啟
- [ ] 素材上傳可成功上傳到 R2
- [ ] 課程影片可正常播放
- [ ] 影片觀看進度可寫入 Supabase
- [ ] 測驗可作答並顯示答題檢討
- [ ] 課程專區與個人頁進度同步
- [ ] `/api/admin/overview`（未授權）回傳 403

---

## 六、自訂網域（選用）

在 Render 服務頁面 → **Settings → Custom Domains** 輸入你的網域，依指示設定 DNS。

設定自訂網域後，記得更新：
- R2 CORS 的 `AllowedOrigins` 加入正式網域
- Supabase Dashboard → Auth → URL Configuration 加入正式網域（若有用到 Supabase Auth）

---

## 七、故障排除

| 問題 | 可能原因 |
|------|---------|
| Build 失敗 | Node 版本不符，確認 `NODE_VERSION=20` |
| `/api/admin/*` 回 401 | `SESSION_SECRET` 未設定或設錯 |
| R2 上傳失敗 | CORS 未設定，或 `R2_SECRET_ACCESS_KEY` 錯誤 |
| 資料庫錯誤 | `SUPABASE_SERVICE_ROLE_KEY` 未設定，或 schema 未執行 |
| 首頁空白 | `NEXT_PUBLIC_SUPABASE_URL` 或 `ANON_KEY` 未設定 |
