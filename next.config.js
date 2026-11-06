// Node.js 24 on Windows changed fs.readlink to return EISDIR for regular
// directories instead of EINVAL. Webpack expects EINVAL to mean "not a
// symlink"; EISDIR causes a fatal build error. Patch readlink before
// webpack is loaded so the signal is what webpack was written to handle.
const fs = require("fs");
const _origReadlink = fs.readlink.bind(fs);
fs.readlink = function (path, options, callback) {
  if (typeof options === "function") { callback = options; options = null; }
  (options ? _origReadlink(path, options, fix) : _origReadlink(path, fix));
  function fix(err, result) {
    if (err && err.code === "EISDIR") err.code = "EINVAL";
    callback(err, result);
  }
};
const _origReadlinkSync = fs.readlinkSync.bind(fs);
fs.readlinkSync = function (path, options) {
  try { return options ? _origReadlinkSync(path, options) : _origReadlinkSync(path); }
  catch (err) { if (err && err.code === "EISDIR") err.code = "EINVAL"; throw err; }
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 允許從 Supabase Storage 與 YouTube 載入圖片/影片縮圖
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  // Node.js 24 + webpack 5 on Windows: fs.readlink on regular files returns
  // EISDIR instead of EINVAL, crashing enhanced-resolve. Disable symlink
  // resolution to avoid the readlink call entirely.
  webpack(config) {
    config.resolve.symlinks = false;
    return config;
  },
};
module.exports = nextConfig;
