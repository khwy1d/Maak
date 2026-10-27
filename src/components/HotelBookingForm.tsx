import { useState } from "react";
import { CalendarDays, MessageCircle, Users, BedDouble, MapPin, X, Search, ChevronDown } from "lucide-react";
import { siteConfig } from "../config/site";

type Lang = "ar" | "en";
const countries = [
  ["اليمن","Yemen"],["السعودية","Saudi Arabia"],["الإمارات","United Arab Emirates"],["مصر","Egypt"],["الأردن","Jordan"],["عُمان","Oman"],["قطر","Qatar"],["الكويت","Kuwait"],["البحرين","Bahrain"],["تركيا","Turkey"],["الهند","India"],["باكستان","Pakistan"],["إثيوبيا","Ethiopia"],["جيبوتي","Djibouti"],["السودان","Sudan"],["الولايات المتحدة","United States"],["المملكة المتحدة","United Kingdom"],["فرنسا","France"],["ألمانيا","Germany"],["إيطاليا","Italy"],["إسبانيا","Spain"],["هولندا","Netherlands"],["كندا","Canada"],["ماليزيا","Malaysia"],["إندونيسيا","Indonesia"],["تايلاند","Thailand"],["المغرب","Morocco"],["تونس","Tunisia"],["الصين","China"],["اليابان","Japan"],["أستراليا","Australia"],["جنوب أفريقيا","South Africa"],["سريلانكا","Sri Lanka"],["كينيا","Kenya"],["نيبال","Nepal"],["أذربيجان","Azerbaijan"],["جورجيا","Georgia"],["روسيا","Russia"],["اليونان","Greece"],["سويسرا","Switzerland"],["النمسا","Austria"],["البرتغال","Portugal"],["البرازيل","Brazil"],["المكسيك","Mexico"],["المملكة الأردنية الهاشمية","Hashemite Kingdom of Jordan"]
] as const;

