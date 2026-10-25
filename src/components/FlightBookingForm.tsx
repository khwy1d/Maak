import { useState } from "react";
import { MessageCircle, Plane, ArrowLeftRight, Users, CalendarDays, ChevronDown, Search, X } from "lucide-react";
import { siteConfig } from "../config/site";

type Lang = "ar" | "en";
type Place = { country: string; city: string; airport: string };
const empty: Place = { country: "", city: "", airport: "" };
const countries = [
 {code:"YE",ar:"اليمن",en:"Yemen",cities:[{ar:"عدن",en:"Aden",airports:[{ar:"مطار عدن الدولي",en:"Aden International Airport"}]},{ar:"سيئون",en:"Seiyun",airports:[{ar:"مطار سيئون",en:"Seiyun Airport"}]},{ar:"المكلا",en:"Mukalla",airports:[{ar:"مطار الريان",en:"Riyan Airport"}]},{ar:"سقطرى",en:"Socotra",airports:[{ar:"مطار سقطرى",en:"Socotra Airport"}]},{ar:"صنعاء",en:"Sana'a",airports:[{ar:"مطار صنعاء الدولي",en:"Sana'a International Airport"}]},{ar:"الحديدة",en:"Hodeidah",airports:[{ar:"مطار الحديدة",en:"Hodeidah Airport"}]}]},
 {code:"SA",ar:"السعودية",en:"Saudi Arabia",cities:[{ar:"جدة",en:"Jeddah"},{ar:"الرياض",en:"Riyadh"},{ar:"الدمام",en:"Dammam"},{ar:"المدينة المنورة",en:"Madinah"}]},
 {code:"EG",ar:"مصر",en:"Egypt",cities:[{ar:"القاهرة",en:"Cairo",airports:[{ar:"مطار القاهرة الدولي",en:"Cairo International Airport"}]},{ar:"الإسكندرية",en:"Alexandria"},{ar:"شرم الشيخ",en:"Sharm El Sheikh"}]},
 {code:"JO",ar:"الأردن",en:"Jordan",cities:[{ar:"عمّان",en:"Amman"}]},
 {code:"AE",ar:"الإمارات",en:"United Arab Emirates",cities:[{ar:"دبي",en:"Dubai"},{ar:"أبوظبي",en:"Abu Dhabi"},{ar:"الشارقة",en:"Sharjah"}]},
 {code:"OM",ar:"عُمان",en:"Oman",cities:[{ar:"مسقط",en:"Muscat"},{ar:"صلالة",en:"Salalah"}]},
 {code:"QA",ar:"قطر",en:"Qatar",cities:[{ar:"الدوحة",en:"Doha"}]},
 {code:"KW",ar:"الكويت",en:"Kuwait",cities:[{ar:"مدينة الكويت",en:"Kuwait City"}]},
 {code:"BH",ar:"البحرين",en:"Bahrain",cities:[{ar:"المنامة",en:"Manama"}]},
 {code:"TR",ar:"تركيا",en:"Turkey",cities:[{ar:"إسطنبول",en:"Istanbul"},{ar:"أنقرة",en:"Ankara"}]},
 {code:"IN",ar:"الهند",en:"India",cities:[{ar:"نيودلهي",en:"New Delhi"},{ar:"مومباي",en:"Mumbai"}]},
 {code:"PK",ar:"باكستان",en:"Pakistan",cities:[{ar:"كراتشي",en:"Karachi"},{ar:"إسلام آباد",en:"Islamabad"}]},
 {code:"ET",ar:"إثيوبيا",en:"Ethiopia",cities:[{ar:"أديس أبابا",en:"Addis Ababa"}]},
 {code:"DJ",ar:"جيبوتي",en:"Djibouti",cities:[{ar:"مدينة جيبوتي",en:"Djibouti City"}]},
 {code:"SD",ar:"السودان",en:"Sudan",cities:[{ar:"بورتسودان",en:"Port Sudan"},{ar:"الخرطوم",en:"Khartoum"}]},
 {code:"US",ar:"الولايات المتحدة",en:"United States",cities:[{ar:"نيويورك",en:"New York"},{ar:"واشنطن",en:"Washington, D.C."},{ar:"لوس أنجلوس",en:"Los Angeles"}]},
 {code:"GB",ar:"المملكة المتحدة",en:"United Kingdom",cities:[{ar:"لندن",en:"London"},{ar:"مانشستر",en:"Manchester"}]},
 {code:"FR",ar:"فرنسا",en:"France",cities:[{ar:"باريس",en:"Paris"}]},
 {code:"DE",ar:"ألمانيا",en:"Germany",cities:[{ar:"فرانكفورت",en:"Frankfurt"},{ar:"برلين",en:"Berlin"}]},
 {code:"CN",ar:"الصين",en:"China",cities:[{ar:"بكين",en:"Beijing"},{ar:"غوانزو",en:"Guangzhou"}]},
 {code:"MY",ar:"ماليزيا",en:"Malaysia",cities:[{ar:"كوالالمبور",en:"Kuala Lumpur"}]},
 {code:"ID",ar:"إندونيسيا",en:"Indonesia",cities:[{ar:"جاكرتا",en:"Jakarta"}]},
 {code:"TH",ar:"تايلاند",en:"Thailand",cities:[{ar:"بانكوك",en:"Bangkok"}]},
 {code:"LK",ar:"سريلانكا",en:"Sri Lanka",cities:[{ar:"كولومبو",en:"Colombo"}]},
 {code:"MA",ar:"المغرب",en:"Morocco",cities:[{ar:"الدار البيضاء",en:"Casablanca"}]},
 {code:"TN",ar:"تونس",en:"Tunisia",cities:[{ar:"تونس",en:"Tunis"}]},
 {code:"KE",ar:"كينيا",en:"Kenya",cities:[{ar:"نيروبي",en:"Nairobi"}]},
 {code:"ZA",ar:"جنوب أفريقيا",en:"South Africa",cities:[{ar:"جوهانسبرغ",en:"Johannesburg"}]},
 {code:"IT",ar:"إيطاليا",en:"Italy",cities:[{ar:"روما",en:"Rome"}]},
 {code:"ES",ar:"إسبانيا",en:"Spain",cities:[{ar:"مدريد",en:"Madrid"}]},
 {code:"NL",ar:"هولندا",en:"Netherlands",cities:[{ar:"أمستردام",en:"Amsterdam"}]},
 {code:"CA",ar:"كندا",en:"Canada",cities:[{ar:"تورونتو",en:"Toronto"},{ar:"مونتريال",en:"Montreal"}]}
] as const;
const airlines = [{value:"yemenia",ar:"الخطوط الجوية اليمنية",en:"Yemenia Airways"},{value:"aden",ar:"طيران عدن",en:"Aden Airways"}];

