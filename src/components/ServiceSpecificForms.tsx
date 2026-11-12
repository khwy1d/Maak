import { Children, cloneElement, useEffect, useId, useState, type ReactElement, type ReactNode } from "react";
import { ArrowLeft, CalendarDays, MessageCircle, Minus, Plus, Users, X } from "lucide-react";
import { siteConfig } from "../config/site";
import { useDesktopFormLayout } from "../hooks/useDesktopFormLayout";
import { useApp } from "../context/AppContext";
import { useAccountName } from "../hooks/useAccountName";
import { buildWhatsAppUrl } from "../lib/whatsapp";

type Lang = "ar" | "en";
type Row = [string, string];
type ServiceFormProps = { lang: Lang };
type InquiryService = "medical_travel" | "security_clearance" | "umrah" | "real_estate" | "tourism";

function label(lang: Lang, ar: string, en: string) {
  return lang === "ar" ? ar : en;
}

function Field({ title, children, required = false }: { title: ReactNode; children: ReactElement<{ id?: string; required?: boolean }>; required?: boolean }) {
  const id = useId();
  const control = cloneElement(children, { id, ...(required ? { required: true } : {}) });
  const { lang } = useApp();
  const titleAlreadyMarksOptional = typeof title === "string" && /اختياري|optional/i.test(title);
  return <div className="inquiry-field flight-field"><label htmlFor={id}>{title}{required ? <span className="field-required" aria-hidden="true"> *</span> : !titleAlreadyMarksOptional && <small className="field-requirement">{lang === "en" ? "(optional)" : "(اختياري)"}</small>}</label>{control}</div>;
}

function Select({ value, onChange, placeholder, options, id, required }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  required?: boolean;
  options: Array<[string, string]>;
}) {
  return <select id={id} required={required} value={value} onChange={event => onChange(event.target.value)}>
    <option value="">{placeholder}</option>
    {options.map(([optionValue, title]) => <option key={optionValue} value={optionValue}>{title}</option>)}
  </select>;
}

