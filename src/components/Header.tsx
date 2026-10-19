import { useEffect, useState } from "react";
import { Languages, Menu, Moon, Sun, X } from "lucide-react";
import { useApp } from "../context/AppContext";
import Logo from "./Logo";
import WhatsAppButton from "./WhatsAppButton";

export default function Header() {
  const { t, theme, toggleLang, toggleTheme } = useApp();
  const [open, setOpen] = useState(false);
  const links = [["/", t.nav.home], ["/services", t.nav.services], ["/about", t.nav.about], ["/contact", t.nav.contact]];

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, []);

  return (
    <header className="header">
      <div className="nav glass">
        <a href="#home" className="nav-logo" aria-label={t.brand} onClick={() => setOpen(false)}><Logo size={40} /></a>
        <nav id="main-nav" className={`nav-links ${open ? "open" : ""}`} aria-label={t.a11y.nav}>
          {links.map(([h, l]) => <a key={h} href={h} onClick={() => setOpen(false)}>{l}</a>)}
          <div className="nav-wa-mobile"><WhatsAppButton /></div>
        </nav>
        <div className="nav-tools">
          <button className="icon-btn lang-btn" onClick={toggleLang} aria-label={t.a11y.lang}>
            <Languages size={18} aria-hidden="true" /><span>{t.langLabel}</span>
          </button>
          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? t.a11y.themeLight : t.a11y.themeDark}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <span className="nav-wa-desktop"><WhatsAppButton /></span>
          <button className="icon-btn menu-btn" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="main-nav" aria-label={open ? t.a11y.close : t.a11y.menu}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
