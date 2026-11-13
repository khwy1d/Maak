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
