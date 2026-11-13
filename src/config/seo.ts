export type SeoLanguage = "ar" | "en";

export const publicSeoPages = [
  { path: "/", key: "home", ar: ["معك للسفر والسياحة | MAAK", "خدمات السفر والسياحة من معك: الطيران والفنادق والنقل وتأجير السيارات وخدمات السفر."], en: ["MAAK Travel & Tourism", "MAAK travel services: flights, hotels, ground transport, car rental and travel assistance."] },
  { path: "/services", key: "services", ar: ["خدمات معك", "استعرض خدمات معك للسفر والسياحة وابدأ استفسارك مباشرة."], en: ["MAAK Services", "Explore MAAK travel and tourism services and start an enquiry directly."] },
  { path: "/flights", key: "flight", ar: ["حجز تذاكر الطيران | معك", "استفسر عن خيارات رحلات الطيران والوجهات ومواعيد السفر مع معك."], en: ["Flight Bookings | MAAK", "Enquire about flight routes, destinations and travel dates with MAAK."] },
  { path: "/transport", key: "bus", ar: ["حجز الباصات والنقل البري | معك", "استفسر عن مسارات الباصات والنقل البري ومواعيد السفر."], en: ["Bus & Ground Transport | MAAK", "Enquire about bus routes, ground transport and travel schedules."] },
  { path: "/hotels", key: "hotel", ar: ["حجوزات الفنادق | معك", "استفسر عن خيارات الإقامة والفنادق وفق وجهتك ومدة رحلتك."], en: ["Hotel Reservations | MAAK", "Enquire about hotel and accommodation options for your destination and stay."] },
  { path: "/security-clearance-egypt", key: "security", ar: ["الموافقات الأمنية لمصر | معك", "استفسر عن الإجراءات والمستندات المتعلقة بالموافقات الأمنية للسفر إلى مصر."], en: ["Egypt Security Clearance | MAAK", "Enquire about procedures and documents for Egypt travel security clearance."] },
  { path: "/umrah", key: "umrah", ar: ["خدمات العمرة | معك", "استفسر عن خدمات العمرة ومتطلبات الطلب وترتيبات السفر."], en: ["Umrah Services | MAAK", "Enquire about Umrah services, application requirements and travel arrangements."] },
  { path: "/medical-tourism", key: "medical", ar: ["السفر العلاجي | معك", "تنسيق استفسارات السفر العلاجي والمواعيد والإقامة والتنقل."], en: ["Medical Travel | MAAK", "Coordinate medical travel enquiries, appointments, accommodation and transport."] },
  { path: "/car-rental", key: "car", ar: ["تأجير السيارات | معك", "استفسر عن خيارات تأجير السيارات ومواقع الاستلام والتسليم ومدة الإيجار."], en: ["Car Rental | MAAK", "Enquire about car rental options, pickup locations and rental periods."] },
  { path: "/tourism", key: "tourism", ar: ["السياحة والرحلات | معك", "خطط لرحلتك واستفسر عن خدمات السياحة والسفر مع معك."], en: ["Tourism & Trips | MAAK", "Plan your trip and enquire about tourism and travel services with MAAK."] },
  { path: "/real-estate", key: "realEstate", ar: ["الخدمات العقارية | معك", "استفسر عن تنسيق خدمات الإيجار والبيع والشراء وإدارة الأملاك."], en: ["Real Estate Services | MAAK", "Enquire about rental, sale, purchase and property-management coordination."] },
  { path: "/about", key: "about", ar: ["عن معك | MAAK", "تعرف على معك ورسالتها في تسهيل ترتيبات السفر والتواصل مع المسافرين."], en: ["About MAAK", "Learn about MAAK and its approach to making travel arrangements clearer and easier."] },
  { path: "/contact", key: "contact", ar: ["تواصل مع معك | MAAK", "تواصل مع معك للاستفسار عن خدمات السفر والسياحة."], en: ["Contact MAAK", "Contact MAAK with your travel and tourism service enquiries."] },
] as const;

export function localizedPath(path: string, lang: SeoLanguage): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const withoutLocale = clean.replace(/^\/(?:ar|en)(?=\/|$)/, "") || "/";
  return `/${lang}${withoutLocale === "/" ? "" : withoutLocale}` || `/${lang}`;
}

export function getSeoPage(path: string) {
  const clean = path.replace(/^\/(?:ar|en)(?=\/|$)/, "") || "/";
  return publicSeoPages.find((page) => page.path === clean) ?? null;
}
