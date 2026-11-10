import { useEffect, useState } from "react";
import { Languages, Menu, Moon, Sun, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import Logo from "./Logo";
import WhatsAppButton from "./WhatsAppButton";

export default function MobileHeader() {
  const { t, lang, theme, toggleLang, toggleTheme } = useApp();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const links = [
    ["/", t.nav.home],
    ["/services", t.nav.services],
    ["/about", t.nav.about],
    ["/contact", t.nav.contact],
    ["/account", lang === "ar" ? "حسابي" : "My account"],
  ];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = Math.max(0, window.scrollY);
        const delta = currentY - lastY;
        if (open || currentY < 24) setHidden(false);
        else if (delta > 4 && currentY > 80) setHidden(true);
        else if (delta < -2) setHidden(false);
        lastY = currentY;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  return (
    <header className={`header mobile-header${hidden && !open ? " header-hidden" : ""}`} aria-hidden={hidden && !open ? true : undefined}>
      <div className="nav glass">
        <a href="/" className="nav-logo" aria-label={t.nav.home} onClick={() => setOpen(false)}><Logo size={40} /></a>
        <nav id="mobile-main-nav" className={`nav-links ${open ? "open" : ""}`} aria-label={t.a11y.nav}>
          {links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
          <div className="nav-wa-mobile"><WhatsAppButton /></div>
        </nav>
        <div className="nav-tools">
          <button className="icon-btn lang-btn" onClick={toggleLang} aria-label={t.a11y.lang}>
            <Languages size={18} aria-hidden="true" /><span>{t.langLabel}</span>
          </button>
          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? t.a11y.themeLight : t.a11y.themeDark}>
            {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          <button className="icon-btn menu-btn" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-main-nav" aria-label={open ? t.a11y.close : t.a11y.menu}>
            {open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}
