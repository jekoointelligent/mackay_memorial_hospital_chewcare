# Cloudflare R2 設定指南

## 費用說明

- **無 egress 費**：前台播放影片不收對外傳輸費
- 免費額度（每月）：10 GB storage、1M Class A operations、10M Class B operations
- 詳見 [Cloudflare R2 定價](https://www.cloudflare.com/developer-platform/r2/)

---

## 一、建立 R2 Bucket

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左側選單 → **R2 Object Storage**
3. 點 **Create bucket**
4. Bucket name 建議：`chewcare-media`（只能用小寫英文、數字、連字號）
5. Location：選 **Automatic** 或 `APAC`（亞太區）

---

## 二、設定 Public Access（Public URL）

1. 進入 bucket → **Settings**
2. 找到 **Public access** → **R2.dev subdomain** → 點 **Allow Access**
3. 記下產生的 URL，格式為：
   ```
   https://pub-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.r2.dev
   ```
   這就是 `R2_PUBLIC_BASE_URL`

> 若有自訂網域，可在 **Custom Domains** 設定，設定完成後改用自訂網域作為 `R2_PUBLIC_BASE_URL`。

---

## 三、建立 API Token

1. 進入 bucket → **Settings** → **R2 API Tokens** → **Create API token**（或從帳號頁面建立）
2. 設定：
   - **Token name**：`chewcare-upload`
   - **Permissions**：Object Read & Write
   - **Specify bucket**：選你的 bucket（不要給 All buckets）
3. 點 **Create API Token**
4. 記下：
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`（只顯示一次，請立即儲存）
5. 你的 Cloudflare **Account ID** 在帳號右側欄 → `R2_ACCOUNT_ID`

---

## 四、設定 CORS

1. 進入 bucket → **Settings** → **CORS Policy**
2. 貼上以下 JSON（替換你的正式網域）：

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://你的正式網域.com"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

> CORS 設定完成後才能從瀏覽器直接 PUT 上傳檔案。若上傳時出現 CORS 錯誤，請確認 `AllowedOrigins` 包含目前的網域。

---

## 五、環境變數填入

將以下值填入 `.env.local`（本機）或 Render 環境變數（正式）：

```
R2_ACCOUNT_ID=         # Cloudflare Account ID
R2_ACCESS_KEY_ID=      # API Token Access Key
R2_SECRET_ACCESS_KEY=  # API Token Secret（機密！）
R2_BUCKET_NAME=        # bucket 名稱，例如 chewcare-media
R2_PUBLIC_BASE_URL=    # 公開 URL，例如 https://pub-xxx.r2.dev
```

---

## 六、驗證設定

在後台登入後，進入後台任意頁面，後台 Header 工具列旁若顯示 R2 狀態綠燈即代表設定正確。  
或呼叫 API：
```
GET /api/admin/r2-status
```
回傳 `{ configured: true }` 代表設定完整。

---

## 安全注意事項

- `R2_SECRET_ACCESS_KEY` 只在 Next.js server-side 使用（`lib/r2.js`）
- 絕不可放入 `NEXT_PUBLIC_` 前綴變數
- 絕不可 commit 到 GitHub（`.env.local` 已在 `.gitignore`）
- API Token 的 scope 只給指定 bucket，不要給 All buckets 的 Write 權限

---

## R2 Object 路徑說明

| 類型 | 路徑格式 |
|------|----------|
| 課程影片 | `videos/{courseId}/{unitId}/{ts}-{uuid}.{ext}` |
| 素材（含影片） | `materials/{courseId}/{unitId?}/{ts}-{uuid}.{ext}` |
| Banner 圖片 | `banners/{ts}-{uuid}.{ext}` |
| 首頁卡片圖 | `home-cards/{ts}-{uuid}.{ext}` |

路徑不含中文，確保所有 R2 object key 為 ASCII。
