import { useEffect, useState } from "react";
import { House, LayoutGrid, MessageCircle, Plus, Plane, UserRound } from "lucide-react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import Services from "./components/Services";
import Pages from "./components/Pages";
import { Contact, Footer, How, Why } from "./components/Sections";
import SocialFollow from "./components/SocialFollow";
import GlassBackground from "./components/GlassBackground";

function currentPath() {
  const path = window.location.pathname.replace(/\/+$/, "");
  return path || "/";
}

export default function App() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const sync = () => { setPath(currentPath()); window.scrollTo(0, 0); };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const isHome = path === "/";
  return (
    <>
      <GlassBackground />
      <div className="site-content">
      <a className="skip" href={isHome ? "#services" : "/services"}>Skip to content</a>
      <Header />
      {isHome ? <><main><Hero /><Services /><Why /><How /><Contact /><SocialFollow /></main></> : <Pages path={path} />}
      <Footer />
      <nav className="mobile-dock" aria-label="التنقل السريع">
        <a href="/" aria-label="الرئيسية" aria-current={isHome ? "page" : undefined}><House aria-hidden="true" /><span>الرئيسية</span></a>
        <a href="/services" aria-label="الخدمات" aria-current={path === "/services" ? "page" : undefined}><LayoutGrid aria-hidden="true" /><span>الخدمات</span></a>
        <a className="dock-primary" href="https://wa.me/967776002190" aria-label="ابدأ استفسارك عبر واتساب"><Plus aria-hidden="true" /><span>ابدأ</span></a>
        <a href="/flights" aria-label="حجوزات الطيران"><Plane aria-hidden="true" /><span>الطيران</span></a>
        <a href="/contact" aria-label="تواصل معنا" aria-current={path === "/contact" ? "page" : undefined}><MessageCircle aria-hidden="true" /><span>تواصل</span></a>
      </nav>
      </div>
    </>
  );
}
