export type Lang = "ar" | "en";

const ar = {
  meta: { title: "معك | MAAK — دائمًا معك", description: "معك لخدمات السفر: حجز تذاكر الطيران، خدمات التأشيرات، حجوزات الفنادق، وتأجير السيارات. تواصل معنا عبر واتساب." },
  brand: "معك | MAAK",
  slogan: "دائمًا معك",
  a11y: { menu: "فتح القائمة", close: "إغلاق القائمة", lang: "Switch to English", themeDark: "التبديل إلى الوضع الداكن", themeLight: "التبديل إلى الوضع الفاتح", nav: "التنقل الرئيسي", logo: "شعار معك" },
  nav: { home: "الرئيسية", services: "خدماتنا", about: "من نحن", contact: "تواصل معنا" },
  langLabel: "English",
  whatsapp: "تواصل عبر واتساب",
  hero: {
    title: "رحلتك تبدأ من هنا.",
    text: "نرافقك في ترتيبات سفرك، من حجز الطيران إلى الإقامة والخدمات التي تحتاجها.",
    explore: "استكشف الخدمات",
    chips: ["طيران", "تأشيرات", "فنادق", "سيارات"],
  },
  services: {
    title: "خدمات سفر بسيطة وواضحة",
    intro: "اختر الخدمة التي تحتاجها وابدأ المحادثة معنا مباشرة.",
    cta: "استفسر عبر واتساب",
    items: [
      { key: "flight", ar: "حجز تذاكر الطيران", en: "Flight Bookings", desc: "نساعدك في الاستفسار عن خيارات الرحلات وترتيب حجز تذكرتك بما يناسب وجهتك وموعد سفرك." },
      { key: "visa", ar: "خدمات التأشيرات", en: "Visa Services", desc: "نوضّح لك الخطوات والمستندات المعتادة ونرافقك في تجهيز طلبك. القرار النهائي يعود للجهة المختصة." },
      { key: "hotel", ar: "حجوزات الفنادق", en: "Hotel Reservations", desc: "نساعدك في اختيار الإقامة المناسبة لوجهتك ومدة إقامتك واحتياجاتك." },
      { key: "car", ar: "تأجير السيارات", en: "Car Rentals", desc: "نساعدك في ترتيب سيارة تناسب رحلتك، سواء للتنقل اليومي أو للسفر مع العائلة." },
    ],
  },
  why: {
    title: "لماذا معك؟",
    intro: "نؤمن أن السفر يبدأ براحة البال. هذه هي المبادئ التي نعمل بها.",
    items: [
      { t: "تواصل واضح", d: "نشرح الخيارات والخطوات بلغة بسيطة ومباشرة." },
      { t: "ترتيبات أبسط", d: "نختصر عليك تعقيد التفاصيل لتركّز على رحلتك." },
      { t: "مساعدة في الاختيار", d: "نساعدك في الوصول إلى الخيار الأنسب لاحتياجك." },
      { t: "تواصل مباشر", d: "محادثة واحدة عبر واتساب بدل التنقل بين القنوات." },
    ],
  },
  how: {
    title: "كيف تبدأ؟",
    steps: [
      { t: "اختر الخدمة", d: "حدّد ما تحتاجه: طيران، تأشيرة، فندق أو سيارة." },
      { t: "تواصل عبر واتساب", d: "اضغط الزر وستفتح لك محادثة جاهزة برسالة مبدئية." },
      { t: "ناقش احتياجاتك", d: "نستمع إلى متطلباتك ونساعدك في الخطوات التالية." },
    ],
    note: "هذا الموقع لا يُتمّ الحجوزات بنفسه، وتتم معالجة جميع الطلبات عبر التواصل المباشر.",
  },
  about: {
    title: "عن معك",
    p1: "معك علامة خدمات سفر تهدف إلى جعل ترتيبات السفر أسهل، وأن تكون نقطة تواصل قريبة ومساعدة في كل خطوة.",
    p2: "اسمنا وعدنا: حين تسافر، تجد من يرافقك ويجيب عن أسئلتك.",
  },
  contact: {
    title: "هل لديك سؤال عن رحلتك؟",
    text: "راسلنا عبر واتساب واذكر الخدمة التي تحتاجها. نتواصل معك لفهم متطلباتك ومساعدتك في الخطوات التالية.",
    how: "الطلبات تُعالج عبر المحادثة المباشرة، ولا يتم أي حجز من خلال الموقع.",
    email: "البريد الإلكتروني",
    address: "العنوان",
  },
  faq: {
    title: "أسئلة شائعة",
    items: [
      { q: "كيف أستفسر عن رحلة طيران؟", a: "اضغط على «استفسر عبر واتساب» في بطاقة حجز تذاكر الطيران، وأرسل وجهتك وتواريخ سفرك المتوقعة، وسنتابع معك." },
      { q: "هل يمكنني السؤال عن متطلبات التأشيرة؟", a: "نعم، يمكنك الاستفسار عن الخطوات والمستندات المعتادة. قبول الطلب أو رفضه يعود للجهة المختصة، ولا يمكننا ضمان نتيجة أي طلب." },
      { q: "هل يمكنني طلب مساعدة في الفنادق أو تأجير السيارات؟", a: "نعم، تواصل معنا عبر واتساب وأخبرنا باحتياجك لنساعدك في الخيارات المتاحة." },
      { q: "هل يُكمل الموقع الحجز إلكترونيًا؟", a: "لا. الموقع للتعريف بالخدمات فقط، وتتم جميع الطلبات عبر التواصل المباشر معنا." },
      { q: "كيف أتواصل مع الشركة؟", a: "عبر زر واتساب الظاهر في الموقع، وستفتح لك محادثة جاهزة برسالة مبدئية يمكنك تعديلها." },
    ],
  },
  footer: { desc: "معك: خدمات سفر تجعل ترتيباتك أبسط، ودائمًا بجانبك.", links: "روابط", services: "الخدمات", rights: "جميع الحقوق محفوظة." },
  wa: {
    general: "مرحبًا، أرغب في الاستفسار عن خدمات معك.",
    flight: "مرحبًا، أرغب في الاستفسار عن حجز تذاكر الطيران.",
    visa: "مرحبًا، أرغب في الاستفسار عن خدمات التأشيرات.",
    hotel: "مرحبًا، أرغب في الاستفسار عن حجوزات الفنادق.",
    car: "مرحبًا، أرغب في الاستفسار عن تأجير السيارات.",
  },
};

