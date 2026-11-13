import { useState } from "react";
import { ArrowLeft, MapPin, MessageCircle, X } from "lucide-react";
import { siteConfig } from "../config/site";
import { useDesktopFormLayout } from "../hooks/useDesktopFormLayout";
import { buildWhatsAppUrl } from "../utils/whatsapp";

type Lang = "ar" | "en";
type Country = "" | "YE" | "EG";

const countries: { code: Exclude<Country, "">; ar: string; en: string; cities: [string, string][] }[] = [
  { code: "YE", ar: "اليمن", en: "Yemen", cities: [["عدن", "Aden"], ["صنعاء", "Sana'a"], ["تعز", "Taiz"], ["المكلا", "Mukalla"], ["سيئون", "Seiyun"], ["الحديدة", "Al Hudaydah"], ["مأرب", "Marib"], ["إب", "Ibb"], ["ذمار", "Dhamar"], ["لحج", "Lahij"]] },
  { code: "EG", ar: "مصر", en: "Egypt", cities: [["القاهرة", "Cairo"], ["الإسكندرية", "Alexandria"], ["شرم الشيخ", "Sharm El Sheikh"], ["الغردقة", "Hurghada"], ["الأقصر", "Luxor"], ["أسوان", "Aswan"], ["الجيزة", "Giza"]] },
];

