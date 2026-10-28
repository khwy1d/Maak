import { ChevronDown, Handshake, ListChecks, MessagesSquare, Sparkles } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "../config/site";
import { useApp } from "../context/AppContext";
import { useReveal } from "../hooks/useReveal";
import Logo from "./Logo";
import WhatsAppButton from "./WhatsAppButton";

const whyIcons = [MessagesSquare, ListChecks, Sparkles, Handshake];

export function Why() {
  const { t } = useApp(); const ref = useReveal<HTMLUListElement>();
  return (
    <section className="section alt">
      <div className="container why">
        <div className="section-head"><h2>{t.why.title}</h2><p>{t.why.intro}</p></div>
        <ul className="why-list reveal" ref={ref}>
          {t.why.items.map((it, i) => { const I = whyIcons[i]; return (
            <li key={it.t}><I size={22} aria-hidden="true" /><div><h3>{it.t}</h3><p>{it.d}</p></div></li>); })}
        </ul>
      </div>
    </section>
  );
}

export function How() {
  const { t } = useApp(); const ref = useReveal<HTMLOListElement>();
  return (
    <section className="section how-section">
      <div className="container">
        <div className="section-head"><h2>{t.how.title}</h2></div>
        <ol className="steps reveal" ref={ref}>
          {t.how.steps.map((s, i) => (
            <li key={s.t}><span className="step-n" aria-hidden="true">{i + 1}</span><h3>{s.t}</h3><p>{s.d}</p></li>))}
        </ol>
      </div>
    </section>
  );
}

export function About() {
  const { t } = useApp(); const ref = useReveal<HTMLDivElement>();
  return (
    <section id="about" className="section alt">
      <div className="container about reveal" ref={ref}>
        <div>
          <h2>{t.about.title}</h2>
          <p>{t.about.p1}</p>
          <p className="about-slogan">{t.slogan}</p>
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  const { t } = useApp(); const ref = useReveal<HTMLDivElement>();
  return (
    <section id="contact" className="section home-contact-cta">
      <div className="container">
        <div className="cta reveal" ref={ref}>
          <h2>{t.contact.title}</h2>
          <p>{t.contact.text}</p>
          <WhatsAppButton variant="dark" />
          <p className="cta-small">{t.contact.how}</p>
          {(siteConfig.email || siteConfig.address) && (
            <dl className="details">
              {siteConfig.email && <div><dt>{t.contact.email}</dt><dd><a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></dd></div>}
              {siteConfig.address && <div><dt>{t.contact.address}</dt><dd>{siteConfig.address}</dd></div>}
            </dl>)}
        </div>
      </div>
    </section>
  );
}

export function FAQ() {
  const { t } = useApp(); const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section alt">
      <div className="container faq">
        <div className="section-head"><h2>{t.faq.title}</h2></div>
        <div>
          {t.faq.items.map((f, i) => (
            <div key={f.q} className={`faq-item ${open === i ? "open" : ""}`}>
              <h3><button id={`q${i}`} aria-expanded={open === i} aria-controls={`a${i}`} onClick={() => setOpen(open === i ? null : i)}>
                <span>{f.q}</span><ChevronDown size={20} aria-hidden="true" /></button></h3>
              <div id={`a${i}`} role="region" aria-labelledby={`q${i}`} className="faq-a"><div><p>{f.a}</p></div></div>
            </div>))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { t, lang } = useApp();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div><Logo size={48} /><p className="footer-desc">{t.footer.desc}</p><WhatsAppButton variant="ghost" /></div>
        <nav aria-label={t.footer.links}><h2 className="footer-heading">{t.footer.links}</h2>
          <a href="/">{t.nav.home}</a><a href="/services">{t.nav.services}</a><a href="/about">{t.nav.about}</a><a href="/contact">{t.nav.contact}</a></nav>
        <nav aria-label={t.footer.services}><h2 className="footer-heading">{t.footer.services}</h2>
          {t.services.items.map((s) => <a key={s.key} href={s.key === "flight" ? "/flights" : s.key === "visa" ? "/visas" : s.key === "hotel" ? "/hotels" : "/car-rental"}>{lang === "ar" ? s.ar : s.en}</a>)}
          <a href="/tourism">{lang === "ar" ? "السياحة والرحلات" : "Tourism and trips"}</a></nav>
      </div>
      <div className="container copy">© {new Date().getFullYear()} {t.brand}. {t.footer.rights}</div>
    </footer>
  );
}