const en: typeof ar = {
  meta: { title: "MAAK | معك — Always with you", description: "MAAK travel services: flight bookings, visa services, hotel reservations and car rentals. Get in touch on WhatsApp." },
  brand: "MAAK | معك",
  slogan: "Always with you.",
  a11y: { menu: "Open menu", close: "Close menu", lang: "التبديل إلى العربية", themeDark: "Switch to dark mode", themeLight: "Switch to light mode", nav: "Main navigation", logo: "MAAK logo" },
  nav: { home: "Home", services: "Services", about: "About us", contact: "Contact" },
  langLabel: "العربية",
  whatsapp: "Chat on WhatsApp",
  hero: {
    title: "Your journey starts here.",
    text: "We make travel arrangements simpler, with support for flights, visas, hotels, and car rentals.",
    explore: "Explore services",
    chips: ["Flights", "Visas", "Hotels", "Cars"],
  },
  services: {
    title: "Simple, clear travel services",
    intro: "Pick the service you need and start a conversation with us directly.",
    cta: "Inquire on WhatsApp",
    items: [
      { key: "flight", ar: "حجز تذاكر الطيران", en: "Flight Bookings", desc: "We help you explore flight options and arrange your ticket to fit your destination and travel dates." },
      { key: "visa", ar: "خدمات التأشيرات", en: "Visa Services", desc: "We explain the usual steps and documents and support you in preparing your application. Final decisions rest with the relevant authority." },
      { key: "hotel", ar: "حجوزات الفنادق", en: "Hotel Reservations", desc: "We help you find accommodation that suits your destination, length of stay and needs." },
      { key: "car", ar: "تأجير السيارات", en: "Car Rentals", desc: "We help you arrange a car that fits your trip, from daily getting around to family travel." },
    ],
  },
  why: {
    title: "Why MAAK?",
    intro: "Good travel starts with peace of mind. These are the principles we work by.",
    items: [
      { t: "Clear communication", d: "We explain options and steps in plain, direct language." },
      { t: "Simpler arrangements", d: "We handle the detail so you can focus on your trip." },
      { t: "Help choosing", d: "We help you reach the option that suits your needs." },
      { t: "Direct contact", d: "One WhatsApp conversation instead of juggling channels." },
    ],
  },
  how: {
    title: "How to get started",
    steps: [
      { t: "Choose a service", d: "Decide what you need: flights, visa, hotel or car." },
      { t: "Contact us on WhatsApp", d: "Tap the button and a chat opens with a ready first message." },
      { t: "Discuss your needs", d: "We listen to your requirements and help with the next steps." },
    ],
    note: "This website does not complete bookings itself. All requests are handled through direct contact.",
  },
  about: {
    title: "About MAAK",
    p1: "MAAK is a travel services brand built to make travel arrangements easier, and to be a helpful, approachable point of contact at every step.",
    p2: "Our name is our promise: when you travel, someone is with you to answer your questions.",
  },
  contact: {
    title: "Have a question about your trip?",
    text: "Message us on WhatsApp and tell us which service you need. We'll follow up to understand your requirements and help with the next steps.",
    how: "Requests are handled through direct conversation. No booking is made through this website.",
    email: "Email",
    address: "Address",
  },
  faq: {
    title: "Frequently asked questions",
    items: [
      { q: "How can I inquire about a flight?", a: "Tap “Inquire on WhatsApp” on the Flight Bookings card and send your destination and expected travel dates. We'll follow up with you." },
      { q: "Can I ask about visa requirements?", a: "Yes, you can ask about the usual steps and documents. Approval or refusal is decided by the relevant authority, and we can't guarantee the outcome of any application." },
      { q: "Can I request hotel or car rental assistance?", a: "Yes. Contact us on WhatsApp and tell us what you need, and we'll help with the available options." },
      { q: "Does the website complete bookings online?", a: "No. The website introduces our services, and all requests are handled through direct contact." },
      { q: "How do I contact the company?", a: "Use any WhatsApp button on the site. A chat opens with a first message you can edit." },
    ],
  },
  footer: { desc: "MAAK: travel services that make your arrangements simpler, and always with you.", links: "Links", services: "Services", rights: "All rights reserved." },
  wa: {
    general: "Hello, I'd like to inquire about MAAK's services.",
    flight: "Hello, I'd like to inquire about flight bookings.",
    visa: "Hello, I'd like to inquire about visa services.",
    hotel: "Hello, I'd like to inquire about hotel reservations.",
    car: "Hello, I'd like to inquire about car rentals.",
  },
};

export const translations: Record<Lang, typeof ar> = { ar, en };
