import { ArrowUpLeft, Building2, Bus, Car, Compass, FileCheck, HeartPulse, Hotel, Moon, Plane, ShieldCheck } from "lucide-react";
import { useApp } from "../context/AppContext";
import { useReveal } from "../hooks/useReveal";

const icons = { flight: Plane, visa: FileCheck, hotel: Hotel, car: Car, medical: HeartPulse, security: ShieldCheck, umrah: Moon, bus: Bus, realEstate: Building2 };
const routes: Record<string, string> = {
  flight: "/flights",
  visa: "/visas",
  hotel: "/hotels",
  car: "/car-rental",
  medical: "/medical-tourism",
  security: "/security-clearance-egypt",
  umrah: "/umrah",
  bus: "/transport",
  realEstate: "/real-estate",
};

export default function Services() {
  const { t, lang } = useApp();
  const ref = useReveal<HTMLDivElement>();
  const featuredServices = t.services.items.slice(0, 4);
  return (
    <section id="services" className="section">
      <div className="container">
        <div className="section-head"><h2>{t.services.title}</h2><p>{t.services.intro}</p></div>
        <div className="services reveal" ref={ref}>
          {featuredServices.map((s) => {
            const Icon = icons[s.key as keyof typeof icons];
            return (
              <a key={s.key} className="service service-card-link" href={routes[s.key] || "/services"} aria-label={lang === "ar" ? `عرض خدمة ${s.ar}` : `View ${s.en} service`}>
                <span className="service-icon"><Icon size={26} aria-hidden="true" /></span>
                <h3>{lang === "ar" ? s.ar : s.en}</h3>
                <p className="service-sub" lang={lang === "ar" ? "en" : "ar"}>{lang === "ar" ? s.en : s.ar}</p>
                <p>{s.desc}</p>
                <span className="service-card-hint">{lang === "ar" ? "عرض تفاصيل الخدمة" : "View service details"} <ArrowUpLeft size={17} aria-hidden="true" /></span>
              </a>
            );
          })}
        </div>
        <div className="services-all-wrap">
          <a className="btn btn-ghost services-all" href="/services"><Compass size={18} aria-hidden="true" /> {lang === "ar" ? "عرض جميع الخدمات" : "View all services"}</a>
        </div>
      </div>
    </section>
  );
}
