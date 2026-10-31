import { useEffect, useState } from "react";
import { Download, House, LayoutGrid, MessageCircle, Plane, Users, X } from "lucide-react";
import { useApp } from "./context/AppContext";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Pages from "./components/Pages";
import { About, Contact, Footer, How, Why } from "./components/Sections";
import SocialFollow from "./components/SocialFollow";
import GlassBackground from "./components/GlassBackground";
import Account from "./components/Account";
import InitialSetup from "./components/InitialSetup";
import InquiryCapture from "./components/InquiryCapture";
import { getReferralCode } from "./lib/supabase";

function currentPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path || "/";
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
      <a className="skip" href={isHome ? "#services" : "/services"}>Skip to content</a>
      <Header />
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
      {path === "/initial-setup" ? <InitialSetup /> : path === "/account" ? <Account /> : path === "/admin" ? <Account adminOnly /> : isHome ? <main className="home-intro">
        <Hero />
        <div className="home-desktop-only"><Services /></div>
        <About />
        <div className="home-desktop-only"><Why /></div>
        <div className="home-desktop-only"><How /><SocialFollow /></div>
      </main> : <Pages path={path} />}
      <Footer />
      <nav className="mobile-dock" aria-label={t.a11y.nav}>
        <a href="/" aria-label={t.nav.home} aria-current={isHome ? "page" : undefined}><House aria-hidden="true" /><span>{t.nav.home}</span></a>
        <a href="/services" aria-label={t.nav.services} aria-current={path === "/services" ? "page" : undefined}><LayoutGrid aria-hidden="true" /><span>{t.nav.services}</span></a>
        <a className="dock-primary" href="https://wa.me/967776002190" target="_blank" rel="noopener noreferrer" aria-label={t.whatsapp}>
          <svg width="26" height="26" viewBox="0 0 448 512" fill="#142C4E" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32 101.5 32 1.9 131.6 1.9 254c0 39.1 10.2 77.3 29.6 111L0 480l118.4-31.1c32.6 17.8 69.3 27.2 105.4 27.2h.1c122.3 0 223.9-99.6 223.9-222 0-59.3-24.9-115-66.9-157zM223.9 438.7c-32.9 0-65.1-8.8-93.2-25.4l-6.7-4-70.3 18.4 18.8-68.5-4.4-7C49.5 322.3 40 288.7 40 254 40 152.6 122.5 70.1 224 70.1c49.1 0 95.2 19.1 129.9 53.9s56.2 80.9 56.1 130c0 101.4-84.7 184.7-186.1 184.7zm101.7-138.5c-5.6-2.8-33.1-16.3-38.2-18.1-5.1-1.9-8.8-2.8-12.5 2.8s-14.4 18.1-17.6 21.9c-3.2 3.7-6.5 4.2-12.1 1.4-33-16.5-54.6-29.5-76.3-66.9-5.8-10 5.8-9.3 16.5-31 1.8-3.7.9-6.9-.5-9.7s-12.5-30.1-17.2-41.2c-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2s-9.7 4.6-14.8 10.2c-5.1 5.6-19.4 19-19.4 46.3s19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.7 83.7 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 33.1-13.5 37.8-26.4 4.6-13 3.2-24.1 3.2-26.4-1.4-2.5-5.1-3.9-10.7-6.7z"/></svg>
        </a>
        <a href="/about" aria-label={t.nav.about} aria-current={path === "/about" ? "page" : undefined}><Users aria-hidden="true" /><span>{t.nav.about}</span></a>
        <a href="/contact" aria-label={t.nav.contact} aria-current={path === "/contact" ? "page" : undefined}><MessageCircle aria-hidden="true" /><span>{t.nav.contact}</span></a>
      </nav>
      </div>
    </>
  );
}