function RequestCard({
  lang, title, intro, serviceName, serviceCode, rows, children, note, canReview = true,
}: {
  lang: Lang;
  title: string;
  intro: string;
  serviceName: string;
  serviceCode: InquiryService;
  rows: Row[];
  children: ReactNode;
  note: string;
  canReview?: boolean;
}) {
  const [step, setStep] = useState(0);
  const accountName = useAccountName();
  const [requesterName, setRequesterName] = useState("");
  useEffect(() => { if (accountName) setRequesterName(current => current || accountName); }, [accountName]);
  const desktopForm = useDesktopFormLayout();
  const groups = Children.toArray(children);
  const reviewing = step === groups.length;
  const requestRows: Row[] = [
    ...rows,
    ...(requesterName.trim() ? [[label(lang, "اسم صاحب الطلب", "Contact name"), requesterName.trim()] as Row] : []),
  ];
  const details = requestRows.length
    ? requestRows.map(([name, value]) => `${name}: ${value}`).join("\n")
    : label(lang, "لم أحدد التفاصيل بعد؛ أود الاستفسار عن الخدمة.", "No details selected yet; I’d like to enquire about this service.");
  const message = [
    label(lang, `مرحبًا فريق معك، أود الاستفسار عن ${serviceName}.`, `Hello MAAK team, I’d like to enquire about ${serviceName}.`),
    details,
    note,
  ].join("\n\n");
  const whatsappUrl = buildWhatsAppUrl(siteConfig.whatsappNumber, message);
  const dateValues = rows.filter(([field]) => /تاريخ|موعد|date/i.test(field)).map(([, value]) => value).filter(Boolean);
  const datesValid = dateValues.every(value => /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today());

  return <div className={`inquiry-form flight-booking-form specialized-request-form maak-service-flow maak-flight-flow${desktopForm ? " desktop-flow" : ""}${desktopForm && reviewing ? " desktop-reviewing" : ""}`}>
    <header className="maak-flight-head"><button type="button" className="maak-back" onClick={() => step === 0 ? window.history.back() : setStep(current => current - 1)} aria-label={label(lang, "رجوع", "Back")}><ArrowLeft size={20}/></button><div><span>{label(lang, "معك للسفر", "MAAK TRAVEL")}</span><h2>{title}</h2></div></header>
    {!reviewing && desktopForm && groups.map((group, index) => <div className="maak-desktop-step" data-step={index + 1} key={index}>{group}</div>)}
    {!reviewing && !desktopForm && <>{groups.map((group,index)=><div className="maak-desktop-step" data-step={index+1} key={index}>{group}</div>)}</>}
    {!reviewing && <div className="flight-group maak-requester-name"><Field title={label(lang, "اسم صاحب الطلب", "Contact name")}><input autoComplete="name" value={requesterName} onChange={event => setRequesterName(event.target.value)} placeholder={label(lang, "اختياري", "Optional")} /></Field></div>}
    {!reviewing && !desktopForm && <div className="flight-step-nav maak-service-flow-nav maak-bottom-actions"><button type="button" className="btn btn-primary maak-next" disabled={!canReview || !datesValid} onClick={() => {setStep(groups.length);window.scrollTo({top:0,behavior:"smooth"})}}>{label(lang,"إرسال","Send")}<ArrowLeft size={19}/></button></div>}

    {!reviewing && desktopForm && <div className="maak-desktop-actions"><button type="button" className="maak-next" disabled={!canReview || !datesValid} onClick={() => {setStep(groups.length);window.scrollTo({top:0,behavior:"smooth"})}}>{label(lang,"إرسال","Send")}<ArrowLeft size={19}/></button></div>}
    {reviewing && <section className="flight-summary" aria-label={label(lang, "مراجعة الطلب", "Review request")}>
      <div className="flight-summary-head">
        <h4>{label(lang, "راجع طلبك", "Review your request")}</h4>
        <button type="button" onClick={() => setStep(0)} aria-label={label(lang, "العودة للتعديل", "Back to edit")}><X size={20} /></button>
      </div>
      <p>{label(lang, "تأكد من التفاصيل قبل تأكيد الطلب.", "Please review the details before confirming your request.")}</p>
      <dl>{requestRows.length ? requestRows.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>) : <div><dt>{label(lang, "الطلب", "Request")}</dt><dd>{serviceName}</dd></div>}</dl>
      <p className="flight-disclaimer">{note}</p>
      <div className="flight-summary-actions">
        <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>{label(lang, "العودة للتعديل", "Back to edit")}</button>
        <a className="btn btn-primary" href={whatsappUrl} data-save-inquiry="true" data-inquiry-service={serviceCode} data-request-data={JSON.stringify({ date_values: rows.filter(([field]) => /تاريخ|موعد|date/i.test(field)).map(([, value]) => value).filter(Boolean) })} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} />{label(lang, "تأكيد الطلب وإرساله عبر واتساب", "Confirm request and send via WhatsApp")}</a>
      </div>
    </section>}
  </div>;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function countOptions(lang: Lang, max: number) {
  return Array.from({ length: max }, (_, index) => {
    const value = String(index + 1);
    return [value, value] as [string, string];
  });
}

