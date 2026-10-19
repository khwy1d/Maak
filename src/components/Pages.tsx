import { ArrowUpRight, Car, Compass, FileCheck, Hotel, Plane, MapPinned, Send } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "../config/site";
import { useApp } from "../context/AppContext";
import type { WaTopic } from "../utils/whatsapp";
import WhatsAppButton from "./WhatsAppButton";

const routes = [
  { path: "/services", key: "services", icon: Compass },
  { path: "/flights", key: "flight", topic: "flight" as WaTopic, icon: Plane },
  { path: "/visas", key: "visa", topic: "visa" as WaTopic, icon: FileCheck },
  { path: "/hotels", key: "hotel", topic: "hotel" as WaTopic, icon: Hotel },
  { path: "/car-rental", key: "car", topic: "car" as WaTopic, icon: Car },
  { path: "/tourism", key: "tourism", icon: MapPinned },
];

type PageCopy = { title: string; intro: string; bullets?: string[] };
type LocaleCopy = {
  services: PageCopy;
  flight: PageCopy;
  visa: PageCopy;
  hotel: PageCopy;
  car: PageCopy;
  tourism: PageCopy;
  about: PageCopy;
  contact: PageCopy;
  cta: string;
  note: string;
};

const copy: Record<"ar" | "en", LocaleCopy> = {
  ar: {
    services: { title: "خدمات معك", intro: "خدمات سفر أساسية، وتواصل مباشر لمساعدتك في ترتيب رحلتك." },
    flight: { title: "حجز تذاكر الطيران", intro: "أخبرنا بوجهتك وتواريخ سفرك لنساعدك في استكشاف خيارات الرحلات والخطوات التالية.", bullets: ["الاستفسار عن الرحلات والوجهات", "مقارنة الخيارات وفق احتياجك", "المساعدة في خطوات الحجز"] },
    visa: { title: "خدمات التأشيرات", intro: "نساعدك على فهم الخطوات والمستندات المعتادة وتجهيز استفسارك وفق وجهتك.", bullets: ["التعرّف على الخطوات المطلوبة", "قائمة أولية بالمستندات", "متابعة الاستفسارات المتعلقة بالطلب"] },
    hotel: { title: "حجوزات الفنادق", intro: "شاركنا الوجهة ومدة الإقامة وعدد المسافرين لنساعدك في بحث خيارات الإقامة المناسبة.", bullets: ["خيارات وفق الوجهة والمدة", "مراعاة احتياجات المسافرين", "التواصل بشأن تفاصيل الحجز"] },
    car: { title: "تأجير السيارات والنقل", intro: "أخبرنا بمكان الاستلام والمدة ونوع السيارة الذي تحتاجه لنبدأ ترتيب الخيارات.", bullets: ["احتياجات التنقل داخل الوجهة", "خيارات تناسب طبيعة الرحلة", "تنسيق التفاصيل قبل التأكيد"] },
    tourism: { title: "السياحة والرحلات", intro: "نساعدك في ترتيب احتياجات رحلتك وتحديد الخدمات المناسبة للوجهة ومدة السفر.", bullets: ["تخطيط أولي لاحتياجات الرحلة", "تنسيق خدمات السفر والإقامة", "مناقشة المتطلبات الخاصة"] },
    about: { title: "عن معك", intro: "معك علامة لخدمات السفر تهدف إلى جعل ترتيبات السفر أوضح وأسهل، وأن تكون نقطة تواصل قريبة تساعدك في كل خطوة.", bullets: ["تواصل واضح ومباشر", "شرح الخيارات والخطوات", "مساعدة في تنظيم تفاصيل الرحلة"] },
    contact: { title: "تواصل مع معك", intro: "ابدأ محادثة عبر واتساب، واذكر الخدمة التي تحتاجها وأي تفاصيل أولية عن رحلتك.", bullets: ["الطيران والتأشيرات", "الفنادق وتأجير السيارات", "الاستفسارات العامة"] },
    cta: "استفسر عبر واتساب", note: "هذا الموقع لا يُتمّ الحجوزات بنفسه. تتأكد الأسعار والتوافر والشروط عبر التواصل المباشر، وقرارات التأشيرات تعود للجهات المختصة."
  },
  en: {
    services: { title: "MAAK services", intro: "Essential travel services with direct contact to help you arrange your trip." },
    flight: { title: "Flight bookings", intro: "Tell us your destination and travel dates so we can help explore flight options and next steps.", bullets: ["Ask about routes and destinations", "Compare options for your needs", "Get help with booking steps"] },
    visa: { title: "Visa services", intro: "We help you understand typical steps and documents for your destination.", bullets: ["Understand the usual process", "Prepare an initial document checklist", "Discuss questions about your application"] },
    hotel: { title: "Hotel reservations", intro: "Share your destination, stay dates and number of travellers so we can help explore suitable accommodation.", bullets: ["Options by destination and duration", "Consider traveller needs", "Discuss reservation details"] },
    car: { title: "Car rental and transport", intro: "Tell us the pickup location, duration and vehicle type you need to start exploring options.", bullets: ["Transport needs at your destination", "Options suited to your trip", "Coordinate details before confirmation"] },
    tourism: { title: "Tourism and trips", intro: "We help organize your travel needs and identify suitable services for your destination and trip length.", bullets: ["Initial trip planning", "Coordinate travel and accommodation", "Discuss special requirements"] },
    about: { title: "About MAAK", intro: "MAAK is a travel services brand focused on making travel arrangements clearer and easier, with a helpful point of contact at every step.", bullets: ["Clear, direct communication", "Explain options and steps", "Help organize trip details"] },
    contact: { title: "Contact MAAK", intro: "Start a WhatsApp conversation and tell us which service you need and any initial details about your trip.", bullets: ["Flights and visas", "Hotels and car rental", "General enquiries"] },
    cta: "Enquire on WhatsApp", note: "This website does not complete bookings. Prices, availability and terms are confirmed through direct contact; visa decisions rest with the relevant authorities."
  }
};

