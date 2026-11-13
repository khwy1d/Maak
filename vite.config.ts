import { createHash } from "node:crypto";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { publicSeoPages } from "./src/config/seo";

type Locale = "ar" | "en";
const siteUrl = "https://maaktravel.vercel.app";
const serviceKeys = new Set(["flight", "bus", "hotel", "security", "umrah", "medical", "car", "tourism", "realEstate"]);

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function replaceMeta(html: string, attribute: "name" | "property", key: string, value: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const tag = new RegExp(`<meta\\s+${attribute}="${escapedKey}"\\s+content="[^"]*"\\s*\\/?>`, "i");
  const replacement = `<meta ${attribute}="${key}" content="${escapeHtml(value)}" />`;
  return tag.test(html) ? html.replace(tag, replacement) : html.replace("</head>", `  ${replacement}\\n  </head>`);
}

function localizedPrerender(): Plugin {
  return {
    name: "maak-localized-prerender",
    apply: "build",
    generateBundle: {
      order: "post",
      handler(_options, bundle) {
      const index = bundle["index.html"];
      if (!index || index.type !== "asset") throw new Error("MAAK prerender: built index.html asset is missing.");
      const template = typeof index.source === "string" ? index.source : new TextDecoder().decode(index.source);
      for (const page of publicSeoPages) {
        for (const lang of ["ar", "en"] as const satisfies readonly Locale[]) {
          const [title, description] = page[lang];
          const localized = `/${lang}${page.path === "/" ? "" : page.path}`;
          const canonical = `${siteUrl}${localized}`;
          const alternateAr = `${siteUrl}/ar${page.path === "/" ? "" : page.path}`;
          const alternateEn = `${siteUrl}/en${page.path === "/" ? "" : page.path}`;
          let html = template
            .replace(/<html[^>]*>/i, `<html lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}">`)
            .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);
          html = replaceMeta(html, "name", "description", description);
          html = replaceMeta(html, "name", "robots", "index, follow, max-image-preview:large");
          html = replaceMeta(html, "property", "og:title", title);
          html = replaceMeta(html, "property", "og:description", description);
          html = replaceMeta(html, "property", "og:url", canonical);
          html = replaceMeta(html, "property", "og:locale", lang === "ar" ? "ar_AR" : "en_US");
          html = replaceMeta(html, "name", "twitter:title", title);
          html = replaceMeta(html, "name", "twitter:description", description);
          html = html.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`);
          html = html.replace(/<link\s+rel="alternate"\s+hreflang="(?:ar|en|x-default)"[^>]*>\s*/gi, "");
          const alternates = [
            `<link rel="alternate" hreflang="ar" href="${alternateAr}" />`,
            `<link rel="alternate" hreflang="en" href="${alternateEn}" />`,
            `<link rel="alternate" hreflang="x-default" href="${alternateAr}" />`,
          ].join("\n    ");
          html = html.replace("</head>", `    ${alternates}\n  </head>`);
          const nav = publicSeoPages.map((item) => {
            const itemPath = `/${lang}${item.path === "/" ? "" : item.path}`;
            const label = item[lang][0];
            return `<a href="${itemPath}">${escapeHtml(label)}</a>`;
          }).join(" ");
          const staticContent = `<main class="seo-prerender" lang="${lang}" dir="${lang === "ar" ? "rtl" : "ltr"}"><h1>${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p><nav aria-label="${lang === "ar" ? "صفحات الموقع" : "Site pages"}">${nav}</nav></main>`;
          html = html.replace('<div id="root"></div>', `<div id="root">${staticContent}</div>`);
          if (serviceKeys.has(page.key)) {
            const schema = {
              "@context": "https://schema.org",
              "@type": "Service",
              name: title,
              description,
              provider: { "@id": `${siteUrl}/#organization` },
              areaServed: ["Yemen", "Saudi Arabia", "Egypt"],
              availableChannel: { "@type": "ServiceChannel", serviceUrl: canonical },
            };
            html = html.replace("</head>", `    <script id="maak-page-schema" type="application/ld+json">${JSON.stringify(schema)}</script>\n  </head>`);
          }
          const fileName = `${lang}${page.path === "/" ? "/index.html" : `${page.path}/index.html`}`;
          this.emitFile({ type: "asset", fileName, source: html });
        }
      }
      },
    },
  };
}

function generatedServiceWorker(): Plugin {
  return {
    name: "maak-generated-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const precache = Object.keys(bundle)
        .filter((file) => file.startsWith("assets/") && /\.(?:js|css|woff2?|svg|png|webp|avif)$/.test(file) &&
          (bundle[file].type === "asset" || (bundle[file].type === "chunk" && bundle[file].code.trim().length > 0)))
        .map((file) => `/${file}`);
      const shell = [
        "/", "/index.html", "/ar/index.html", "/en/index.html",
        "/manifest.webmanifest", "/favicon.ico", "/favicon-96x96.png",
        "/apple-touch-icon.png", "/maak-pwa-icon.svg",
        "/web-app-manifest-192x192.png", "/web-app-manifest-512x512.png",
        ...precache,
      ];
      const version = createHash("sha256").update(precache.join("\n")).digest("hex").slice(0, 16);
      const source = [
        'const CACHE_PREFIX = "maak-shell-";',
        `const CACHE_NAME = CACHE_PREFIX + ${JSON.stringify(version)};`,
        `const APP_SHELL = ${JSON.stringify([...new Set(shell)])};`,
        'self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())); });',
        'self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });',
        'self.addEventListener("fetch", (event) => { const request = event.request; const url = new URL(request.url); if (request.method !== "GET" || url.origin !== self.location.origin) return; if (request.mode === "navigate") { event.respondWith(fetch(request).then((response) => { if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put("/index.html", response.clone())); return response; }).catch(async () => (await caches.match(request)) || (await caches.match("/index.html")))); return; } event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => { if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone())); return response; }))); });',
      ].join("\n");
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  plugins: [react(), localizedPrerender(), generatedServiceWorker()],
});