export default function FlightBookingForm({lang}:{lang:Lang}) {
 const ar=lang==="ar", txt=(a:string,e:string)=>ar?a:e;
 const [trip,setTrip]=useState<""|"domestic"|"international">("");
 const [airline,setAirline]=useState("");
 const [dep,setDep]=useState<Place>(empty), [dest,setDest]=useState<Place>(empty);
 const [ticket,setTicket]=useState<"oneway"|"return">("oneway");
 const [date,setDate]=useState(""),[returnDate,setReturnDate]=useState("");
 const [adults,setAdults]=useState(""),[children,setChildren]=useState(""),[infants,setInfants]=useState("");
 const [notes,setNotes]=useState(""),[search,setSearch]=useState({departure:"",destination:""});
 const [open,setOpen]=useState<"departure"|"destination"|null>(null),[summary,setSummary]=useState(false);
 const today=new Date().toISOString().slice(0,10), digits=siteConfig.whatsappNumber.replace(/\\D/g,"");
 const options=(which:"departure"|"destination")=>{
  const list=trip==="domestic"?countries.filter(c=>c.code==="YE"):countries.filter(c=>which==="departure"||c.code!=="YE");
  const q=search[which].trim().toLocaleLowerCase();
  return list.filter(c=>!q||c.ar.toLocaleLowerCase().includes(q)||c.en.toLocaleLowerCase().includes(q));
 };
 const place= (which:"departure"|"destination")=>which==="departure"?dep:dest;
 const setPlace=(which:"departure"|"destination",v:Place)=>which==="departure"?setDep(v):setDest(v);
 const countryFor=(p:Place)=>countries.find(c=>c.code===p.country);
 const countryName=(p:Place)=>{const c=countryFor(p);return c?(ar?c.ar:c.en):""};
 const cityName=(p:Place)=>{const c=countryFor(p)?.cities.find(x=>x.en===p.city);return c?(ar?c.ar:c.en):""};
 const airportName=(p:Place)=>{const c=countryFor(p)?.cities.find(x=>x.en===p.city);const a=c&&"airports" in c?c.airports?.find(x=>x.en===p.airport):undefined;return a?(ar?a.ar:a.en):""};
 const chooseTrip=(v:"domestic"|"international")=>{setTrip(v);setDep(empty);setDest(empty);setAirline("");setSearch({departure:"",destination:""});setOpen(null)};
 const renderPlace=(which:"departure"|"destination")=>{
  const p=place(which), list=options(which), c=countryFor(p), cities=c?.cities||[];
  return <div className="flight-place-group"><div className="flight-country-wrap">
   <label>{txt(which==="departure"?"دولة المغادرة":"دولة الوصول",which==="departure"?"Departure country":"Arrival country")}</label>
   <button type="button" className="flight-country-trigger" onClick={()=>setOpen(open===which?null:which)} aria-expanded={open===which}><span>{p.country?countryName(p):txt("اختر الدولة","Choose a country")}</span><ChevronDown size={18}/></button>
   {open===which&&<div className="flight-country-menu"><div className="flight-country-search"><Search size={17}/><input autoFocus value={search[which]} onChange={e=>setSearch(s=>({...s,[which]:e.target.value}))} placeholder={txt("ابحث بالعربية أو الإنجليزية","Search Arabic or English")}/><button type="button" onClick={()=>setOpen(null)} aria-label={txt("إغلاق","Close")}><X size={16}/></button></div><div className="flight-country-options">{list.map(country=><button type="button" key={country.code} onClick={()=>{setPlace(which,{country:country.code,city:"",airport:""});setSearch(s=>({...s,[which]:""}));setOpen(null);setAirline("");}}>{ar?country.ar:country.en}</button>)}{!list.length&&<p>{txt("لا توجد نتائج","No results")}</p>}</div></div>}
  </div>
  {c&&<div className="inquiry-field flight-field"><label>{txt(which==="departure"?"مدينة المغادرة":"مدينة الوصول",which==="departure"?"Departure city":"Arrival city")}</label><select value={p.city} onChange={e=>{const city=cities.find(x=>x.en===e.target.value);const airports=city&&"airports" in city?city.airports:undefined;setPlace(which,{...p,city:e.target.value,airport:airports?.length===1?airports[0].en:""});}}><option value="">{txt("اختر المدينة","Choose a city")}</option>{cities.map(city=><option key={city.en} value={city.en}>{ar?city.ar:city.en}</option>)}</select></div>}
  {c&&p.city&&(()=>{const city=cities.find(x=>x.en===p.city);const airports=city&&"airports" in city?city.airports:undefined;return airports&&airports.length>1?<div className="inquiry-field flight-field"><label>{txt(which==="departure"?"مطار المغادرة":"مطار الوصول",which==="departure"?"Departure airport":"Arrival airport")}</label><select value={p.airport} onChange={e=>setPlace(which,{...p,airport:e.target.value})}><option value="">{txt("اختر المطار","Choose airport")}</option>{airports.map(a=><option key={a.en} value={a.en}>{ar?a.ar:a.en}</option>)}</select></div>:null})()}
  </div>;
 };
 const rows:[string,string][]=[];
 if(trip)rows.push([txt("نوع الرحلة","Trip type"),txt(trip==="domestic"?"داخلية داخل اليمن":"دولية",trip==="domestic"?"Domestic within Yemen":"International")]);
 if(airline)rows.push([txt("شركة الطيران","Airline"),(airlines.find(a=>a.value===airline) as any)?.[ar?"ar":"en"]||""]);
 const addPlace=(p:Place,departure:boolean)=>{if(p.country)rows.push([txt(departure?"دولة المغادرة":"دولة الوصول",departure?"Departure country":"Arrival country"),countryName(p)]);if(p.city)rows.push([txt(departure?"مدينة المغادرة":"مدينة الوصول",departure?"Departure city":"Arrival city"),cityName(p)]);if(p.airport)rows.push([txt(departure?"مطار المغادرة":"مطار الوصول",departure?"Departure airport":"Arrival airport"),airportName(p)]);};
 addPlace(dep,true);addPlace(dest,false);
 rows.push([txt("نوع التذكرة","Ticket type"),ticket==="oneway"?txt("ذهاب فقط","One way"):txt("ذهاب وعودة","Return")]);
 if(date)rows.push([txt("تاريخ الذهاب","Departure date"),date]);if(ticket==="return"&&returnDate)rows.push([txt("تاريخ العودة","Return date"),returnDate]);
 const people=[adults?txt("بالغون: ","Adults: ")+adults:"",children?txt("أطفال: ","Children: ")+children:"",infants?txt("رضّع: ","Infants: ")+infants:""].filter(Boolean).join("، ");
 if(people)rows.push([txt("المسافرون","Passengers"),people]);if(notes.trim())rows.push([txt("ملاحظات إضافية","Additional notes"),notes.trim()]);
 const message=rows.length?rows.map(([k,v])=>k+": "+v).join("\n"):txt("لا توجد تفاصيل محددة حتى الآن؛ أود الاستفسار عن حجز تذكرة طيران.","No details specified yet; I’d like to enquire about a flight ticket.");
 const wa=txt("مرحبًا فريق معك، أود الاستفسار عن حجز تذكرة طيران.\n","Hello MAAK team, I’d like to enquire about a flight ticket.\n")+message+"\n"+txt("يرجى تأكيد المسارات والأسعار والتوافر قبل أي حجز.","Please confirm routes, prices and availability before any booking.");
 const yemenRoute=trip==="domestic"||dep.country==="YE";
 return <div className="inquiry-form flight-booking-form">
  <h3>{txt("قدّم طلب حجز تذكرة","Request a flight ticket")}</h3><p>{txt("اختر ما تعرفه من التفاصيل، واترك ما لم يتحدد بعد فارغًا. جميع الحقول اختيارية.","Fill in what you know and leave anything undecided blank. All fields are optional.")}</p>
  <div className="flight-group"><h4>{txt("١. نوع الرحلة","1. Trip type")}</h4><div className="flight-choice-row"><button type="button" className={trip==="domestic"?"flight-choice active":"flight-choice"} onClick={()=>chooseTrip("domestic")}><Plane size={18}/>{txt("رحلة داخلية داخل اليمن","Domestic within Yemen")}</button><button type="button" className={trip==="international"?"flight-choice active":"flight-choice"} onClick={()=>chooseTrip("international")}><Plane size={18}/>{txt("رحلة دولية","International flight")}</button></div></div>
  <div className="flight-group"><h4>{txt("٢. تفاصيل المسار","2. Route details")}</h4><div className="flight-route-grid">{renderPlace("departure")}<div className="flight-swap"><ArrowLeftRight size={19}/></div>{renderPlace("destination")}</div><p className="flight-disclaimer">{txt("القوائم إرشادية، ويُؤكَّد تشغيل المسار والمطار وتوفر الرحلات عند التواصل.","Lists are for guidance; route, airport operations and availability are confirmed during follow-up.")}</p></div>
  <div className="flight-group"><h4>{txt("٣. شركة الطيران","3. Airline")}</h4><div className="inquiry-field flight-field"><label>{txt("الشركة المفضلة (اختياري)","Preferred airline (optional)")}</label><select value={airline} onChange={e=>setAirline(e.target.value)}><option value="">{txt("لا أفضل شركة محددة","No specific preference")}</option>{(yemenRoute?airlines:[]).map(a=><option key={a.value} value={a.value}>{ar?a.ar:a.en}</option>)}</select></div>{!yemenRoute&&<p className="flight-disclaimer">{txt("تُراجع الشركات المناسبة للمسار بعد تحديد الوجهة، ولا يُفترض توفر شركة على كل مسار.","Suitable airlines are checked for the selected route; no airline is assumed to serve every route.")}</p>}</div>
  <div className="flight-group"><h4>{txt("٤. نوع التذكرة والتواريخ","4. Ticket type and dates")}</h4><div className="flight-choice-row"><button type="button" className={ticket==="oneway"?"flight-choice active":"flight-choice"} onClick={()=>{setTicket("oneway");setReturnDate("");}}>{txt("ذهاب فقط","One way")}</button><button type="button" className={ticket==="return"?"flight-choice active":"flight-choice"} onClick={()=>setTicket("return")}>{txt("ذهاب وعودة","Return")}</button></div><div className="flight-input-grid"><div className="inquiry-field flight-field"><label><CalendarDays size={16}/>{txt("تاريخ الذهاب (اختياري)","Departure date (optional)")}</label><input type="date" min={today} value={date} onChange={e=>{setDate(e.target.value);if(returnDate&&e.target.value>returnDate)setReturnDate("");}}/></div>{ticket==="return"&&<div className="inquiry-field flight-field"><label><CalendarDays size={16}/>{txt("تاريخ العودة (اختياري)","Return date (optional)")}</label><input type="date" min={date||today} value={returnDate} onChange={e=>setReturnDate(e.target.value)}/></div>}</div></div>
  <div className="flight-group"><h4><Users size={18}/>{txt("٥. عدد المسافرين (اختياري)","5. Passengers (optional)")}</h4><div className="flight-input-grid flight-passengers">{[[adults,setAdults,txt("بالغون","Adults")],[children,setChildren,txt("أطفال","Children")],[infants,setInfants,txt("رضّع","Infants")]].map(([v,setter,title]:any)=><div className="inquiry-field flight-field" key={title}><label>{title}</label><select value={v} onChange={e=>setter(e.target.value)}><option value="">{txt("غير محدد","Not specified")}</option>{Array.from({length:10},(_,i)=><option key={i+1} value={String(i+1)}>{i+1}</option>)}</select></div>)}</div></div>
  <div className="flight-group"><h4>{txt("٦. ملاحظات إضافية","6. Additional notes")}</h4><div className="inquiry-field flight-field"><label>{txt("طلبات أو تفاصيل أخرى (اختياري)","Other requests or details (optional)")}</label><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder={txt("يمكنك ترك هذا الحقل فارغًا","You can leave this blank")}/></div></div>
  <button type="button" className="btn btn-primary inquiry-submit" onClick={()=>setSummary(true)}><MessageCircle size={20}/>{txt("متابعة الطلب","Continue request")}</button>
  {summary&&<div className="flight-summary" role="dialog" aria-modal="true" aria-label={txt("ملخص الطلب","Request summary")}><div className="flight-summary-head"><h4>{txt("مراجعة ملخص الطلب","Review request summary")}</h4><button type="button" onClick={()=>setSummary(false)} aria-label={txt("إغلاق","Close")}><X size={20}/></button></div><p>{txt("هذه رسالة استفسار وليست حجزًا مؤكدًا. يمكنك العودة لتعديل البيانات قبل فتح واتساب.","This is an enquiry, not a confirmed booking. You can return to edit details before opening WhatsApp.")}</p><dl>{rows.length?rows.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>):<div><dt>{txt("الطلب","Request")}</dt><dd>{txt("طلب عام للاستفسار عن حجز تذكرة طيران","General flight booking enquiry")}</dd></div>}</dl><div className="flight-summary-actions"><button type="button" className="btn btn-ghost" onClick={()=>setSummary(false)}>{txt("العودة للتعديل","Back to edit")}</button><a className="btn btn-primary" href={"https://wa.me/"+digits+"?text="+encodeURIComponent(wa)} target="_blank" rel="noopener noreferrer"><MessageCircle size={19}/>{txt("فتح واتساب وإرسال الطلب","Open WhatsApp and send")}</a></div></div>}
 </div>;
}
