import { createHash } from "node:crypto";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function generatedServiceWorker(): Plugin {
  return {
    name: "maak-generated-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const precache = Object.keys(bundle)
        .filter((file) => file.startsWith("assets/") && /\.(?:js|css|woff2?|svg|png|webp|avif)$/.test(file) && (bundle[file].type === "asset" || (bundle[file].type === "chunk" && bundle[file].code.trim().length > 0)))
        .map((file) => `/${file}`);
      const shell = [
        "/", "/index.html", "/manifest.webmanifest", "/favicon.ico",
        "/favicon-96x96.png", "/apple-touch-icon.png", "/maak-pwa-icon.svg",
        "/web-app-manifest-192x192.png", "/web-app-manifest-512x512.png",
        ...precache,
      ];
      const version = createHash("sha256").update(precache.join("\n")).digest("hex").slice(0, 16);
      const source = `const CACHE_PREFIX = "maak-shell-";\nconst CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(version)};\nconst APP_SHELL = ${JSON.stringify([...new Set(shell)])};\n\nself.addEventListener("install", (event) => {\n  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));\n});\n\nself.addEventListener("activate", (event) => {\n  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));\n});\n\nself.addEventListener("fetch", (event) => {\n  const request = event.request;\n  const url = new URL(request.url);\n  if (request.method !== "GET" || url.origin !== self.location.origin) return;\n  if (request.mode === "navigate") {\n    event.respondWith(fetch(request).then((response) => { if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", response.clone())); return response; }).catch(async ()...[truncated]