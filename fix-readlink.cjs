// Node.js 24 on Windows returns EISDIR from fs.readlink for regular directories
// instead of EINVAL. Webpack/enhanced-resolve and @vercel/nft treat EINVAL as
// "not a symlink" (expected) but crash on EISDIR. Patch all readlink forms
// before any module loads.
"use strict";
const fs = require("fs");

// Callback form
const orig = fs.readlink.bind(fs);
fs.readlink = function readlink(path, options, cb) {
  if (typeof options === "function") { cb = options; options = null; }
  function done(err, result) { if (err && err.code === "EISDIR") err.code = "EINVAL"; cb(err, result); }
  options ? orig(path, options, done) : orig(path, done);
};

// Sync form
const origSync = fs.readlinkSync.bind(fs);
fs.readlinkSync = function readlinkSync(path, options) {
  try { return options ? origSync(path, options) : origSync(path); }
  catch (err) { if (err && err.code === "EISDIR") err.code = "EINVAL"; throw err; }
};

// Promise form (used by @vercel/nft in collect-build-traces)
const origPromise = fs.promises.readlink.bind(fs.promises);
fs.promises.readlink = function readlinkPromise(path, options) {
  return (options ? origPromise(path, options) : origPromise(path)).catch(
    (err) => { if (err && err.code === "EISDIR") err.code = "EINVAL"; throw err; }
  );
};
