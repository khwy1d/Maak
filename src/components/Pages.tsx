import { ArrowUpRight, Building2, Bus, Car, Compass, FileCheck, HeartPulse, Hotel, Moon, Plane, MapPinned, Send, ShieldCheck, Target, Eye, Flag } from "lucide-react";
import { useState } from "react";
import { siteConfig } from "../config/site";
import { useApp } from "../context/AppContext";
import type { WaTopic } from "../utils/whatsapp";
import WhatsAppButton from "./WhatsAppButton";
import SocialFollow from "./SocialFollow";

const routes = [
  { path: "/services", key: "services", icon: Compass },
  { path: "/flights", key: "flight", topic: "flight" as WaTopic, icon: Plane },
  { path: "/hotels", key: "hotel", topic: "hotel" as WaTopic, icon: Hotel },
  { path: "/car-rental", key: "car", topic: "car" as WaTopic, icon: Car },
  { path: "/tourism", key: "tourism", icon: MapPinned },
  { path: "/medical-tourism", key: "medical", icon: HeartPulse },
  { path: "/security-clearance-egypt", key: "security", icon: ShieldCheck },
  { path: "/umrah", key: "umrah", icon: Moon },
  { path: "/transport", key: "bus", icon: Bus },
  { path: "/real-estate", key: "realEstate", icon: Building2 },
];

type PageCopy = { title: string; intro: string; bullets?: string[] };
type LocaleCopy = {
  services: PageCopy;
  flight: PageCopy;
  visa: PageCopy;
  hotel: PageCopy;
  car: PageCopy;
  tourism: PageCopy;
  medical: PageCopy;
  security: PageCopy;
  umrah: PageCopy;
  bus: PageCopy;
  realEstate: PageCopy;
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
    medical: { title: "السفر العلاجي", intro: "نساعدك في تنسيق استفسارات السفر العلاجي وما يرتبط بها من مواعيد وإقامة وتنقل، مع بقاء القرارات الطبية لدى المختصين.", bullets: ["تنسيق الاستفسارات والمواعيد الطبية", "مناقشة خيارات الإقامة والتنقل", "ترتيب متطلبات السفر للمريض ومرافقه"] },
    security: { title: "الموافقات الأمنية لمصر", intro: "يمكنك الاستفسار عن الإجراءات والمستندات المتعلقة بالموافقات الأمنية للسفر إلى مصر. لا يمكن ضمان الموافقة أو مدة صدورها.", bullets: ["التعرّف على المتطلبات الأولية", "مناقشة المستندات اللازمة", "متابعة الاستفسارات المتعلقة بالطلب"] },
    umrah: { title: "الحج والعمرة", intro: "تواصل معنا للاستفسار عن تنسيق رحلات الحج والعمرة وما قد يرتبط بها من تأشيرات وسكن ونقل.", bullets: ["الاستفسار عن ترتيبات الرحلة", "مناقشة التأشيرات والمستندات", "تنسيق السكن والنقل حسب المتاح"] },
    bus: { title: "حجز الباصات والنقل البري", intro: "أخبرنا بمسار رحلتك وتاريخها لنساعدك في الاستفسار عن خيارات الباصات والنقل البري المحلي أو الدولي.", bullets: ["الاستفسار عن المسارات والمواعيد", "مناقشة الأمتعة واحتياجات الرحلة", "تأكيد السعر والتوافر قبل الحجز"] },
    realEstate: { title: "الخدمات العقارية", intro: "يمكنك التواصل للاستفسار عن تنسيق خدمات عقارية مثل الإيجار والبيع والشراء وإدارة الأملاك في الوجهات التي نخدمها.", bullets: ["تحديد المدينة ونوع العقار", "مناقشة احتياجات الإيجار أو البيع والشراء", "الاستفسار عن تنسيق إدارة الأملاك"] },
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
    medical: { title: "Medical travel", intro: "We help coordinate enquiries about medical travel, appointments, accommodation and transport. Medical decisions remain with qualified professionals.", bullets: ["Coordinate medical enquiries and appointments", "Discuss accommodation and transport options", "Organize travel needs for patients and companions"] },
    security: { title: "Egypt security clearance", intro: "Ask about procedures and documents related to security clearance for travel to Egypt. Approval and processing times cannot be guaranteed.", bullets: ["Understand initial requirements", "Discuss supporting documents", "Follow up on questions about your request"] },
    umrah: { title: "Hajj and Umrah", intro: "Contact us to enquire about coordinating Hajj and Umrah trips, including related visa, accommodation and transport arrangements.", bullets: ["Ask about trip arrangements", "Discuss visas and documents", "Coordinate accommodation and transport subject to availability"] },
    bus: { title: "Bus tickets and ground transport", intro: "Share your route and travel date so we can help enquire about local or international bus and ground transport options.", bullets: ["Ask about routes and schedules", "Discuss luggage and travel needs", "Confirm price and availability before booking"] },
    realEstate: { title: "Real estate services", intro: "Contact us to enquire about coordinating property services such as rentals, sales, purchases and property management in the destinations we serve.", bullets: ["Specify the city and property type", "Discuss rental, sale or purchase needs", "Enquire about property-management coordination"] },
    about: { title: "About MAAK", intro: "MAAK is a travel services brand focused on making travel arrangements clearer and easier, with a helpful point of contact at every step.", bullets: ["Clear, direct communication", "Explain options and steps", "Help organize trip details"] },
    contact: { title: "Contact MAAK", intro: "Start a WhatsApp conversation and tell us which service you need and any initial details about your trip.", bullets: ["Flights and visas", "Hotels and car rental", "General enquiries"] },
    cta: "Enquire on WhatsApp", note: "This website does not complete bookings. Prices, availability and terms are confirmed through direct contact; visa decisions rest with the relevant authorities."
  }
};

