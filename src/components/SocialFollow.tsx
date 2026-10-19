import { Facebook, Instagram, Music2 } from "lucide-react";
import { useApp } from "../context/AppContext";

const socials = [
  { key: "instagram", href: "https://www.instagram.com/", labelAr: "إنستغرام", labelEn: "Instagram", Icon: Instagram },
  { key: "facebook", href: "https://www.facebook.com/", labelAr: "فيسبوك", labelEn: "Facebook", Icon: Facebook },
  { key: "x", href: "https://x.com/", labelAr: "إكس", labelEn: "X", Icon: null },
  { key: "tiktok", href: "https://www.tiktok.com/", labelAr: "تيك توك", labelEn: "TikTok", Icon: Music2 },
];

export default function SocialFollow() {
  const { lang } = useApp();
  return (
    <section className="section social-follow-section">
      <div className="container">
        <div className="social-follow-card glass">
          <div className="social-follow-copy">
            <span className="social-follow-eyebrow">{lang === "ar" ? "ابقَ على تواصل" : "STAY CONNECTED"}</span>
            <h2>{lang === "ar" ? "تابعنا" : "Follow us"}</h2>
            <p>{lang === "ar" ? "تابع معك على منصات التواصل لتبقى قريبًا من أخبارنا ومستجدات خدماتنا." : "Follow MAAK on social media for our latest updates and travel services."}</p>
          </div>
          <div className="social-follow-links">
            {socials.map(({ key, href, labelAr, labelEn, Icon }) => (
              <a key={key} className={`social-follow-link social-${key}`} href={href} target="_blank" rel="noopener noreferrer" aria-label={lang === "ar" ? labelAr : labelEn} title={lang === "ar" ? labelAr : labelEn}>
                {Icon ? <Icon size={25} strokeWidth={2} aria-hidden="true" /> : <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.37L5.6 22H2.47l7.25-8.29L1.8 2h6.4l4.43 6.76L18.9 2Zm-1.1 18h1.73L7.28 3.9H5.42L17.8 20Z"/></svg>}
                <span>{lang === "ar" ? labelAr : labelEn}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