export function MedicalTravelForm({ lang }: ServiceFormProps) {
  const [purpose, setPurpose] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [travellers, setTravellers] = useState("");
  const [companions, setCompanions] = useState("");
  const [support, setSupport] = useState("");
  const [notes, setNotes] = useState("");
  const txt = (ar: string, en: string) => label(lang, ar, en);
  const rows: Row[] = [
    ...(purpose ? [[txt("نوع التنسيق المطلوب", "Travel support needed"), purpose] as Row] : []),
    ...(destination.trim() ? [[txt("المدينة المقصودة", "Destination city"), destination.trim()] as Row] : []),
    ...(date ? [[txt("موعد السفر التقريبي", "Approximate travel date"), date] as Row] : []),
    ...(travellers ? [[txt("عدد المسافرين", "Travellers"), travellers] as Row] : []),
    ...(companions ? [[txt("عدد المرافقين", "Companions"), companions] as Row] : []),
    ...(support ? [[txt("المساعدة المطلوبة", "Arrangements requested"), ({ accommodation: txt("إقامة", "Accommodation"), transport: txt("تنقلات", "Transport"), both: txt("إقامة وتنقلات", "Accommodation and transport"), none: txt("تذاكر سفر فقط", "Travel only") } as Record<string, string>)[support]] as Row] : []),
    ...(notes.trim() ? [[txt("ملاحظات ترتيبات السفر", "Travel arrangement notes"), notes.trim()] as Row] : []),
  ];
  return <RequestCard lang={lang} serviceCode="medical_travel" canReview={!!purpose && !!destination.trim()} title={txt("رتّب تفاصيل السفر العلاجي", "Plan your medical travel")}
    intro={txt("أخبرنا بالوجهة والترتيبات التي تحتاجها. لا تكتب تشخيصًا طبيًا أو ترسل تقارير وفحوصات هنا.", "Tell us the destination and travel arrangements you need. Please do not enter a diagnosis or share medical records here.")}
    serviceName={txt("السفر العلاجي", "medical travel")} rows={rows}
    note={txt("تبقى القرارات الطبية لدى المختصين، وتُراجع المواعيد والتوافر عند التواصل.", "Medical decisions remain with qualified professionals; appointments and availability are confirmed during follow-up.")}>
    <div className="flight-group"><h4>{txt("الغرض من التنسيق", "Type of travel support")}</h4>
      <div className="flight-input-grid">
        <Field required title={txt("نوع الخدمة الصحية", "Type of care") }><Select value={purpose} onChange={setPurpose} placeholder={txt("اختر نوع الخدمة", "Choose a type")}
          options={[[txt("استشارة", "Consultation"), txt("استشارة", "Consultation")], [txt("فحوصات", "Diagnostics"), txt("فحوصات", "Diagnostics")], [txt("علاج", "Treatment"), txt("علاج", "Treatment")], [txt("مرافقة مريض", "Accompanying a patient"), txt("مرافقة مريض", "Accompanying a patient")]]} /></Field>
        <Field required title={txt("المدينة المقصودة", "Destination city")}><input value={destination} onChange={event => setDestination(event.target.value)} placeholder={txt("مثال: القاهرة", "e.g. Cairo")} /></Field>
      </div>
    </div>
    <div className="flight-group"><h4>{txt("موعد السفر والمرافقون", "Travel date and party")}</h4>
      <div className="flight-input-grid">
        <Field title={<><CalendarDays size={16} />{txt("موعد السفر التقريبي", "Approximate travel date")}</>}><input type="date" min={today()} value={date} onChange={event => setDate(event.target.value)} /></Field>
        <Field title={txt("عدد المسافرين", "Number of travellers")}><Select value={travellers} onChange={setTravellers} placeholder={txt("غير محدد", "Not specified")} options={countOptions(lang, 12)} /></Field>
        <Field title={txt("عدد المرافقين", "Number of companions")}><Select value={companions} onChange={setCompanions} placeholder={txt("غير محدد", "Not specified")} options={[["0", txt("لا يوجد", "None")], ...countOptions(lang, 8)]} /></Field>
        <Field title={txt("ترتيبات إضافية تحتاجها", "Additional arrangements")}><Select value={support} onChange={setSupport} placeholder={txt("اختر ما تحتاجه", "Choose if needed")} options={[["accommodation", txt("إقامة", "Accommodation")], ["transport", txt("تنقلات", "Transport")], ["both", txt("إقامة وتنقلات", "Accommodation and transport")], ["none", txt("تذاكر سفر فقط", "Travel only")]]} /></Field>
      </div>
    </div>
    <div className="flight-group"><h4>{txt("معلومات ترتيبات السفر", "Travel arrangements")}</h4>
      <Field title={txt("متطلبات أو أسئلة إضافية (اختياري)", "Additional travel needs or questions (optional)")}><textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder={txt("مثلاً: احتياجات التنقل أو الإقامة", "e.g. accommodation or mobility arrangements")} /></Field>
    </div>
  </RequestCard>;
}

