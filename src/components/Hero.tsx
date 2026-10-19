import { Compass } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useApp } from "../context/AppContext";
import Logo from "./Logo";
import WhatsAppButton from "./WhatsAppButton";

export default function Hero() {
  const { t } = useApp();
  return (
    <section id="home" className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1>{t.hero.title.split("{{brand}}")[0]}<span className="hero-brand">{t.brand}</span>{t.hero.title.split("{{brand}}")[1]}</h1>
          <p className="lead">{t.hero.text}</p>
          <div className="actions">
            <a className="btn btn-primary hero-start" href={t.hero.whatsappUrl || "https://wa.me/967776002190"}><FaWhatsapp size={22} aria-hidden="true" /> {t.hero.start}</a>
            <a className="btn btn-ghost" href="#services"><Compass size={18} aria-hidden="true" /> {t.hero.explore}</a>
          </div>
        </div>
        <div className="hero-watermark" aria-hidden="true" />
      </div>
    </section>
  );
}
