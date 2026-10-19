import { siteConfig } from "../config/site";
import { translations, type Lang } from "../i18n/translations";

export type WaTopic = "general" | "flight" | "visa" | "hotel" | "car";

/** Click-to-chat URL with a prefilled, URL-encoded message in the chosen language. */
export function whatsappUrl(lang: Lang, topic: WaTopic = "general"): string {
  const digits = siteConfig.whatsappNumber.replace(/\D/g, "");
  if (!digits || digits.length < 8) return "https://wa.me/";
  return `https://wa.me/${digits}?text=${encodeURIComponent(translations[lang].wa[topic])}`;
}
