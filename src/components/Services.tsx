import { ArrowUpRight, Building2, Bus, Car, FileCheck, HeartPulse, Hotel, Moon, Plane, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useReveal } from "../hooks/useReveal";
import { whatsappUrl, type WaTopic } from "../utils/whatsapp";

const icons = { flight: Plane, visa: FileCheck, hotel: Hotel, car: Car, medical: HeartPulse, security: ShieldCheck, umrah: Moon, bus: Bus, realEstate: Building2 };

export default function Services() {
  const { t, lang } = useApp();
  const ref = useReveal<HTMLDivElement>();
  return (
    <section id="services" className="section">
      <div className="container">
        <div className="section-head"><h2>{t.services.title}</h2><p>{t.services.intro}</p></div>
        <div className="services reveal" ref={ref}>
          {t.services.items.map((s, i) => {
            const Icon = icons[s.key as keyof typeof icons];
            return (
              <article key={s.key} className={`service ${i === 0 ? "feature" : ""}`}>
                <span className="service-icon"><Icon size={26} aria-hidden="true" /></span>
                <h3>{lang === "ar" ? s.ar : s.en}</h3>
                <p className="service-sub" lang={lang === "ar" ? "en" : "ar"}>{lang === "ar" ? s.en : s.ar}</p>
                <p>{s.desc}</p>
                <a className="service-link" href={whatsappUrl(lang, s.key as WaTopic)} target="_blank" rel="noopener noreferrer">
                  {t.services.cta} <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
