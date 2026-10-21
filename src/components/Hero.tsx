import { Compass } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Hero() {
  const { t } = useApp();
  return (
    <section id="home" className="hero">
      <div className="container hero-grid">
        <div className="hero-copy">
          <h1>{t.hero.title.split("{{brand}}")[0]}<span className="hero-brand">{t.brand}</span>{t.hero.title.split("{{brand}}")[1]}</h1>
          <p className="lead">{t.hero.text}</p>
          <div className="actions">
            <a className="btn btn-primary hero-start" href="https://wa.me/967776002190"><svg width="22" height="22" viewBox="0 0 448 512" fill="currentColor" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32 101.5 32 1.9 131.6 1.9 254c0 39.1 10.2 77.3 29.6 111L0 480l118.4-31.1c32.6 17.8 69.3 27.2 105.4 27.2h.1c122.3 0 223.9-99.6 223.9-222 0-59.3-24.9-115-66.9-157zM223.9 438.7c-32.9 0-65.1-8.8-93.2-25.4l-6.7-4-70.3 18.4 18.8-68.5-4.4-7C49.5 322.3 40 288.7 40 254 40 152.6 122.5 70.1 224 70.1c49.1 0 95.2 19.1 129.9 53.9s56.2 80.9 56.1 130c0 101.4-84.7 184.7-186.1 184.7zm101.7-138.5c-5.6-2.8-33.1-16.3-38.2-18.1-5.1-1.9-8.8-2.8-12.5 2.8s-14.4 18.1-17.6 21.9c-3.2 3.7-6.5 4.2-12.1 1.4-33-16.5-54.6-29.5-76.3-66.9-5.8-10 5.8-9.3 16.5-31 1.8-3.7.9-6.9-.5-9.7s-12.5-30.1-17.2-41.2c-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2s-9.7 1.4-14.8 6.9c-5.1 5.6-19.4 19-19.4 46.3s19.9 53.7 22.6 57.4c2.8 3.7 39.1 59.7 94.7 83.7 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 33.1-13.5 37.8-26.4 4.6-13 4.6-24.1 3.2-26.4-1.4-2.5-5.1-3.9-10.7-6.7z"/></svg> {t.hero.start}</a>
            <a className="btn btn-ghost" href="#services"><Compass size={18} aria-hidden="true" /> {t.hero.explore}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
