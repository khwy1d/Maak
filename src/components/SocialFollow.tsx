import { useApp } from "../context/AppContext";

const socials = [
  { key: "instagram", href: "https://www.instagram.com/", labelAr: "إنستغرام", labelEn: "Instagram" },
  { key: "facebook", href: "https://www.facebook.com/", labelAr: "فيسبوك", labelEn: "Facebook" },
  { key: "x", href: "https://x.com/", labelAr: "إكس", labelEn: "X" },
  { key: "tiktok", href: "https://www.tiktok.com/", labelAr: "تيك توك", labelEn: "TikTok" },
];

function BrandIcon({ name }: { name: string }) {
  if (name === "instagram") return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2.2"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="2.2"/><circle cx="17.6" cy="6.6" r="1.35" fill="currentColor"/></svg>;
  if (name === "facebook") return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.6 21v-8.2h2.75l.41-3.2H13.6V7.56c0-.93.26-1.56 1.59-1.56h1.69V3.14A22 22 0 0 0 14.42 3c-2.43 0-4.09 1.49-4.09 4.23V9.6H7.58v3.2h2.75V21h3.27Z"/></svg>;
  if (name === "x") return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.9-7.37L5.6 22H2.47l7.25-8.29L1.8 2h6.4l4.43 6.76L18.9 2Zm-1.1 18h1.73L7.28 3.9H5.42L17.8 20Z"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.6 7.1a5.3 5.3 0 0 1-3.3-1.2 5.4 5.4 0 0 1-1.8-3.4h-3.6v13.2a2.7 2.7 0 1 1-2.7-2.7c.4 0 .8.1 1.1.2V9.5a6.8 6.8 0 1 0 5.2 6.6V9.4a8.9 8.9 0 0 0 5.1 1.6V7.4c-.1 0-.1-.1 0-.3Z"/></svg>;
}

export default function SocialFollow() {
  const { lang } = useApp();
  return (
    <section className="section social-follow-section">
      <div className="container">
        <div className="social-follow-card glass">
          <div className="social-follow-copy">
            <span className="social-follow-eyebrow">{lang === "ar" ? "ابقَ على تواصل" : "STAY CONNECTED"}</span>
            <h2>{lang === "ar" ? "تابعنا" : "Follow us"}</h2>
            <p>{lang === "ar" ? "تابعنا على منصات التواصل لتبقى قريبًا من أخبارنا ومستجدات خدماتنا." : "Follow MAAK on social media for our latest updates and travel services."}</p>
          </div>
          <div className="social-follow-links">
            {socials.map(({ key, href, labelAr, labelEn }) => (
              <a key={key} className={`social-follow-link social-${key}`} href={href} target="_blank" rel="noopener noreferrer" aria-label={lang === "ar" ? labelAr : labelEn} title={lang === "ar" ? labelAr : labelEn}>
                <BrandIcon name={key} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
