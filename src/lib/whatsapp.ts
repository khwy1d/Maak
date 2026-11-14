import { siteConfig } from "../config/site";

function digitsOnly(number: string): string {
  const digits = number.replace(/\D/g, "");
  if (!/^[1-9]\d{6,14}$/.test(digits)) {
    throw new Error("رقم واتساب في إعدادات الموقع غير صالح.");
  }
  return digits;
}

export function buildFollowUpMessage(reference: string, serviceType: string): string {
  const serviceNames: Record<string, string> = {
    flight: "تذاكر الطيران",
    ground_transport: "النقل البري",
    accommodation: "حجوزات الفنادق",
    car_rental: "تأجير السيارات",
    medical_travel: "السفر العلاجي",
    security_clearance: "الموافقات الأمنية لمصر",
    umrah: "العمرة",
    real_estate: "الخدمات العقارية",
    tourism: "السياحة والرحلات",
  };
  const serviceLabel = serviceNames[serviceType] ?? serviceType;
  return `مرحبًا فريق معك، أتابع بخصوص الحجز رقم ${reference}.\nنوع الخدمة: ${serviceLabel}.\nأرجو إفادتي بآخر المستجدات.`;
}

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${digitsOnly(siteConfig.whatsappNumber)}?text=${encodeURIComponent(message)}`;
}
