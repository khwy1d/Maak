import { useEffect, useRef, useState } from "react";
import { Languages, Moon, Sun } from "lucide-react";
import { useApp } from "../context/AppContext";
import Logo from "./Logo";
import WhatsAppButton from "./WhatsAppButton";

export default function Header() {
  const { t, lang, theme, toggleLang, toggleTheme } = useApp();
  const [hidden, setHidden] = useState(false);\n  const headerRef = useRef<HTMLElement | null>(null);
  const links = [
    ["/", t.nav.home],
    ["/services", t.nav.services],
    ["/about", t.nav.about],
    ["/contact", t.nav.contact],
    ["/account", lang === "ar" ? "حسابي" : "My account"],
  ];

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = Math.max(0, window.scrollY);
        const delta = currentY - lastY;
        if (currentY < 24) setHidden(false);
        else if (delta > 4 && currentY > 80) setHidden(true);
        else if (delta < -2) setHidden(false);
        lastY = currentY;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header ref={headerRef} onFocusCapture={() => setHidden(false)} className={`header desktop-header${hidden ? " header-hidden" : ""}`}>
      <div className="nav glass">
        <a href="/" className="nav-logo" aria-label={t.nav.home}><Logo size={40} /></a>
        <nav id="main-nav" className="nav-links" aria-label={t.a11y.nav}>
          {links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <div className="nav-tools">
          <button className="icon-btn lang-btn" onClick={toggleLang} aria-label={t.a11y.lang}>
            <Languages size={18} aria-hidden="true" /><span>{t.langLabel}</span>
          </button>
          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? t.a11y.themeLight : t.a11y.themeDark}>
            {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
          <span className="nav-wa-desktop"><WhatsAppButton /></span>
        </div>
      </div>
    </header>
  );
}
