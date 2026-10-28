import { useState } from "react";
import { ArrowLeft, ArrowLeftRight, Bus, CalendarDays, MessageCircle, Users, X } from "lucide-react";
import { siteConfig } from "../config/site";

type Lang = "ar" | "en";
type Country = "" | "YE" | "SA";
type Side = { country: Country; region: string; city: string };
const blankSide: Side = { country: "", region: "", city: "" };

const yemenGovernorates = [
  ["أبين", "Abyan"], ["عدن", "Aden"], ["البيضاء", "Al Bayda"], ["الحديدة", "Al Hudaydah"],
  ["الجوف", "Al Jawf"], ["المحويت", "Al Mahwit"], ["أمانة العاصمة", "Amanat Al Asimah"],
  ["عمران", "Amran"], ["ذمار", "Dhamar"], ["حضرموت", "Hadramaut"], ["حجة", "Hajjah"],
  ["إب", "Ibb"], ["لحج", "Lahij"], ["مأرب", "Marib"], ["ريمة", "Raymah"],
  ["صعدة", "Saada"], ["صنعاء", "Sana'a"], ["شبوة", "Shabwah"], ["تعز", "Taiz"],
  ["الضالع", "Al Dhale'e"], ["المهرة", "Al Mahrah"]
] as const;
const saudiCities = [["مكة المكرمة", "Makkah"], ["جدة", "Jeddah"], ["الرياض", "Riyadh"]] as const;

