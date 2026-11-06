// lib/unitProgress.js — 判斷一個單元是否要計入「課程學習進度」的分母
// 純函式、不碰資料庫，server（lib/progress.js）與瀏覽器端（pages/index.js）都直接
// import 這一份規則，避免課程進度計算邏輯各自維護一套、彼此漂移。
//
// 規則：
//   - 影片、測驗（含沒有 type 欄位的舊資料）：一律計入，維持原本行為。
//   - 互動網頁（interactive_html）：只有 track_progress === true 才計入。
//     預設 false ——自我評估／工具型內容（例如 EAT-10），可不限次數重複使用，
//     不能只因為 type === "interactive_html" 就被算進分母。
//   - 其他類型（text 等）：不計入，維持原本行為。
export function isProgressCountedUnit(u) {
  if (!u) return false;
  if (!u.type || u.type === "video" || u.type === "quiz") return true;
  if (u.type === "interactive_html") return u.track_progress === true;
  return false;
}