export default function Pages({ path }: { path: string }) {
  const { lang, t } = useApp();
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [travellers, setTravellers] = useState("1");
  const [details, setDetails] = useState("");
  const language = copy[lang];
  const key = path === "/about" || path === "/contact" ? path.slice(1) : path === "/services" || path === "/" ? "services" : path === "/flights" ? "flight" : path === "/visas" ? "visa" : path === "/hotels" ? "hotel" : path === "/car-rental" ? "car" : path === "/tourism" ? "tourism" : "notFound";
  const pageContent: Record<string, PageCopy> = {
    services: language.services,
    flight: language.flight,
    visa: language.visa,
    hotel: language.hotel,
    car: language.car,
    tourism: language.tourism,
    about: language.about,
    contact: language.contact,
  };
  const page = pageContent[key] ?? { title: lang === "ar" ? "الصفحة غير موجودة" : "Page not found", intro: lang === "ar" ? "لم نعثر على الصفحة المطلوبة. يمكنك العودة إلى الرئيسية أو استعراض خدماتنا." : "We couldn't find that page. Return home or explore our services.", bullets: [] as string[] };
  const isServices = key === "services";
  const isServiceDetail = ["flight", "visa", "hotel", "car", "tourism"].includes(key);
  const serviceTitle = page.title;
  const digits = siteConfig.whatsappNumber.replace(/\D/g, "");
  const inquiryMessage = lang === "ar"
    ? `مرحبًا معك، أريد الاستفسار عن: ${serviceTitle}\nالوجهة: ${destination || "لم أحدد بعد"}\nالتاريخ: ${travelDate || "مرن"}\nعدد المسافرين: ${travellers}\nتفاصيل إضافية: ${details || "لا توجد"}`
    : `Hello MAAK, I would like to enquire about: ${serviceTitle}\nDestination: ${destination || "Not decided yet"}\nDate: ${travelDate || "Flexible"}\nTravellers: ${travellers}\nAdditional details: ${details || "None"}`;
  const inquiryUrl = `https://wa.me/${digits}?text=${encodeURIComponent(inquiryMessage)}`;
  const serviceList = routes.filter((r) => r.key !== "services");
  return (
    <main className="inner-page">
      <section className="page-hero"><div className="container">
        <p className="slogan"><span className="slogan-dot" />{t.slogan}</p>
        <h1>{page.title}</h1><p className="lead">{page.intro}</p>
        <div className="actions"><WhatsAppButton topic={key === "flight" || key === "visa" || key === "hotel" || key === "car" ? key : "general"} /><a className="btn btn-ghost" href="/services">{lang === "ar" ? "استعرض الخدمات" : "Explore services"} <ArrowUpRight size={17} /></a></div>
      </div></section>
      {isServices ? <section className="section"><div className="container"><div className="section-head"><h2>{lang === "ar" ? "اختر الخدمة التي تحتاجها" : "Choose the service you need"}</h2><p>{page.intro}</p></div><div className="services page-services">
        {serviceList.map((item) => { const Icon = item.icon; const p = pageContent[item.key]; return <article className="service" key={item.path}><span className="service-icon"><Icon size={26} /></span><h3>{p?.title ?? (lang === "ar" ? "السياحة والرحلات" : "Tourism and trips")}</h3><p>{p?.intro}</p><a className="service-link" href={item.path}>{lang === "ar" ? "اعرف المزيد" : "Learn more"} <ArrowUpRight size={16} /></a></article>; })}
      </div></div></section> : <section className="section"><div className="container page-detail"><div className="page-detail-card"><h2>{lang === "ar" ? "كيف نساعدك؟" : "How we can help"}</h2><ul>{(page.bullets ?? []).map((b) => <li key={b}>{b}</li>)}</ul><p className="note">{language.note}</p>{isServiceDetail && <div className="inquiry-form">
          <h3>{lang === "ar" ? "أرسل تفاصيل طلبك" : "Tell us what you need"}</h3>
          <p>{lang === "ar" ? "املأ ما تعرفه من التفاصيل، وسنجهّز لك رسالة واتساب يمكنك مراجعتها قبل الإرسال." : "Fill in what you know. We’ll prepare a WhatsApp message for you to review before sending."}</p>
          <label htmlFor="inquiry-destination">{lang === "ar" ? "الوجهة أو المدينة" : "Destination or city"}</label>
          <input id="inquiry-destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={lang === "ar" ? "مثال: القاهرة" : "e.g. Cairo"} />
          <div className="inquiry-row">
            <div><label htmlFor="inquiry-date">{lang === "ar" ? "التاريخ التقريبي" : "Approximate date"}</label><input id="inquiry-date" type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} /></div>
            <div><label htmlFor="inquiry-travellers">{lang === "ar" ? "عدد المسافرين" : "Travellers"}</label><select id="inquiry-travellers" value={travellers} onChange={(e) => setTravellers(e.target.value)}>{Array.from({length: 10}, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}</select></div>
          </div>
          <label htmlFor="inquiry-details">{lang === "ar" ? "تفاصيل إضافية (اختياري)" : "Additional details (optional)"}</label>
          <textarea id="inquiry-details" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={lang === "ar" ? "اكتب أي متطلبات أو أسئلة" : "Any requirements or questions"} />
          <a className="btn btn-primary inquiry-submit" href={inquiryUrl} target="_blank" rel="noopener noreferrer"><Send size={18} />{lang === "ar" ? "متابعة عبر واتساب" : "Continue on WhatsApp"}</a>
        </div>}{!isServiceDetail && <WhatsAppButton topic="general" label={language.cta} />}</div><div className="page-side-card glass"><MapPinned size={34} /><h2>{lang === "ar" ? "دائمًا معك" : "Always with you"}</h2><p>{lang === "ar" ? "تواصل مباشر لمناقشة احتياجات رحلتك والخطوات التالية." : "Direct contact to discuss your travel needs and next steps."}</p></div></div></section>}
    </main>
  );
}