export default function Pages({ path }: { path: string }) {
  const { lang, t } = useApp();
  const [departureCity, setDepartureCity] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [travellers, setTravellers] = useState("1");
  const [details, setDetails] = useState("");
  const language = copy[lang];
  const key = path === "/about" || path === "/contact" ? path.slice(1) : path === "/services" || path === "/" ? "services" : path === "/flights" ? "flight" : path === "/hotels" ? "hotel" : path === "/car-rental" ? "car" : path === "/tourism" ? "tourism" : path === "/medical-tourism" ? "medical" : path === "/security-clearance-egypt" ? "security" : path === "/umrah" ? "umrah" : path === "/transport" ? "bus" : path === "/real-estate" ? "realEstate" : "notFound";
  const pageContent: Record<string, PageCopy> = {
    services: language.services,
    flight: language.flight,
    visa: language.visa,
    hotel: language.hotel,
    car: language.car,
    tourism: language.tourism,
    medical: language.medical,
    security: language.security,
    umrah: language.umrah,
    bus: language.bus,
    realEstate: language.realEstate,
    about: language.about,
    contact: language.contact,
  };
  const page = pageContent[key] ?? { title: lang === "ar" ? "الصفحة غير موجودة" : "Page not found", intro: lang === "ar" ? "لم نعثر على الصفحة المطلوبة. يمكنك العودة إلى الرئيسية أو استعراض خدماتنا." : "We couldn't find that page. Return home or explore our services.", bullets: [] as string[] };
  const isServices = key === "services";
  const isServiceDetail = ["flight", "visa", "hotel", "car", "tourism", "medical", "security", "umrah", "bus", "realEstate"].includes(key);
  const serviceTitle = page.title;
  const digits = siteConfig.whatsappNumber.replace(/\D/g, "");
  const noFormServices = ["tourism", "medical", "security", "umrah", "realEstate"];
  const inquiryMessage = noFormServices.includes(key)
    ? (lang === "ar"
      ? `مرحبًا معك، أريد معرفة تفاصيل خدمة ${serviceTitle}. ما المتطلبات والإجراءات والتكلفة؟`
      : `Hello MAAK, I would like to know more about your ${serviceTitle} service. What are the requirements, process and cost?`)
    : (lang === "ar"
      ? `مرحبًا معك، أريد الاستفسار عن: ${serviceTitle}${key === "flight" ? `\nمدينة المغادرة: ${departureCity || "لم أحدد بعد"}` : ""}\n${key === "flight" ? "مدينة الوصول" : "الوجهة"}: ${destination || "لم أحدد بعد"}\nالتاريخ: ${travelDate || "مرن"}\nعدد المسافرين: ${travellers}\nتفاصيل إضافية: ${details || "لا توجد"}`
      : `Hello MAAK, I would like to enquire about: ${serviceTitle}${key === "flight" ? `\nDeparture city: ${departureCity || "Not decided yet"}` : ""}\n${key === "flight" ? "Arrival city" : "Destination"}: ${destination || "Not decided yet"}\nDate: ${travelDate || "Flexible"}\nTravellers: ${travellers}\nAdditional details: ${details || "None"}`);
  const inquiryUrl = `https://wa.me/${digits}?text=${encodeURIComponent(inquiryMessage)}`;
  const serviceList = routes.filter((r) => r.key !== "services");
  const aboutPrinciples = lang === "ar" ? [
    { title: "رسالتنا", text: "تسهيل تجربة السفر عبر خدمات واضحة وتواصل مباشر، ومساعدة عملائنا على ترتيب رحلاتهم بثقة وراحة.", icon: Flag },
    { title: "رؤيتنا", text: "أن نكون الخيار الموثوق والقريب للمسافرين، وأن نجعل التخطيط للرحلات أكثر بساطة ووضوحًا.", icon: Eye },
    { title: "مهمتنا", text: "تقديم إرشاد عملي وخيارات مناسبة لاحتياجات كل عميل، ومرافقته في خطوات السفر من التخطيط حتى الوصول.", icon: Target },
  ] : [
    { title: "Our Message", text: "To make travel easier through clear services and direct communication, helping customers arrange their trips with confidence and peace of mind.", icon: Flag },
    { title: "Our Vision", text: "To become a trusted, approachable choice for travelers and make trip planning simpler and clearer.", icon: Eye },
    { title: "Our Mission", text: "To provide practical guidance and suitable options for each customer, supporting them from planning through arrival.", icon: Target },
  ];
  return (
    <main className="inner-page">
      <section className="page-hero"><div className="container">
        {!isServices && key !== "about" && !isServiceDetail && <p className="slogan"><span className="slogan-dot" />{t.slogan}</p>}
        <h1>{page.title}</h1><p className="lead">{page.intro}</p>
        {!isServices && <div className="actions"><WhatsAppButton topic={key === "flight" || key === "visa" || key === "hotel" || key === "car" ? key : "general"} /><a className="btn btn-ghost" href="/services">{lang === "ar" ? "استعرض الخدمات" : "Explore services"} <ArrowUpRight size={17} /></a></div>}
      </div></section>
      {isServices ? <section className="section"><div className="container"><div className="section-head"><h2>{lang === "ar" ? "اختر الخدمة التي تحتاجها" : "Choose the service you need"}</h2><p>{page.intro}</p></div><div className="services page-services">
        {serviceList.map((item) => { const Icon = item.icon; const p = pageContent[item.key]; return <a className="service service-card-link" href={item.path} key={item.path} aria-label={p?.title ?? (lang === "ar" ? "السياحة والرحلات" : "Tourism and trips")}><span className="service-icon"><Icon size={26} aria-hidden="true" /></span><h3>{p?.title ?? (lang === "ar" ? "السياحة والرحلات" : "Tourism and trips")}</h3><p>{p?.intro}</p></a>; })}
      </div></div></section> : key === "about" ? <section className="section about-principles-section"><div className="container"><div className="services about-principles">{aboutPrinciples.map((item) => { const Icon = item.icon; return <article className="service about-principle-card" key={item.title}><span className="service-icon"><Icon size={26} aria-hidden="true" /></span><h3>{item.title}</h3><p>{item.text}</p></article>; })}</div></div></section> : <section className="section"><div className={`container page-detail${isServiceDetail ? " page-detail-service" : ""}`}><div className="page-detail-card">{!isServiceDetail && <><h2>{lang === "ar" ? "كيف نساعدك؟" : "How we can help"}</h2><ul>{(page.bullets ?? []).map((b) => <li key={b}>{b}</li>)}</ul><p className="note">{language.note}</p></>}{isServiceDetail && !noFormServices.includes(key) && <div className="inquiry-form">
          <h3>{lang === "ar" ? "أرسل تفاصيل طلبك" : "Tell us what you need"}</h3>
          <p>{lang === "ar" ? "املأ ما تعرفه من التفاصيل، وسنجهّز لك رسالة واتساب يمكنك مراجعتها قبل الإرسال." : "Fill in what you know. We’ll prepare a WhatsApp message for you to review before sending."}</p>
          {key === "flight" && <><label htmlFor="inquiry-departure">{lang === "ar" ? "المغادرة من" : "Departure city"}</label><input id="inquiry-departure" value={departureCity} onChange={(e) => setDepartureCity(e.target.value)} placeholder={lang === "ar" ? "مثال: تعز" : "e.g. Taiz"} /></>}
          <label htmlFor="inquiry-destination">{key === "flight" ? (lang === "ar" ? "الوصول إلى" : "Arrival city") : (lang === "ar" ? "الوجهة أو المدينة" : "Destination or city")}</label>
          <input id="inquiry-destination" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder={lang === "ar" ? (key === "flight" ? "مثال: القاهرة" : "مثال: القاهرة") : "e.g. Cairo"} />
          <div className="inquiry-row">
            <div><label htmlFor="inquiry-date">{lang === "ar" ? "التاريخ التقريبي" : "Approximate date"}</label><input id="inquiry-date" type="date" value={travelDate} onChange={(e) => setTravelDate(e.target.value)} /></div>
            <div><label htmlFor="inquiry-travellers">{lang === "ar" ? "عدد المسافرين" : "Travellers"}</label><select id="inquiry-travellers" value={travellers} onChange={(e) => setTravellers(e.target.value)}>{Array.from({length: 10}, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}</select></div>
          </div>
          <label htmlFor="inquiry-details">{lang === "ar" ? "تفاصيل إضافية (اختياري)" : "Additional details (optional)"}</label>
          <textarea id="inquiry-details" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} placeholder={lang === "ar" ? "اكتب أي متطلبات أو أسئلة" : "Any requirements or questions"} />
          <a className="btn btn-primary inquiry-submit" href={inquiryUrl} target="_blank" rel="noopener noreferrer"><Send size={18} />{lang === "ar" ? "متابعة عبر واتساب" : "Continue on WhatsApp"}</a>
        </div>}{(!isServiceDetail || noFormServices.includes(key)) && <a className="btn btn-primary inquiry-submit" href={inquiryUrl} target="_blank" rel="noopener noreferrer"><Send size={18} />{lang === "ar" ? "استفسر عن تفاصيل الخدمة عبر واتساب" : "Ask about this service on WhatsApp"}</a>}</div>{key !== "flight" && <div className="page-side-card glass"><MapPinned size={34} /><h2>{lang === "ar" ? "دائمًا معك" : "Always with you"}</h2><p>{lang === "ar" ? "تواصل مباشر لمناقشة احتياجات رحلتك والخطوات التالية." : "Direct contact to discuss your travel needs and next steps."}</p></div>}</div></section>}
      {key === "contact" && <SocialFollow />}
    </main>
  );
}