export function SecurityClearanceForm({ lang }: ServiceFormProps) {
  const [requestType, setRequestType] = useState("");
  const [purpose, setPurpose] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [date, setDate] = useState("");
  const [travellers, setTravellers] = useState("");
  const [documentsReady, setDocumentsReady] = useState("");
  const [question, setQuestion] = useState("");
  const txt = (ar: string, en: string) => label(lang, ar, en);
  const rows: Row[] = [
    ...(requestType ? [[txt("مرحلة الطلب", "Request stage"), requestType === "new" ? txt("استفسار جديد", "New enquiry") : txt("متابعة طلب سابق", "Follow-up on an existing request")] as Row] : []),
    ...(purpose ? [[txt("غرض السفر", "Travel purpose"), ({ tourism: txt("زيارة أو سياحة", "Visit or tourism"), family: txt("زيارة عائلية", "Family visit"), business: txt("عمل", "Business"), transit: txt("عبور", "Transit"), other: txt("غرض آخر", "Other") } as Record<string, string>)[purpose]] as Row] : []),
    ...(departureCity.trim() ? [[txt("مدينة المغادرة", "Departure city"), departureCity.trim()] as Row] : []),
    ...(date ? [[txt("موعد السفر المتوقع", "Expected travel date"), date] as Row] : []),
    ...(travellers ? [[txt("عدد المسافرين", "Travellers"), travellers] as Row] : []),
    ...(documentsReady ? [[txt("حالة المستندات", "Document status"), ({ yes: txt("نعم", "Yes"), partial: txt("بعضها", "Some are ready"), no: txt("ليس بعد", "Not yet") } as Record<string, string>)[documentsReady]] as Row] : []),
    ...(question.trim() ? [[txt("السؤال", "Question"), question.trim()] as Row] : []),
  ];
  return <RequestCard lang={lang} serviceCode="security_clearance" canReview={!!requestType && !!purpose} title={txt("استفسر عن الموافقة الأمنية لمصر", "Enquire about Egypt security clearance")}
    intro={txt("أدخل معلومات السفر العامة فقط لبدء الاستفسار. لا تكتب رقم جواز السفر أو أي بيانات تعريفية حساسة.", "Share general travel details to start your enquiry. Do not enter passport numbers or other sensitive identifiers.")}
    serviceName={txt("الموافقة الأمنية للسفر إلى مصر", "security clearance for travel to Egypt")} rows={rows}
    note={txt("لا يمكن ضمان الموافقة أو مدة صدورها؛ تُراجع الإجراءات والمتطلبات عند التواصل.", "Approval and processing times cannot be guaranteed; requirements are reviewed during follow-up.")}>
    <div className="flight-group"><h4>{txt("تفاصيل الاستفسار", "Enquiry details")}</h4>
      <div className="flight-input-grid">
        <Field required title={txt("مرحلة الطلب", "Request stage")}><Select value={requestType} onChange={setRequestType} placeholder={txt("اختر المرحلة", "Choose a stage")} options={[["new", txt("استفسار جديد", "New enquiry")], ["follow-up", txt("متابعة طلب سابق", "Follow-up on an existing request")]]} /></Field>
        <Field required title={txt("غرض السفر", "Travel purpose")}><Select value={purpose} onChange={setPurpose} placeholder={txt("اختر الغرض", "Choose a purpose")} options={[["tourism", txt("زيارة أو سياحة", "Visit or tourism")], ["family", txt("زيارة عائلية", "Family visit")], ["business", txt("عمل", "Business")], ["transit", txt("عبور", "Transit")], ["other", txt("غرض آخر", "Other")]]} /></Field>
      </div>
    </div>
    <div className="flight-group"><h4>{txt("توقيت السفر والمسافرون", "Travel timing and party")}</h4>
      <div className="flight-input-grid">
        <Field title={txt("مدينة المغادرة", "Departure city")}><input value={departureCity} onChange={event => setDepartureCity(event.target.value)} placeholder={txt("مثال: عدن", "e.g. Aden")} /></Field>
        <Field title={<><CalendarDays size={16} />{txt("موعد السفر المتوقع", "Expected travel date")}</>}><input type="date" min={today()} value={date} onChange={event => setDate(event.target.value)} /></Field>
        <Field title={txt("عدد المسافرين", "Number of travellers")}><Select value={travellers} onChange={setTravellers} placeholder={txt("غير محدد", "Not specified")} options={countOptions(lang, 12)} /></Field>
        <Field title={txt("هل مستندات السفر جاهزة؟", "Are your travel documents ready?")}><Select value={documentsReady} onChange={setDocumentsReady} placeholder={txt("اختر إجابة", "Choose an answer")} options={[["yes", txt("نعم", "Yes")], ["partial", txt("بعضها", "Some are ready")], ["no", txt("ليس بعد", "Not yet")]]} /></Field>
      </div>
    </div>
    <div className="flight-group"><h4>{txt("سؤالك أو ملاحظتك", "Your question")}</h4>
      <Field title={txt("ما الذي تريد معرفته؟ (اختياري)", "What would you like to know? (optional)")}><textarea rows={3} value={question} onChange={event => setQuestion(event.target.value)} placeholder={txt("لا ترفق أرقام الجوازات أو صور الوثائق", "Do not include passport numbers or document images")} /></Field>
    </div>
  </RequestCard>;
}

