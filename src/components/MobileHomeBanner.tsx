import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";

type MobileBanner = { url: string; alt: string };

export default function MobileHomeBanner() {
  const { lang } = useApp();
  const [banner, setBanner] = useState<MobileBanner | null>(null);

  useEffect(() => {
    let active = true;
    const client = supabase;
    if (!client) return;
    void client.from("home_banners")
      .select("storage_path,alt_text")
      .eq("display_target", "mobile")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error || !data) return;
        setBanner({
          url: client.storage.from("home-banners").getPublicUrl(data.storage_path).data.publicUrl,
          alt: data.alt_text || "MAAK",
        });
      });
    return () => { active = false; };
  }, []);

  return (
    <section
      className="mobile-home-banner"
      aria-label={lang === "ar" ? "معك للسفر والسياحة" : "MAAK Travel and Tourism"}
      style={banner ? { backgroundImage: `linear-gradient(90deg, rgba(10, 28, 52, .78), rgba(10, 28, 52, .18)), url("${banner.url}")` } : undefined}
    >
      <div className="mobile-home-banner-copy">
        <span>MAAK</span>
        <strong>{lang === "ar" ? "دائمًا معك في كل رحلة" : "With you on every journey"}</strong>
      </div>
    </section>
  );
}
