import { lazy, Suspense, useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useApp } from "./context/AppContext";
import Header from "./components/Header";
import MobileHeader from "./components/MobileHeader";
import MobileDock from "./components/MobileDock";
import Hero from "./components/Hero";
import GlassBackground from "./components/GlassBackground";
import InquiryCapture from "./components/InquiryCapture";
import { getReferralCode } from "./lib/supabase";
import { getSeoPage, localizedPath } from "./config/seo";

const Services = lazy(() => import("./components/Services"));
const Pages = lazy(() => import("./components/Pages"));
const Account = lazy(() => import("./components/Account"));
const SocialFollow = lazy(() => import("./components/SocialFollow"));
const About = lazy(() => import("./components/Sections").then((module) => ({ default: module.About })));
const How = lazy(() => import("./components/Sections").then((module) => ({ default: module.How })));
const Why = lazy(() => import("./components/Sections").then((module) => ({ default: module.Why })));
const Footer = lazy(() => import("./components/Sections").then((module) => ({ default: module.Footer })));

function currentPath() {
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const path = pathname.replace(/^\/(?:ar|en)(?=\/|$)/, "") || "/";
  return path;
}

export default function App() {
  const [path, setPath] = useState(currentPath);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const { t, lang } = useApp();
  useEffect(() => {
    getReferralCode();
  }, []);

  useEffect(() => {
    const sync = () => { setPath(currentPath()); window.scrollTo(0, 0); };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  useEffect(() => {
    const wasDismissed = () => {
      try { return sessionStorage.getItem("maak-install-dismissed") === "1"; }
      catch { return false; }
    };
    setInstallDismissed(wasDismissed());
    const onInstallAvailable = (event: Event) => {
      event.preventDefault();
      if (!wasDismissed()) setInstallPrompt(event);
    };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onInstallAvailable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstallAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);


  // Normalize old unprefixed links and keep in-app navigation language-specific.
  useEffect(() => {
    const localePrefix = window.location.pathname.match(/^\/(ar|en)(?:\/|$)/)?.[1];
    if (!localePrefix) {
      const localized = localizedPath(window.location.pathname, lang);
      window.history.replaceState({}, "", `${localized}${window.location.search}${window.location.hash}`);
      setPath(currentPath());
    }
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || /^\/(ar|en)(\/|$)/.test(url.pathname)) return;
      event.preventDefault();
      const next = localizedPath(url.pathname, lang);
      window.history.pushState({}, "", `${next}${url.search}${url.hash}`);
      setPath(currentPath());
      window.scrollTo(0, 0);
    };
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, [lang]);

  useEffect(() => {
    const page = getSeoPage(path);
    const title = page ? page[lang][0] : (lang === "ar" ? "الصفحة غير موجودة | معك" : "Page not found | MAAK");
    const description = page ? page[lang][1] : (lang === "ar" ? "لم نعثر على الصفحة المطلوبة." : "The requested page could not be found.");
    const canonicalUrl = `${window.location.origin}${localizedPath(path, lang)}`;
    document.title = title;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    const setMeta = (selector: string, value: string) => document.querySelector(selector)?.setAttribute("content", value);
    setMeta('meta[name="description"]', description);
    setMeta('meta[name="robots"]', page ? "index, follow, max-image-preview:large" : "noindex, nofollow");
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:url"]', canonicalUrl);
    setMeta('meta[property="og:locale"]', lang === "ar" ? "ar_AR" : "en_US");
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', description);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;
    (["ar", "en"] as const).forEach((locale) => {
      let alternate = document.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${locale}"]`);
      if (!alternate) { alternate = document.createElement("link"); alternate.rel = "alternate"; alternate.hreflang = locale; document.head.appendChild(alternate); }
      alternate.href = `${window.location.origin}${localizedPath(path, locale)}`;
    });
    let xDefault = document.querySelector<HTMLLinkElement>('link[rel="alternate"][hreflang="x-default"]');
    if (!xDefault) { xDefault = document.createElement("link"); xDefault.rel = "alternate"; xDefault.hreflang = "x-default"; document.head.appendChild(xDefault); }
    xDefault.href = `${window.location.origin}/ar${path === "/" ? "" : path}`;
    let pageSchema = document.querySelector<HTMLScriptElement>("#maak-page-schema");
    const serviceKeys = ["flight", "bus", "hotel", "security", "umrah", "medical", "car", "tourism", "realEstate"];
    if (page && serviceKeys.includes(page.key)) {
      if (!pageSchema) { pageSchema = document.createElement("script"); pageSchema.id = "maak-page-schema"; pageSchema.type = "application/ld+json"; document.head.appendChild(pageSchema); }
      pageSchema.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Service",
        "name": title,
        "description": description,
        "provider": { "@id": "https://maaktravel.vercel.app/#organization" },
        "areaServed": ["Yemen", "Saudi Arabia", "Egypt"],
        "availableChannel": { "@type": "ServiceChannel", "serviceUrl": canonicalUrl }
      });
    } else {
      pageSchema?.remove();
    }
  }, [path, lang]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await (installPrompt as any).prompt();
    setInstallPrompt(null);
  };
  const dismissInstall = () => {
    setInstallDismissed(true);
    setInstallPrompt(null);
    try { sessionStorage.setItem("maak-install-dismissed", "1"); } catch { /* storage may be unavailable */ }
  };

  const isHome = path === "/";
  return (
    <>
      <GlassBackground />
      <div className="site-content">
      <Header />
      <MobileHeader />
      <InquiryCapture lang={lang} />
      {installPrompt && !installDismissed && (
        <aside className="pwa-install-prompt" aria-label={lang === "ar" ? "تثبيت تطبيق معك" : "Install MAAK app"} dir={lang === "ar" ? "rtl" : "ltr"}>
          <div className="pwa-install-icon" aria-hidden="true"><Download size={22} /></div>
          <div className="pwa-install-copy">
            <strong>{lang === "ar" ? "ثبّت تطبيق معك" : "Install MAAK"}</strong>
            <span>{lang === "ar" ? "وصول أسرع إلى خدمات السفر من شاشة هاتفك" : "Quick access to travel services from your home screen"}</span>
          </div>
          <button className="btn btn-primary pwa-install-action" onClick={handleInstall}>{lang === "ar" ? "تثبيت" : "Install"}</button>
          <button className="pwa-install-dismiss" onClick={dismissInstall} aria-label={lang === "ar" ? "إغلاق" : "Dismiss"}><X size={19} /></button>
        </aside>
      )}
      <Suspense fallback={<div className="container" aria-live="polite" />}>{path === "/account" ? <Account key="account" initialTab="profile" /> : path === "/bookings" ? <Account key="bookings" initialTab="orders" /> : path === "/rewards" ? <Account key="rewards" initialTab="referrals" /> : path === "/login" ? <Account key="login" initialMode="login" /> : path === "/signup" ? <Account key="signup" initialMode="signup" /> : path === "/admin" ? <Account adminOnly /> : isHome ? <main className="home-intro">
        <Hero />
        <section className="mobile-home-banner" aria-label={lang === "ar" ? "معك للسفر والسياحة" : "MAAK Travel and Tourism"}>
          <div className="mobile-home-banner-copy">
            <span>MAAK</span>
            <strong>{lang === "ar" ? "دائمًا معك في كل رحلة" : "With you on every journey"}</strong>
          </div>
        </section>
        <div className="home-desktop-only home-services-mobile"><Services /></div>
        <div className="home-desktop-only"><About /></div>
        <div className="home-desktop-only"><Why /></div>
        <div className="home-desktop-only"><How /><SocialFollow /></div>
      </main> : <Pages path={path} />}</Suspense>
      <Suspense fallback={null}><Footer /></Suspense>
      {path !== "/admin" && path !== "/login" && path !== "/signup" && <MobileDock path={path} />}
      </div>
    </>
  );
}