export function UmrahForm({ lang }: ServiceFormProps) {
  const [date, setDate] = useState("");
  const [travellers, setTravellers] = useState(1);
  const [passengerNames, setPassengerNames] = useState<string[]>([""]);
  const [passportFiles, setPassportFiles] = useState<(File | null)[]>([null]);
  const [altPhone, setAltPhone] = useState("");
  const [details, setDetails] = useState("");
  const txt = (ar: string, en: string) => label(lang, ar, en);
  const changeTravellerCount = (next: number) => {
    const count = Math.max(1, Math.min(9, next));
    setTravellers(count);
    setPassengerNames(names => [...names, ...Array(Math.max(0, count - names.length)).fill("")].slice(0, count));
    setPassportFiles(files => [...files, ...Array(Math.max(0, count - files.length)).fill(null)].slice(0, count));
  };
  const rows: Row[] = [
    ...(date ? [[txt("تاريخ العمرة", "Umrah date"), date] as Row] : []),
    [txt("عدد المعتمرين", "Number of pilgrims"), String(travellers)],
    ...passengerNames.slice(0, travellers).map((name, index) => [
      txt("اسم المعتمر", "Pilgrim name") + " " + (index + 1),
      (name.trim() || txt("لم يحدد بعد", "Not provided")) + " — " + txt("صورة الجواز", "Passport image") + ": " + (passportFiles[index]?.name || txt("لم ترفق", "Not attached"))
    ] as Row),
    ...(altPhone.trim() ? [[txt("رقم هاتف بديل", "Alternative phone number"), altPhone.trim()] as Row] : []),
    ...(details.trim() ? [[txt("تفاصيل أخرى", "Other details"), details.trim()] as Row] : []),
    ...(passportFiles.some(Boolean) ? [[txt("مرفقات الجواز", "Passport attachments"), passportFiles.filter(Boolean).map(file => file!.name).join(", ") + ". " + txt("يرجى إرفاق الملفات يدويًا في محادثة واتساب.", "Please attach the files manually in WhatsApp.")] as Row] : []),
  ];
  const canReview = !!date && passengerNames.slice(0, travellers).every(name => name.trim().length > 1) && passportFiles.slice(0, travellers).every(Boolean);

  return <RequestCard lang={lang} serviceCode="umrah" canReview={canReview} title={txt("طلب تأشيرة العمرة", "Umrah visa request")}
    intro={txt("أدخل تاريخ العمرة وبيانات كل معتمر وأرفق صورة جوازه لبدء طلب التأشيرة.", "Enter the Umrah date and each pilgrim’s details, and attach a passport image to start the visa request.")}
    serviceName={txt("تأشيرة العمرة", "an Umrah visa")} rows={rows}
    note={txt("راجع تفاصيل الطلب قبل إرساله. أرفق صور الجوازات يدويًا في محادثة واتساب؛ إرسال الطلب لا يعني صدور التأشيرة أو تأكيد الحجز.", "Review the request before sending. Attach passport images manually in WhatsApp; sending the request does not mean a visa has been issued or a booking confirmed.")}>
    <div className="flight-group">
      <h4>{txt("تاريخ العمرة", "Umrah date")}</h4>
      <Field required title={<><CalendarDays size={16} />{txt("موعد العمرة", "Umrah date")}</>}>
        <input type="date" min={today()} value={date} onChange={event => setDate(event.target.value)} />
      </Field>
    </div>
    <div className="flight-group">
      <div className="maak-passengers-title"><Users size={18}/><strong>{txt("المعتمرون", "Pilgrims")}</strong></div>
      <div className="maak-counter">
        <span><strong>{txt("عدد المعتمرين", "Number of pilgrims")} *</strong><small>{txt("اختر العدد المطلوب", "Select the number of pilgrims")}</small></span>
        <div>
          <button type="button" onClick={() => changeTravellerCount(travellers - 1)} aria-label={txt("تقليل العدد", "Decrease count")}><Minus size={16}/></button>
          <output>{travellers}</output>
          <button type="button" onClick={() => changeTravellerCount(travellers + 1)} aria-label={txt("زيادة العدد", "Increase count")}><Plus size={16}/></button>
        </div>
      </div>
      <div className="maak-passenger-details">
        <h4>{txt("أسماء المعتمرين ومرفقات الجوازات", "Pilgrim names and passport attachments")}</h4>
        <p>{txt("اكتب الاسم كما يظهر في الجواز وأرفق صورة لكل معتمر.", "Enter each name exactly as shown on the passport and attach an image for each pilgrim.")}</p>
        {Array.from({ length: travellers }, (_, index) => <div className="maak-passenger-row" key={index}>
          <div className="maak-field">
            <label htmlFor={"umrah-name-" + index}>{txt("اسم المعتمر", "Pilgrim name")} {index + 1} *</label>
            <input id={"umrah-name-" + index} required value={passengerNames[index] || ""} onChange={event => setPassengerNames(names => names.map((name, i) => i === index ? event.target.value : name))} placeholder={txt("الاسم الكامل كما في الجواز", "Full name as in passport")} />
          </div>
          <label className="maak-passport-upload">
            <span>{txt("صورة الجواز", "Passport image")} *</span>
            <input required type="file" accept="image/*,.pdf" onChange={event => setPassportFiles(files => files.map((file, i) => i === index ? event.target.files?.[0] || null : file))} />
            <small>{passportFiles[index]?.name || txt("إرفاق صورة أو ملف", "Attach image or file")}</small>
          </label>
        </div>)}
      </div>
    </div>
    <div className="flight-group">
      <Field title={txt("رقم هاتف بديل", "Alternative phone number")}>
        <input type="tel" inputMode="tel" value={altPhone} onChange={event => setAltPhone(event.target.value.replace(/[^0-9+()\s-]/g, ""))} placeholder={txt("اختياري", "Optional")} />
      </Field>
      <Field title={txt("تفاصيل أخرى", "Other details")}>
        <textarea rows={3} value={details} onChange={event => setDetails(event.target.value)} placeholder={txt("اختياري", "Optional")} />
      </Field>
    </div>
  </RequestCard>;
}
export function RealEstateForm({ lang }: ServiceFormProps) {
  const [serviceType, setServiceType] = useState("");
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [rooms, setRooms] = useState("");
  const [budget, setBudget] = useState("");
  const [timing, setTiming] = useState("");
  const [details, setDetails] = useState("");
  const txt = (ar: string, en: string) => label(lang, ar, en);
  const rows: Row[] = [
    ...(serviceType ? [[txt("نوع الخدمة العقارية", "Property service"), ({ rent: txt("استئجار", "Rent"), buy: txt("شراء", "Buy"), sell: txt("بيع", "Sell"), management: txt("إدارة عقار", "Property management") } as Record<string, string>)[serviceType]] as Row] : []),
    ...(city.trim() ? [[txt("المدينة", "City"), city.trim()] as Row] : []),
    ...(area.trim() ? [[txt("الحي أو المنطقة", "Neighbourhood or area"), area.trim()] as Row] : []),
    ...(propertyType ? [[txt("نوع العقار", "Property type"), ({ apartment: txt("شقة", "Apartment"), house: txt("منزل أو فيلا", "House or villa"), land: txt("أرض", "Land"), commercial: txt("عقار تجاري", "Commercial property"), other: txt("نوع آخر", "Other") } as Record<string, string>)[propertyType]] as Row] : []),
    ...(rooms ? [[txt("عدد غرف النوم", "Bedrooms"), rooms === "studio" ? txt("استوديو", "Studio") : rooms] as Row] : []),
    ...(budget ? [[txt("الميزانية التقريبية", "Approximate budget"), budget] as Row] : []),
    ...(timing ? [[txt("التوقيت المتوقع", "Expected timing"), timing] as Row] : []),
    ...(details.trim() ? [[txt("تفاصيل إضافية", "Additional details"), details.trim()] as Row] : []),
  ];
  return <RequestCard lang={lang} serviceCode="real_estate" canReview={!!serviceType && !!propertyType && !!city.trim()} title={txt("ما الخدمة العقارية التي تبحث عنها؟", "What property service do you need?")}
    intro={txt("أخبرنا بنوع الخدمة والمدينة ومواصفات العقار لتوجيه استفسارك.", "Share the service, location and property details so we can direct your enquiry.")}
    serviceName={txt("الخدمات العقارية", "real estate services")} rows={rows}
    note={txt("تُراجع الأسعار والتفاصيل والتوافر مباشرة، ولا يمثل هذا الاستفسار عرضًا أو التزامًا.", "Prices, details and availability are confirmed directly; this enquiry is not an offer or commitment.")}>
    <div className="flight-group"><h4>{txt("الخدمة والموقع", "Service and location")}</h4>
      <div className="flight-input-grid">
        <Field required title={txt("نوع الخدمة", "Service needed")}><Select value={serviceType} onChange={setServiceType} placeholder={txt("اختر الخدمة", "Choose a service")} options={[["rent", txt("استئجار", "Rent")], ["buy", txt("شراء", "Buy")], ["sell", txt("بيع", "Sell")], ["management", txt("إدارة عقار", "Property management")]]} /></Field>
        <Field required title={txt("نوع العقار", "Property type")}><Select value={propertyType} onChange={setPropertyType} placeholder={txt("اختر نوع العقار", "Choose a property type")} options={[["apartment", txt("شقة", "Apartment")], ["house", txt("منزل أو فيلا", "House or villa")], ["land", txt("أرض", "Land")], ["commercial", txt("عقار تجاري", "Commercial property")], ["other", txt("نوع آخر", "Other")]]} /></Field>
        <Field required title={txt("المدينة", "City")}><input value={city} onChange={event => setCity(event.target.value)} placeholder={txt("مثال: عدن", "e.g. Aden")} /></Field>
        <Field title={txt("الحي أو المنطقة (اختياري)", "Neighbourhood or area (optional)")}><input value={area} onChange={event => setArea(event.target.value)} /></Field>
      </div>
    </div>
    <div className="flight-group"><h4>{txt("مواصفات وميزانية العقار", "Property preferences and budget")}</h4>
      <div className="flight-input-grid">
        <Field title={txt("عدد غرف النوم", "Bedrooms")}><Select value={rooms} onChange={setRooms} placeholder={txt("غير محدد", "Not specified")} options={[["studio", txt("استوديو", "Studio")], ...countOptions(lang, 10)]} /></Field>
        <Field title={txt("الميزانية والعملة", "Budget and currency")}><input value={budget} onChange={event => setBudget(event.target.value)} placeholder={txt("مثال: 300 دولار شهريًا", "e.g. $300 per month")} /></Field>
        <Field title={txt("موعد البدء أو التصرف المتوقع", "Expected start or transaction date")}><Select value={timing} onChange={setTiming} placeholder={txt("اختر توقيتًا", "Choose timing")} options={[["soon", txt("في أقرب وقت", "As soon as possible")], ["month", txt("خلال شهر", "Within a month")], ["quarter", txt("خلال ثلاثة أشهر", "Within three months")], ["flexible", txt("مرن", "Flexible")]]} /></Field>
      </div>
      <Field title={txt("مواصفات أو أسئلة أخرى (اختياري)", "Other preferences or questions (optional)")}><textarea rows={3} value={details} onChange={event => setDetails(event.target.value)} placeholder={txt("مثلاً: مفروش، موقف سيارة، أو مساحة محددة", "e.g. furnished, parking, or preferred size")} /></Field>
    </div>
  </RequestCard>;
}