export default function CarRentalForm({ lang }: { lang: Lang }) {
  const desktopForm = useDesktopFormLayout();
  const ar = lang === "ar";
  const txt = (a: string, e: string) => ar ? a : e;
  const [country, setCountry] = useState<Country>("");
  const [city, setCity] = useState("");
  const [pickupArea, setPickupArea] = useState("");
  const [dropoffCity, setDropoffCity] = useState("");
  const [dropoffArea, setDropoffArea] = useState("");
  const [summary, setSummary] = useState(false);
  const locationComplete = !!country && !!city.trim();
  const selectedCountry = countries.find(item => item.code === country);
  const rows: [string, string][] = [];
  if (selectedCountry) rows.push([txt("الدولة", "Country"), ar ? selectedCountry.ar : selectedCountry.en]);
  if (city.trim()) rows.push([txt("مدينة الاستلام", "Pickup city"), city.trim()]);
  if (pickupArea.trim()) rows.push([txt("موقع الاستلام", "Pickup location"), pickupArea.trim()]);
  if (dropoffCity.trim()) rows.push([txt("مدينة التسليم", "Return city"), dropoffCity.trim()]);
  if (dropoffArea.trim()) rows.push([txt("موقع التسليم", "Return location"), dropoffArea.trim()]);
  const request = rows.length ? rows.map(([label, value]) => label + ": " + value).join("\n") : txt("لا توجد تفاصيل محددة حتى الآن؛ أود الاستفسار عن تأجير سيارة.", "No details specified yet; I'd like to enquire about car rental.");
  const message = txt("مرحبًا فريق معك، أود الاستفسار عن تأجير سيارة.\n", "Hello MAAK team, I'd like to enquire about car rental.\n")
    + request + "\n" + txt("يرجى تأكيد السعر والتوافر والشروط قبل تأكيد أي حجز.", "Please confirm price, availability and terms before any rental is confirmed.");
  const waUrl = buildWhatsAppUrl(siteConfig.whatsappNumber, message);

  return <div className={`inquiry-form flight-booking-form car-rental-form maak-service-flow maak-flight-flow${summary ? " desktop-reviewing" : ""}`} dir={ar ? "rtl" : "ltr"}>
    <header className="maak-flight-head">
      <button type="button" className="maak-back" onClick={() => window.history.back()} aria-label={txt("رجوع", "Back")}><ArrowLeft size={20}/></button>
      <div><span>{txt("معك للسفر", "MAAK TRAVEL")}</span><h2>{txt("طلب تأجير سيارة", "Car rental request")}</h2></div>
    </header>
    {!summary && <div className="flight-group">
      <h4><MapPin size={18} />{txt("مكان الاستلام والتسليم", "Pickup and return location")}</h4>
      <div className="flight-input-grid">
        <div className="inquiry-field flight-field">
          <label htmlFor="car-rental-country">{txt("الدولة", "Country")} *</label>
          <select id="car-rental-country" required value={country} onChange={e => { setCountry(e.target.value as Country); setCity(""); setPickupArea(""); setDropoffCity(""); setDropoffArea(""); }}>
            <option value="">{txt("اختر الدولة", "Choose a country")}</option>
            {countries.map(item => <option key={item.code} value={item.code}>{ar ? item.ar : item.en}</option>)}
          </select>
        </div>
        <div className="inquiry-field flight-field">
          <label htmlFor="car-rental-pickup-city">{txt("مدينة الاستلام", "Pickup city")} *</label>
          <input id="car-rental-pickup-city" required list="car-rental-pickup-cities" value={city} onChange={e => setCity(e.target.value)} placeholder={txt("اكتب أو اختر المدينة", "Type or choose a city")} />
          <datalist id="car-rental-pickup-cities">{(selectedCountry?.cities ?? countries.flatMap(item => item.cities)).map(item => <option key={item[1]} value={ar ? item[0] : item[1]} />)}</datalist>
        </div>
        <div className="inquiry-field flight-field">
          <label htmlFor="car-rental-pickup-area">{txt("موقع الاستلام", "Pickup location")} <small className="field-requirement">{txt("(اختياري)", "(optional)")}</small></label>
          <input id="car-rental-pickup-area" value={pickupArea} onChange={e => setPickupArea(e.target.value)} placeholder={txt("المطار، الفندق، أو المنطقة", "Airport, hotel or area")} />
        </div>
        <div className="inquiry-field flight-field">
          <label htmlFor="car-rental-return-city">{txt("مدينة التسليم", "Return city")} <small className="field-requirement">{txt("(اختياري)", "(optional)")}</small></label>
          <input id="car-rental-return-city" list="car-rental-return-cities" value={dropoffCity} onChange={e => setDropoffCity(e.target.value)} placeholder={txt("نفس المدينة أو مدينة أخرى", "Same city or another city")} />
          <datalist id="car-rental-return-cities">{(selectedCountry?.cities ?? countries.flatMap(item => item.cities)).map(item => <option key={item[1]} value={ar ? item[0] : item[1]} />)}</datalist>
        </div>
        <div className="inquiry-field flight-field">
          <label htmlFor="car-rental-return-area">{txt("موقع التسليم", "Return location")} <small className="field-requirement">{txt("(اختياري)", "(optional)")}</small></label>
          <input id="car-rental-return-area" value={dropoffArea} onChange={e => setDropoffArea(e.target.value)} placeholder={txt("المطار، الفندق، أو المنطقة", "Airport, hotel or area")} />
        </div>
      </div>
      <p className="flight-disclaimer">{txt("الدول المتاحة حاليًا: مصر واليمن، مع تأكيد توفر السيارة قبل الحجز. يمكن كتابة أي مدينة أو منطقة يدويًا.", "Currently available countries: Egypt and Yemen. Vehicle availability is confirmed before booking. You can type any city or area manually.")}</p>
    </div>}
    {summary && <section className="flight-summary" aria-label={txt("ملخص الطلب", "Request summary")}>
      <div className="flight-summary-head"><h4>{txt("راجع طلبك", "Review your request")}</h4><button type="button" onClick={() => setSummary(false)} aria-label={txt("إغلاق", "Close")}><X size={20} /></button></div>
      <p>{txt("تأكد من التفاصيل قبل إرسال الاستفسار.", "Please review the details before sending your enquiry.")}</p>
      <dl>{rows.length ? rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>) : <div><dt>{txt("الطلب", "Request")}</dt><dd>{txt("استفسار عام عن تأجير السيارات", "General car rental enquiry")}</dd></div>}</dl>
      <div className="flight-summary-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setSummary(false)}>{txt("العودة للتعديل", "Back to edit")}</button>
        <a className="btn btn-primary" href={waUrl} data-save-inquiry="true" data-inquiry-service="car_rental" data-request-data={JSON.stringify({ form_data: { country, pickup_city: city.trim(), pickup_area: pickupArea.trim(), return_city: dropoffCity.trim(), return_area: dropoffArea.trim() } })} target="_blank" rel="noopener noreferrer"><MessageCircle size={19}/>{txt("إرسال الطلب", "Send enquiry")}</a>
      </div>
    </section>}
    {!summary && <div className={desktopForm ? "maak-desktop-actions" : "flight-step-nav maak-service-flow-nav maak-bottom-actions"}>
      <button type="button" className={desktopForm ? "maak-next" : "btn btn-primary maak-next"} disabled={!locationComplete} onClick={() => { setSummary(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>{txt("مراجعة الطلب", "Review request")}<ArrowLeft size={19}/></button>
    </div>}
  </div>;
}
