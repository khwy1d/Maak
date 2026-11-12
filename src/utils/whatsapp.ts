import { siteConfig } from "../config/site";
import { translations, type Lang } from "../i18n/translations";

export type WaTopic = "general" | "flight" | "visa" | "hotel" | "car" | "medical" | "security" | "umrah" | "bus" | "realEstate";

/** Normalize a configured international WhatsApp destination to digits only. */
export function normalizeWhatsAppNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (!/^[1-9][0-9]{6,14}$/.test(digits)) {
    throw new Error("WhatsApp destination must be an international number in digits-only format.");
  }
  return digits;
}

/** Build a wa.me URL using the official digits-only path and encoded message. */
export function buildWhatsAppUrl(number: string, message: string): string {
  const digits = normalizeWhatsAppNumber(number);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Click-to-chat URL with a prefilled, URL-encoded message in the chosen language. */
export function whatsappUrl(lang: Lang, topic: WaTopic = "general"): string {
  return buildWhatsAppUrl(siteConfig.whatsappNumber, translations[lang].wa[topic]);
}
