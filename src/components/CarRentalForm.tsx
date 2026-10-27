import { useState } from "react";
import { CalendarDays, Car, Clock3, MapPin, MessageCircle, Users, X } from "lucide-react";
import { siteConfig } from "../config/site";

type Lang = "ar" | "en";
type Country = "" | "YE" | "EG";

const countries: { code: Exclude<Country, "">; ar: string; en: string; cities: [string, string][] }[] = [
  { code: "YE", ar: "اليمن", en: "Yemen", cities: [["عدن", "Aden"], ["صنعاء", "Sana'a"], ["تعز", "Taiz"], ["المكلا", "Mukalla"], ["سيئون", "Seiyun"], ["الحديدة", "Al Hudaydah"], ["مأرب", "Marib"], ["إب", "Ibb"], ["ذمار", "Dhamar"], ["لحج", "Lahij"]] },
  { code: "EG", ar: "مصر", en: "Egypt", cities: [["القاهرة", "Cairo"], ["الإسكندرية", "Alexandria"], ["شرم الشيخ", "Sharm El Sheikh"], ["الغردقة", "Hurghada"], ["الأقصر", "Luxor"], ["أسوان", "Aswan"], ["الجيزة", "Giza"]] },
];

export default function CarRentalForm({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  const txt = (a: string, e: string) => ar ? a : e;
  const [country, setCountry] = useState<Country>("");
  const [city, setCity] = useState("");
  const [pickupArea, setPickupArea] = useState("");
  const [dropoffCity, setDropoffCity] = useState("");
  const [dropoffArea, setDropoffArea] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [vehicle, setVehicle] = useState("any");
  const [driver, setDriver] = useState("any");
  const [passengers, setPassengers] = useState("");
  const [cars, setCars] = useState("1");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState(false);
  const [step, setStep] = useState(1);
  const today = new Date().toISOString().slice(0, 10);
  const digits = siteConfig.whatsappNumber.replace(/\D/g, "");
  const selectedCountry = countries.find(item => item.code === country);
  const vehicleName: Record<string, [string, string]> = {
    any: ["أي سيارة مناسبة", "Any suitable vehicle"], economy: ["اقتصادية", "Economy"], sedan: ["سيدان", "Sedan"], suv: ["دفع رباعي / SUV", "SUV / 4x4"], van: ["عائلية أو فان", "Family car / van"], luxury: ["فاخرة", "Luxury"],
  };
  const driverName: Record<string, [string, string]> = {
    any: ["لا تفضيل", "No preference"], self: ["بدون سائق", "Self-drive"], with: ["مع سائق", "With driver"],
  };
  const countryName = selectedCountry ? (ar ? selectedCountry.ar : selectedCountry.en) : "";
  const rows: [string, string][] = [];
  if (countryName) rows.push([txt("الدولة", "Country"), countryName]);
  if (city.trim()) rows.push([txt("مدينة الاستلام", "Pickup city"), city.trim()]);
  if (pickupArea.trim()) rows.push([txt("موقع الاستلام", "Pickup location"), pickupArea.trim()]);
  if (dropoffCity.trim()) rows.push([txt("مدينة التسليم", "Return city"), dropoffCity.trim()]);
  if (dropoffArea.trim()) rows.push([txt("موقع التسليم", "Return location"), dropoffArea.trim()]);
  if (pickupDate) rows.push([txt("تاريخ الاستلام", "Pickup date"), pickupDate]);
  if (pickupTime) rows.push([txt("وقت الاستلام", "Pickup time"), pickupTime]);
  if (returnDate) rows.push([txt("تاريخ التسليم", "Return date"), returnDate]);
  if (returnTime) rows.push([txt("وقت التسليم", "Return time"), returnTime]);
  if (vehicle !== "any") rows.push([txt("نوع السيارة", "Vehicle type"), vehicleName[vehicle][ar ? 0 : 1]]);
  if (driver !== "any") rows.push([txt("طريقة التأجير", "Rental option"), driverName[driver][ar ? 0 : 1]]);
  if (passengers) rows.push([txt("عدد الركاب", "Passengers"), passengers]);
  if (cars !== "1") rows.push([txt("عدد السيارات", "Number of cars"), cars]);
  if (notes.trim()) rows.push([txt("تفاصيل إضافية", "Additional details"), notes.trim()]);
  const request = rows.length ? rows.map(([label, value]) => label + ": " + value).join("\n") : txt("لا توجد تفاصيل محددة حتى الآن؛ أود الاستفسار عن تأجير سيارة.", "No details specified yet; I'd like to enquire about car rental.");
  const message = txt("مرحبًا فريق معك، أود الاستفسار عن تأجير سيارة.\n", "Hello MAAK team, I'd like to enquire about car rental.\n")
    + request + "\n" + txt("يرجى تأكيد السعر والتوافر والشروط قبل تأكيد أي حجز.", "Please confirm price, availability and terms before any rental is confirmed.");
  const waUrl = "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);

  return <div className={`inquiry-form flight-booking-form car-rental-form step-${step}`}>
    <h3>{txt("قدّم طلب تأجير سيارة", "Request a car rental")}</h3>
    <p>{txt("اختر ما تعرفه من التفاصيل واترك الباقي فارغًا. جميع الحقول اختيارية، والطلب لا يُعد حجزًا مؤكدًا.", "Fill in the details you know and leave the rest blank. All fields are optional; this is not a confirmed rental.")}</p>
    <div className="flight-group" data-step="1">
      <h4><MapPin size={18} />{txt("١. مكان الاستلام والتسليم", "1. Pickup and return location")}</h4>
      <div className="flight-input-grid">
        <div className="inquiry-field flight-field">
          <label>{txt("الدولة", "Country")}</label>
          <select value={country} onChange={e => { setCountry(e.target.value as Country); setCity(""); setPickupArea(""); setDropoffCity(""); setDropoffArea(""); }}>
            <option value="">{txt("اختر الدولة", "Choose a country")}</option>
            {countries.map(item => <option key={item.code} value={item.code}>{ar ? item.ar : item.en}</option>)}
          </select>
        </div>
        <div className="inquiry-field flight-field">
          <label>{txt("مدينة الاستلام", "Pickup city")}</label>
          <input list="car-rental-pickup-cities" value={city} onChange={e => setCity(e.target.value)} placeholder={txt("اكتب أو اختر المدينة", "Type or choose a city")} />
          <datalist id="car-rental-pickup-cities">{(selectedCountry?.cities ?? countries.flatMap(item => item.cities)).map(item => <option key={item[1]} value={ar ? item[0] : item[1]} />)}</datalist>
        </div>
        <div className="inquiry-field flight-field">
          <label>{txt("موقع الاستلام (اختياري)", "Pickup location (optional)")}</label>
          <input value={pickupArea} onChange={e => setPickupArea(e.target.value)} placeholder={txt("المطار، الفندق، أو المنطقة", "Airport, hotel or area")} />
        </div>
        <div className="inquiry-field flight-field">
          <label>{txt("مدينة التسليم (اختياري)", "Return city (optional)")}</label>
          <input list="car-rental-return-cities" value={dropoffCity} onChange={e => setDropoffCity(e.target.value)} placeholder={txt("نفس المدينة أو مدينة أخرى", "Same city or another city")} />
          <datalist id="car-rental-return-cities">{(selectedCountry?.cities ?? countries.flatMap(item => item.cities)).map(item => <option key={item[1]} value={ar ? item[0] : item[1]} />)}</datalist>
        </div>
        <div className="inquiry-field flight-field">
          <label>{txt("موقع التسليم (اختياري)", "Return location (optional)")}</label>
          <input value={dropoffArea} onChange={e => setDropoffArea(e.target.value)} placeholder={txt("المطار، الفندق، أو المنطقة", "Airport, hotel or area")} />
        </div>
      </div>
      <p className="flight-disclaimer">{txt("الدول المتاحة حاليًا: مصر واليمن، مع تأكيد توفر السيارة قبل الحجز. يمكن كتابة أي مدينة أو منطقة يدويًا.", "Currently available countries: Egypt and Yemen. Vehicle availability is confirmed before booking. You can type any city or area manually.")}</p>
    </div>
    <div className="flight-group" data-step="2">
      <h4><CalendarDays size={18} />{txt("٢. مدة التأجير", "2. Rental period")}</h4>
      <div className="flight-input-grid">
        <div className="inquiry-field flight-field"><label>{txt("تاريخ الاستلام (اختياري)", "Pickup date (optional)")}</label><input type="date" min={today} value={pickupDate} onChange={e => { setPickupDate(e.target.value); if (returnDate && e.target.value > returnDate) setReturnDate(""); }} /></div>
        <div className="inquiry-field flight-field"><label><Clock3 size={16} />{txt("وقت الاستلام (اختياري)", "Pickup time (optional)")}</label><input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} /></div>
        <div className="inquiry-field flight-field"><label>{txt("تاريخ التسليم (اختياري)", "Return date (optional)")}</label><input type="date" min={pickupDate || today} value={returnDate} onChange={e => setReturnDate(e.target.value)} /></div>
        <div className="inquiry-field flight-field"><label><Clock3 size={16} />{txt("وقت التسليم (اختياري)", "Return time (optional)")}</label><input type="time" value={returnTime} onChange={e => setReturnTime(e.target.value)} /></div>
      </div>
    </div>
    <div className="flight-group" data-step="3">
      <h4><Car size={18} />{txt("٣. السيارة المناسبة", "3. Vehicle preferences")}</h4>
      <div className="flight-input-grid">
        <div className="inquiry-field flight-field"><label>{txt("نوع السيارة (اختياري)", "Vehicle type (optional)")}</label><select value={vehicle} onChange={e => setVehicle(e.target.value)}>{Object.entries(vehicleName).map(([value, names]) => <option key={value} value={value}>{names[ar ? 0 : 1]}</option>)}</select></div>
        <div className="inquiry-field flight-field"><label>{txt("طريقة التأجير (اختياري)", "Rental option (optional)")}</label><select value={driver} onChange={e => setDriver(e.target.value)}>{Object.entries(driverName).map(([value, names]) => <option key={value} value={value}>{names[ar ? 0 : 1]}</option>)}</select></div>
        <div className="inquiry-field flight-field"><label><Users size={16} />{txt("عدد الركاب (اختياري)", "Passengers (optional)")}</label><select value={passengers} onChange={e => setPassengers(e.target.value)}><option value="">{txt("غير محدد", "Not specified")}</option>{Array.from({ length: 15 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}</select></div>
        <div className="inquiry-field flight-field"><label>{txt("عدد السيارات (اختياري)", "Number of cars (optional)")}</label><select value={cars} onChange={e => setCars(e.target.value)}>{Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}</select></div>
      </div>
    </div>
    <div className="flight-group" data-step="4">
      <h4>{txt("٤. ملاحظات إضافية", "4. Additional notes")}</h4>
      <div className="inquiry-field flight-field"><label>{txt("متطلبات أو تفاصيل أخرى (اختياري)", "Other requirements (optional)")}</label><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder={txt("مثل ناقل حركة أو مقعد طفل أو احتياج خاص", "E.g. transmission, child seat or special requirement")} /></div>
    </div>
    
    {step === 5 && summary && <section className="flight-summary" aria-label={txt("ملخص الطلب", "Request summary")}>
      <div className="flight-summary-head"><h4>{txt("مراجعة ملخص الطلب", "Review request summary")}</h4><button type="button" onClick={() => {setSummary(false);setStep(4);}} aria-label={txt("إغلاق", "Close")}><X size={20} /></button></div>
      <p>{txt("هذا استفسار وليس حجزًا مؤكدًا. يمكنك العودة لتعديل البيانات قبل فتح واتساب.", "This is an enquiry, not a confirmed rental. You can return to edit details before opening WhatsApp.")}</p>
      <dl>{rows.length ? rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>) : <div><dt>{txt("الطلب", "Request")}</dt><dd>{txt("استفسار عام عن تأجير السيارات", "General car rental enquiry")}</dd></div>}</dl>
      <div className="flight-summary-actions"><button type="button" className="btn btn-ghost" onClick={() => {setSummary(false);setStep(4);}}>{txt("العودة للتعديل", "Back to edit")}</button><a className="btn btn-primary" href={waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={19} />{txt("فتح واتساب وإرسال الطلب", "Open WhatsApp and send")}</a></div>
    </section>}
    <div className="flight-step-nav"><span className="flight-step-count">{txt(`الخطوة ${Math.min(step,5)} من 5`,`Step ${Math.min(step,5)} of 5`)}</span><div className="flight-step-buttons">{step>1 && <button type="button" className="btn btn-ghost" onClick={()=>{setSummary(false);setStep(s=>s-1);}}>{txt("السابق","Back")}</button>}{step<5 && <button type="button" className="btn btn-primary" onClick={()=>{if(step===4)setSummary(true);setStep(s=>Math.min(s+1,5));}}>{txt("التالي","Next")}</button>}</div></div>
  </div>;
}
