import { Compass } from "lucide-react";
import { useApp } from "../context/AppContext";
import Logo from "./Logo";
import WhatsAppButton from "./WhatsAppButton";

export default function Hero() {
  const { t } = useApp();
  return (
    <section id="home" className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="slogan"><span className="slogan-dot" aria-hidden="true" />{t.slogan}</p>
          <h1>{t.hero.title}</h1>
          <p className="lead">{t.hero.text}</p>
          <div className="actions">
            <WhatsAppButton />
            <a className="btn btn-ghost" href="#services"><Compass size={18} aria-hidden="true" /> {t.hero.explore}</a>
          </div>
        </div>
        <div className="orbit" aria-hidden="true">
          <span className="ring r1" /><span className="ring r2" /><span className="ring r3" />
          <span className="trail"><span className="gold-dot" /></span>
          <div className="orbit-core glass"><Logo size={150} wordmark={false} /></div>
          {t.hero.chips.map((c, i) => <span key={c} className={`chip glass chip${i}`}>{c}</span>)}
        </div>
      </div>
    </section>
  );
}
