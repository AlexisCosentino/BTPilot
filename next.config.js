// PWA config via next-pwa: offline-first, caches static assets, disabled in dev.
const runtimeCaching = require("next-pwa/cache");
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching
});

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

module.exports = withPWA(nextConfig);
