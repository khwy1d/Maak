import { useEffect, useState } from "react";
import { Download, House, Gift, CalendarDays, UserRound, X } from "lucide-react";
import { useApp } from "./context/AppContext";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Pages from "./components/Pages";
import { About, Contact, Footer, How, Why } from "./components/Sections";
import SocialFollow from "./components/SocialFollow";
import GlassBackground from "./components/GlassBackground";
import Account from "./components/Account";
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
      {path === "/account" ? <Account /> : path === "/bookings" ? <Account key="bookings" initialTab="orders" /> : path === "/rewards" ? <Account key="rewards" initialTab="referrals" /> : path === "/admin" ? <Account adminOnly /> : isHome ? <main className="home-intro">
        <Hero />
        <div className="home-desktop-only"><Services /></div>
        <About />
        <div className="home-desktop-only"><Why /></div>
        <div className="home-desktop-only"><How /><SocialFollow /></div>
      </main> : <Pages path={path} />}
      <Footer />
      {path !== "/admin" && <nav className="mobile-dock" aria-label={lang === "ar" ? "التنقل الرئيسي" : "Main navigation"} dir={lang === "ar" ? "rtl" : "ltr"}>
        <a href="/" aria-label={lang === "ar" ? "الرئيسية" : "Home"} aria-current={isHome ? "page" : undefined}>
          <House aria-hidden="true" /><span>{lang === "ar" ? "الرئيسية" : "Home"}</span>
        </a>
        <a href="/bookings" aria-label={lang === "ar" ? "حجوزاتي" : "My bookings"} aria-current={path === "/bookings" ? "page" : undefined}>
          <CalendarDays aria-hidden="true" /><span>{lang === "ar" ? "حجوزاتي" : "Bookings"}</span>
        </a>
        <a href="/rewards" aria-label={lang === "ar" ? "المكافآت" : "Rewards"} aria-current={path === "/rewards" ? "page" : undefined}>
          <Gift aria-hidden="true" /><span>{lang === "ar" ? "المكافآت" : "Rewards"}</span>
        </a>
        <a href="/account" aria-label={lang === "ar" ? "حسابي" : "My account"} aria-current={path === "/account" ? "page" : undefined}>
          <UserRound aria-hidden="true" /><span>{lang === "ar" ? "حسابي" : "Account"}</span>
        </a>
      </nav>}
      </div>
    </>
  );
}
