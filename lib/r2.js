// lib/r2.js — Cloudflare R2 共用工具（只在 server-side 使用）
// R2_SECRET_ACCESS_KEY 永遠不可出現在前端 bundle
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** 讀取 R2 設定（不暴露 secret 至回傳值） */
export function getR2Config() {
  const accountId       = process.env.R2_ACCOUNT_ID;
  const accessKeyId     = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket          = process.env.R2_BUCKET_NAME;
  const publicBase      = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const ready = !!(accountId && accessKeyId && secretAccessKey && bucket && publicBase);
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBase, ready };
}

/** 建立 S3-compatible R2 client */
export function getR2Client() {
  const { accountId, accessKeyId, secretAccessKey, ready } = getR2Config();
  if (!ready) return null;
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

/**
 * 依上傳類型產生安全的 R2 object key（不含中文）
 * @param {"video"|"material"|"banner"|"home-card"} type
 * @param {{ courseId?, unitId?, filename? }} opts
 */
export function makeR2Key(type, opts = {}) {
  const { courseId = "misc", unitId, filename = "file" } = opts;
  const rawExt = String(filename).split(".").pop() || "bin";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  switch (type) {
    case "video":
      return unitId
        ? `videos/${courseId}/${unitId}/${uid}.${ext}`
        : `videos/${courseId}/${uid}.${ext}`;
    case "material":
      return courseId && courseId !== "misc"
        ? `materials/${courseId}/${unitId ? unitId + "/" : ""}${uid}.${ext}`
        : `materials/general/${uid}.${ext}`;
    case "banner":
      return `banners/${uid}.${ext}`;
    case "home-card":
      return `home-cards/${uid}.${ext}`;
    default:
      return `uploads/${uid}.${ext}`;
  }
}

/** 副檔名 → MIME type */
export function guessMime(ext) {
  const map = {
    mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", m4v: "video/mp4",
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
    html: "text/html; charset=utf-8", htm: "text/html; charset=utf-8",
  };
  return map[String(ext).toLowerCase()] || "application/octet-stream";
}

/**
 * 刪除 R2 Object
 * @param {string} key — object key（e.g. "materials/xxx/yyy.mp4"）
 */
export async function deleteR2Object(key) {
  const r2 = getR2Client();
  if (!r2) throw new Error("R2 client 未設定，請確認環境變數");
  const { bucket } = getR2Config();
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * 產生 presigned PUT URL 並回傳公開 URL + key
 * @returns {{ uploadUrl, publicUrl, key }} | null（R2 未設定時）
 */
export async function createPresignedPut({ key, contentType, expiresIn = 3600 }) {
  const r2 = getR2Client();
  if (!r2) return null;
  const { bucket, publicBase } = getR2Config();
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const uploadUrl = await getSignedUrl(r2, command, { expiresIn });
  return { uploadUrl, publicUrl: `${publicBase}/${key}`, key };
}