export function TourismForm({ lang }: ServiceFormProps) {
  const [tripType, setTripType] = useState("");
  const [destination, setDestination] = useState("");
  const [departureCity, setDepartureCity] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [travellers, setTravellers] = useState("");
  const [budget, setBudget] = useState("");
  const [services, setServices] = useState("");
  const [notes, setNotes] = useState("");
  const txt = (ar: string, en: string) => label(lang, ar, en);
  const rows: Row[] = [
    ...(tripType ? [[txt("طبيعة الرحلة", "Trip style"), ({ family: txt("عائلية", "Family"), culture: txt("ثقافية", "Cultural"), nature: txt("طبيعة ومغامرة", "Nature and adventure"), relaxation: txt("استجمام", "Relaxation"), custom: txt("مخصصة", "Custom") } as Record<string, string>)[tripType]] as Row] : []),
    ...(destination.trim() ? [[txt("الوجهة أو الوجهات", "Destination(s)"), destination.trim()] as Row] : []),
    ...(departureCity.trim() ? [[txt("مدينة الانطلاق", "Departure city"), departureCity.trim()] as Row] : []),
    ...(date ? [[txt("تاريخ البداية المتوقع", "Expected start date"), date] as Row] : []),
    ...(duration ? [[txt("مدة الرحلة", "Trip duration"), duration] as Row] : []),
    ...(travellers ? [[txt("عدد المسافرين", "Travellers"), travellers] as Row] : []),
    ...(budget ? [[txt("ميزانية الفرد التقريبية", "Approximate budget per person"), budget] as Row] : []),
    ...(services ? [[txt("الخدمات المطلوبة", "Services needed"), ({ transport: txt("تنقلات", "Transport"), accommodation: txt("إقامة", "Accommodation"), activities: txt("أنشطة وجولات", "Activities and tours"), all: txt("تنسيق الرحلة بالكامل", "Full trip coordination") } as Record<string, string>)[services]] as Row] : []),
    ...(notes.trim() ? [[txt("تفاصيل الرحلة", "Trip details"), notes.trim()] as Row] : []),
  ];
  return <RequestCard lang={lang} serviceCode="tourism" canReview={!!tripType && !!destination.trim()} title={txt("صمّم رحلتك السياحية", "Shape your travel plans")}
    intro={txt("شاركنا الوجهة وطبيعة الرحلة والخدمات التي تهمك، وسنساعدك في ترتيب الخيارات المناسبة.", "Tell us where you want to go, what kind of trip you have in mind and which arrangements matter to you.")}
    serviceName={txt("السياحة والرحلات", "tourism and trips")} rows={rows}
    note={txt("تُراجع البرامج والأسعار والتوافر قبل تأكيد أي ترتيب.", "Itineraries, prices and availability are confirmed before any arrangements are finalized.")}>
    <div className="flight-group"><h4>{txt("وجهتك وطبيعة الرحلة", "Destination and trip style")}</h4>
      <div className="flight-input-grid">
        <Field required title={txt("طبيعة الرحلة", "Trip style")}><Select value={tripType} onChange={setTripType} placeholder={txt("اختر ما يناسبك", "Choose a trip style")} options={[["family", txt("عائلية", "Family")], ["culture", txt("ثقافية", "Cultural")], ["nature", txt("طبيعة ومغامرة", "Nature and adventure")], ["relaxation", txt("استجمام", "Relaxation")], ["custom", txt("مخصصة", "Custom")]]} /></Field>
        <Field required title={txt("الوجهة أو الوجهات", "Destination(s)")}><input value={destination} onChange={event => setDestination(event.target.value)} placeholder={txt("مثال: القاهرة والأقصر", "e.g. Cairo and Luxor")} /></Field>
        <Field title={txt("مدينة الانطلاق", "Departure city")}><input value={departureCity} onChange={event => setDepartureCity(event.target.value)} placeholder={txt("اختياري", "Optional")} /></Field>
      </div>
    </div>
    <div className="flight-group"><h4>{txt("المدة والمجموعة والميزانية", "Timing, group and budget")}</h4>
      <div className="flight-input-grid">
        <Field title={<><CalendarDays size={16} />{txt("تاريخ البداية المتوقع", "Expected start date")}</>}><input type="date" min={today()} value={date} onChange={event => setDate(event.target.value)} /></Field>
        <Field title={txt("مدة الرحلة", "Trip duration")}><Select value={duration} onChange={setDuration} placeholder={txt("اختر المدة", "Choose duration")} options={[["weekend", txt("2–3 أيام", "2–3 days")], ["short", txt("4–7 أيام", "4–7 days")], ["week", txt("أسبوع", "One week")], ["long", txt("أكثر من أسبوع", "More than a week")], ["flexible", txt("مرنة", "Flexible")]]} /></Field>
        <Field title={txt("عدد المسافرين", "Number of travellers")}><Select value={travellers} onChange={setTravellers} placeholder={txt("غير محدد", "Not specified")} options={countOptions(lang, 30)} /></Field>
        <Field title={txt("ميزانية الفرد والعملة (اختياري)", "Budget per person and currency (optional)")}><input value={budget} onChange={event => setBudget(event.target.value)} placeholder={txt("مثال: 500 دولار", "e.g. $500")} /></Field>
      </div>
    </div>
    <div className="flight-group"><h4>{txt("الخدمات والتفاصيل", "Services and details")}</h4>
      <div className="flight-input-grid">
        <Field title={txt("الخدمات التي تحتاجها", "Services you need")}><Select value={services} onChange={setServices} placeholder={txt("اختر الخدمة", "Choose a service")} options={[["transport", txt("تنقلات", "Transport")], ["accommodation", txt("إقامة", "Accommodation")], ["activities", txt("أنشطة وجولات", "Activities and tours")], ["all", txt("تنسيق الرحلة بالكامل", "Full trip coordination")]]} /></Field>
      </div>
      <Field title={txt("تفضيلات أو تفاصيل أخرى (اختياري)", "Other preferences or details (optional)")}><textarea rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder={txt("مثلاً: أماكن تود زيارتها أو متطلبات خاصة", "e.g. places to visit or special arrangements")} /></Field>
    </div>
  </RequestCard>;
}