export default function GroundTransportForm({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  const txt = (a: string, e: string) => ar ? a : e;
  const [departure, setDeparture] = useState<Side>(blankSide);
  const [destination, setDestination] = useState<Side>(blankSide);
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState("");
  const [summary, setSummary] = useState(false);
  const [step, setStep] = useState(1);
  const today = new Date().toISOString().slice(0, 10);
  const digits = siteConfig.whatsappNumber.replace(/\D/g, "");

  const locationName = (side: Side) => {
    if (!side.country) return "";
    const country = side.country === "YE" ? txt("اليمن", "Yemen") : txt("السعودية", "Saudi Arabia");
    const list = side.country === "YE" ? yemenGovernorates : saudiCities;
    const region = list.find(item => item[1] === side.region);
    const regionName = region ? region[ar ? 0 : 1] : "";
    return [country, regionName, side.city.trim()].filter(Boolean).join("، ");
  };
  const setSide = (which: "departure" | "destination", value: Side) => {
    if (which === "departure") setDeparture(value);
    else setDestination(value);
  };
  const renderSide = (which: "departure" | "destination", side: Side) => {
    const options = side.country === "YE" ? yemenGovernorates : saudiCities;
    return <div className="inquiry-field ground-side">
      <label>{txt(which === "departure" ? "بلد المغادرة" : "بلد الوصول", which === "departure" ? "Departure country" : "Destination country")}</label>
      <select value={side.country} onChange={e => setSide(which, { country: e.target.value as Country, region: "", city: "" })}>
        <option value="">{txt("اختر البلد", "Choose country")}</option>
        <option value="YE">{txt("اليمن", "Yemen")}</option>
        <option value="SA">{txt("السعودية", "Saudi Arabia")}</option>
      </select>
      {side.country && <><label>{txt(side.country === "YE" ? "المحافظة" : "المدينة", side.country === "YE" ? "Governorate" : "City")}</label>
        <select value={side.region} onChange={e => setSide(which, { ...side, region: e.target.value, city: "" })}>
          <option value="">{txt(side.country === "YE" ? "اختر المحافظة" : "اختر المدينة", side.country === "YE" ? "Choose governorate" : "Choose city")}</option>
          {options.map(item => <option key={item[1]} value={item[1]}>{item[ar ? 0 : 1]}</option>)}
        </select>
        {side.country === "YE" && side.region && <><label>{txt("المدينة أو المنطقة (اختياري)", "City or area (optional)")}</label>
          <input value={side.city} onChange={e => setSide(which, { ...side, city: e.target.value })} placeholder={txt("اكتب اسم المدينة", "Enter city or area")} /></>}
      </>}
    </div>;
  };

  const rows: [string, string][] = [];
  if (departure.country) rows.push([txt("من", "From"), locationName(departure)]);
  if (destination.country) rows.push([txt("إلى", "To"), locationName(destination)]);
  if (date) rows.push([txt("تاريخ السفر", "Travel date"), date]);
  if (passengers) rows.push([txt("عدد المسافرين", "Passengers"), passengers]);
  const message = rows.length
    ? rows.map(([label, value]) => label + ": " + value).join("\n")
    : txt("لا توجد تفاصيل محددة حتى الآن؛ أود الاستفسار عن النقل البري بين اليمن والسعودية.", "No details specified yet; I'd like to enquire about ground transport between Yemen and Saudi Arabia.");
  const waMessage = txt("مرحبًا فريق معك، أود الاستفسار عن حجز باص أو نقل بري.\n", "Hello MAAK team, I'd like to enquire about a bus ticket or ground transport.\n")
    + message + "\n" + txt("يرجى تأكيد المسار والمواعيد والتكلفة والتوافر قبل تأكيد الحجز.", "Please confirm the route, schedule, price and availability before any booking is confirmed.");
  const waUrl = "https://wa.me/" + digits + "?text=" + encodeURIComponent(waMessage);

  return <div className={`inquiry-form flight-booking-form ground-transport-form maak-service-flow step-${step}`}>
    <header className="maak-flight-head"><button type="button" className="maak-back" onClick={() => step === 1 ? window.history.back() : setStep(s => s - 1)} aria-label={txt("رجوع", "Back")}><ArrowLeft size={20}/></button><div><span>{txt("معك للسفر", "MAAK TRAVEL")}</span><h2>{txt("طلب نقل بري", "Ground transport request")}</h2></div><span className="maak-step-badge">{Math.min(step,3)}/3</span></header><div className="maak-progress"><span style={{width: `${Math.min(step,3)/3*100}%`}}/></div>
    <div className="flight-group" data-step="1">
      <h4>{txt("١. مسار الرحلة", "1. Travel route")}</h4>
      <div className="flight-route-grid ground-route-grid">
        {renderSide("departure", departure)}
        <div className="flight-swap"><ArrowLeftRight size={19} /></div>
        {renderSide("destination", destination)}
      </div>
      <p className="flight-disclaimer">{txt("تُراجع المسارات والمواعيد والتوافر عند التواصل، والطلب لا يُعد حجزًا مؤكدًا.", "Routes, schedules and availability are checked during follow-up; submitting a request does not confirm a booking.")}</p>
    </div>
    <div className="flight-group" data-step="2">
      <h4>{txt("٢. تاريخ السفر وعدد المسافرين", "2. Travel date and passengers")}</h4>
      <div className="flight-input-grid">
        <div className="inquiry-field flight-field"><label><CalendarDays size={16} />{txt("تاريخ السفر (اختياري)", "Travel date (optional)")}</label><input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="inquiry-field flight-field"><label><Users size={16} />{txt("عدد المسافرين (اختياري)", "Passengers (optional)")}</label><select value={passengers} onChange={e => setPassengers(e.target.value)}><option value="">{txt("غير محدد", "Not specified")}</option>{Array.from({ length: 20 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}</select></div>
      </div>
    </div>
    
    {step === 3 && summary && <section className="flight-summary" aria-label={txt("ملخص الطلب", "Request summary")}>
      <div className="flight-summary-head"><h4>{txt("مراجعة ملخص الطلب", "Review request summary")}</h4><button type="button" onClick={() => {setSummary(false);setStep(2);}} aria-label={txt("إغلاق", "Close")}><X size={20} /></button></div>
      <p>{txt("هذا استفسار وليس حجزًا مؤكدًا. يمكنك العودة لتعديل البيانات قبل فتح واتساب.", "This is an enquiry, not a confirmed booking. You can return to edit details before opening WhatsApp.")}</p>
      <dl>{rows.length ? rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>) : <div><dt>{txt("الطلب", "Request")}</dt><dd>{txt("استفسار عام عن حجز الباصات والنقل البري", "General bus and ground transport enquiry")}</dd></div>}</dl>
      <div className="flight-summary-actions"><button type="button" className="btn btn-ghost" onClick={() => {setSummary(false);setStep(2);}}>{txt("العودة للتعديل", "Back to edit")}</button><a className="btn btn-primary" href={waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} />{txt("فتح واتساب وإرسال الطلب", "Open WhatsApp and send")}</a></div>
    </section>}
    {!summary && <div className="flight-step-nav maak-service-flow-nav"><span className="flight-step-count">{txt(`الخطوة ${Math.min(step,3)} من 3`,`Step ${Math.min(step,3)} of 3`)}</span><div className="flight-step-buttons">{step>1 && <button type="button" className="btn btn-ghost" onClick={()=>{setSummary(false);setStep(s=>s-1);}}>{txt("السابق","Back")}</button>}{step<3 && <button type="button" className="btn btn-primary" onClick={()=>{if(step===2)setSummary(true);setStep(s=>Math.min(s+1,3));}}>{txt("التالي","Next")}</button>}</div></div>}
  </div>;
}
