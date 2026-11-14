import { siteConfig } from "../config/site";

function digitsOnly(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (!/^[1-9]\d{6,14}$/.test(digits)) {
    throw new Error("رقم واتساب في إعدادات الموقع غير صالح.");
  }
  return digits;
}

export function buildFollowUpMessage(reference: string, serviceType: string): string {
  return `مرحبًا فريق معك، أتابع بخصوص الحجز رقم ${reference}.\nنوع الخدمة: ${serviceType}.\nأرجو إفادتي بآخر المستجدات.`;
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${digitsOnly(siteConfig.whatsappNumber)}?text=${encodeURIComponent(message)}`;
}