export default function HotelBookingForm({ lang }: { lang: Lang }) {
  const ar = lang === "ar";
  const txt = (a: string, e: string) => ar ? a : e;
  const [country, setCountry] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [stayType, setStayType] = useState("");
  const [rooms, setRooms] = useState("");
  const [guests, setGuests] = useState("");
  const [stars, setStars] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState(false);
  const [step, setStep] = useState(1);
  const today = new Date().toISOString().slice(0, 10);
  const digits = siteConfig.whatsappNumber.replace(/\\D/g, "");
  const selectedCountry = countries.find(c => c[1] === country);
  const countryOptions = countries.filter(c => !countrySearch.trim() || c[0].toLocaleLowerCase().includes(countrySearch.trim().toLocaleLowerCase()) || c[1].toLocaleLowerCase().includes(countrySearch.trim().toLocaleLowerCase()));
  const citySuggestions = [["عدن","Aden"],["صنعاء","Sanaa"],["جدة","Jeddah"],["مكة المكرمة","Makkah"],["الرياض","Riyadh"],["المدينة المنورة","Madinah"],["دبي","Dubai"],["أبوظبي","Abu Dhabi"],["القاهرة","Cairo"],["عمّان","Amman"],["مسقط","Muscat"],["الدوحة","Doha"],["إسطنبول","Istanbul"],["لندن","London"],["باريس","Paris"],["نيويورك","New York"],["كوالالمبور","Kuala Lumpur"],["جاكرتا","Jakarta"]] as const;
  const rows: [string, string][] = [];
  if (country) rows.push([txt("البلد", "Country"), selectedCountry ? selectedCountry[ar ? 0 : 1] : country]);
  if (city.trim()) rows.push([txt("المدينة", "City"), city.trim()]);
  if (area.trim()) rows.push([txt("المنطقة أو الحي", "Area or neighbourhood"), area.trim()]);
  if (stayType) rows.push([txt("نوع الإقامة", "Accommodation type"), ({hotel:txt("فندق","Hotel"), apartment:txt("شقة سكنية","Apartment"), serviced:txt("شقة فندقية","Serviced apartment"), room:txt("غرفة","Room"), resort:txt("منتجع","Resort"), any:txt("أي خيار مناسب","Any suitable option")} as Record<string,string>)[stayType]]);
  if (rooms) rows.push([txt("عدد الغرف أو الوحدات", "Rooms or units"), rooms]);
  if (guests) rows.push([txt("عدد الأشخاص", "Number of guests"), guests]);
  if (stars) rows.push([txt("تصنيف الفندق", "Hotel star rating"), stars === "any" ? txt("غير محدد","Flexible") : stars + txt(" نجوم"," stars")]);
  if (checkIn) rows.push([txt("تاريخ الوصول", "Check-in date"), checkIn]);
  if (checkOut) rows.push([txt("تاريخ المغادرة", "Check-out date"), checkOut]);
  if (notes.trim()) rows.push([txt("تفاصيل إضافية", "Additional details"), notes.trim()]);
  const body = rows.map(([k,v]) => k + ": " + v).join("\n");
  const message = txt("مرحبًا فريق معك، أود الاستفسار عن حجز إقامة.\n", "Hello MAAK team, I'd like to enquire about accommodation.\n")
    + (body || txt("لا توجد تفاصيل محددة حتى الآن؛ أود الاستفسار عن خيارات الإقامة المتاحة.", "No details specified yet; I'd like to enquire about available accommodation options."))
    + "\n" + txt("يرجى تزويدي بالخيارات والأسعار والتوافر قبل تأكيد أي حجز.", "Please share available options, prices and availability before any booking is confirmed.");
  const waUrl = "https://wa.me/" + digits + "?text=" + encodeURIComponent(message);
  return <div className={`inquiry-form flight-booking-form hotel-booking-form step-${step}`}>
    <h3>{txt("قدّم طلب حجز إقامة", "Request accommodation")}</h3>
    <p>{txt("حدد الوجهة ونوع الإقامة وما تعرفه من التفاصيل. جميع الحقول اختيارية.", "Choose your destination and accommodation preferences. All fields are optional.")}</p>
    <div className="flight-group" data-step="1">
      <h4>{txt("١. وجهة الإقامة", "1. Accommodation destination")}</h4>
      <div className="flight-input-grid">
        <div className="inquiry-field flight-field flight-country-wrap"><label><MapPin size={16}/>{txt("البلد", "Country")}</label><button type="button" className="flight-country-trigger" onClick={()=>setCountryMenuOpen(v=>!v)} aria-expanded={countryMenuOpen}><span>{selectedCountry ? selectedCountry[ar?0:1] : txt("اختر البلد","Choose a country")}</span><ChevronDown size={18}/></button>{countryMenuOpen&&<div className="flight-country-menu"><div className="flight-country-search"><Search size={17}/><input value={countrySearch} onChange={e=>setCountrySearch(e.target.value)} placeholder={txt("ابحث باسم الدولة بالعربية أو الإنجليزية","Search country in Arabic or English")}/><button type="button" onClick={()=>setCountryMenuOpen(false)} aria-label={txt("إغلاق","Close")}><X size={16}/></button></div><div className="flight-country-options">{countryOptions.map(c=><button type="button" key={c[1]} onClick={()=>{setCountry(c[1]);setCountrySearch("");setCountryMenuOpen(false)}}>{ar?c[0]:c[1]}</button>)}{!countryOptions.length&&<p>{txt("لا توجد نتائج","No results")}</p>}</div></div>}</div>
        <div className="inquiry-field flight-field"><label>{txt("المدينة", "City")}</label><input list="hotel-city-suggestions" value={city} onChange={e=>setCity(e.target.value)} placeholder={txt("ابحث أو اكتب اسم المدينة بالعربية أو الإنجليزية", "Search or enter city in Arabic or English")} /><datalist id="hotel-city-suggestions">{citySuggestions.map(c=><><option key={c[0]} value={c[0]} label={c[1]}/><option key={c[1]} value={c[1]} label={c[0]}/></>)}</datalist></div>
        <div className="inquiry-field flight-field"><label>{txt("المنطقة أو الحي", "Area or neighbourhood")}</label><input value={area} onChange={e=>setArea(e.target.value)} placeholder={txt("اختياري", "Optional")} /></div>
      </div>
    </div>
    <div className="flight-group" data-step="2">
      <h4>{txt("٢. نوع الإقامة والتفاصيل", "2. Accommodation type and preferences")}</h4>
      <div className="flight-input-grid">
        <div className="inquiry-field flight-field"><label><BedDouble size={16}/>{txt("نوع الإقامة", "Accommodation type")}</label><select value={stayType} onChange={e=>setStayType(e.target.value)}><option value="">{txt("اختر نوع الإقامة", "Choose accommodation type")}</option><option value="hotel">{txt("فندق", "Hotel")}</option><option value="apartment">{txt("شقة سكنية", "Apartment")}</option><option value="serviced">{txt("شقة فندقية", "Serviced apartment")}</option><option value="room">{txt("غرفة", "Room")}</option><option value="resort">{txt("منتجع", "Resort")}</option><option value="any">{txt("أي خيار مناسب", "Any suitable option")}</option></select></div>
        <div className="inquiry-field flight-field"><label>{txt("عدد الغرف أو الوحدات", "Rooms or units")}</label><select value={rooms} onChange={e=>setRooms(e.target.value)}><option value="">{txt("غير محدد", "Not specified")}</option>{Array.from({length:10},(_,i)=><option key={i+1} value={String(i+1)}>{i+1}</option>)}</select></div>
        <div className="inquiry-field flight-field"><label><Users size={16}/>{txt("عدد الأشخاص", "Number of guests")}</label><select value={guests} onChange={e=>setGuests(e.target.value)}><option value="">{txt("غير محدد", "Not specified")}</option>{Array.from({length:20},(_,i)=><option key={i+1} value={String(i+1)}>{i+1}</option>)}</select></div>
        <div className="inquiry-field flight-field"><label>{txt("تصنيف الفندق", "Hotel star rating")}</label><select value={stars} onChange={e=>setStars(e.target.value)}><option value="">{txt("غير محدد", "Not specified")}</option><option value="any">{txt("أي تصنيف", "Any rating")}</option>{[1,2,3,4,5].map(n=><option key={n} value={String(n)}>{n} {txt("نجوم","stars")}</option>)}</select></div>
      </div>
    </div>
    <div className="flight-group" data-step="3">
      <h4>{txt("٣. تواريخ الإقامة", "3. Stay dates")}</h4>
      <div className="flight-input-grid">
        <div className="inquiry-field flight-field"><label><CalendarDays size={16}/>{txt("تاريخ الوصول (اختياري)", "Check-in date (optional)")}</label><input type="date" min={today} value={checkIn} onChange={e=>{setCheckIn(e.target.value);if(checkOut&&e.target.value>checkOut)setCheckOut("");}} /></div>
        <div className="inquiry-field flight-field"><label><CalendarDays size={16}/>{txt("تاريخ المغادرة (اختياري)", "Check-out date (optional)")}</label><input type="date" min={checkIn||today} value={checkOut} onChange={e=>setCheckOut(e.target.value)} /></div>
      </div>
    </div>
    <div className="flight-group" data-step="4"><h4>{txt("٤. تفاصيل إضافية", "4. Additional details")}</h4><div className="inquiry-field flight-field"><label>{txt("طلبات أو ملاحظات (اختياري)", "Requests or notes (optional)")}</label><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={txt("مثلاً: ميزانية تقريبية أو احتياجات خاصة", "e.g. approximate budget or special requirements")} /></div></div>
    
    {step === 5 && summary && <section className="flight-summary" aria-label={txt("ملخص الطلب","Request summary")}><div className="flight-summary-head"><h4>{txt("مراجعة ملخص الطلب","Review request summary")}</h4><button type="button" onClick={()=>{setSummary(false);setStep(4);}} aria-label={txt("إغلاق","Close")}><X size={20}/></button></div><p>{txt("هذا استفسار وليس حجزًا مؤكدًا. يمكنك العودة لتعديل البيانات قبل فتح واتساب.", "This is an enquiry, not a confirmed booking. You can return to edit details before opening WhatsApp.")}</p><dl>{rows.length?rows.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>):<div><dt>{txt("الطلب","Request")}</dt><dd>{txt("استفسار عام عن خيارات الإقامة", "General accommodation enquiry")}</dd></div>}</dl><div className="flight-summary-actions"><button type="button" className="btn btn-ghost" onClick={()=>{setSummary(false);setStep(4);}}>{txt("العودة للتعديل","Back to edit")}</button><a className="btn btn-primary" href={waUrl} target="_blank" rel="noopener noreferrer"><MessageCircle size={19}/>{txt("فتح واتساب وإرسال الطلب","Open WhatsApp and send")}</a></div></section>}
    <div className="flight-step-nav"><span className="flight-step-count">{txt(`الخطوة ${Math.min(step,5)} من 5`,`Step ${Math.min(step,5)} of 5`)}</span><div className="flight-step-buttons">{step>1 && <button type="button" className="btn btn-ghost" onClick={()=>{setSummary(false);setStep(s=>s-1);}}>{txt("السابق","Back")}</button>}{step<5 && <button type="button" className="btn btn-primary" onClick={()=>{if(step===4)setSummary(true);setStep(s=>Math.min(s+1,5));}}>{txt("التالي","Next")}</button>}</div></div>
  </div>;
}
