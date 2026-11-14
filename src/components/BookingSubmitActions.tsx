import { useState } from "react";
import { MessageCircle } from "lucide-react";
import type { InquiryService } from "../lib/orders";

type Props = {
  lang: "ar" | "en";
  service: InquiryService;
  whatsappUrl: string;
  requestData: Record<string, unknown>;
  passportUploadKey?: string;
  canSubmit?: boolean;
};

export default function BookingSubmitActions({ lang, service, whatsappUrl, requestData, passportUploadKey = "", canSubmit = true }: Props) {
  const ar = lang === "ar";
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ reference: string; url: string } | null>(null);
  const message = (() => {
    try { return new URL(whatsappUrl).searchParams.get("text") ?? ""; }
    catch { return ""; }
  })();

  const confirm = () => {
    setError("");
    if (customerName.trim().length < 2) {
      setError(ar ? "يرجى إدخال الاسم بشكل صحيح." : "Please enter your name.");
      return;
    }
    const digits = customerPhone.replace(/[٠-٩۰-۹]/g, digit => {
      const code = digit.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    }).replace(/\D/g, "");
    const normalizedPhone = digits.startsWith("00") ? digits.slice(2) : digits;
    if (!/^[1-9][0-9]{6,14}$/.test(normalizedPhone)) {
      setError(ar ? "أدخل رقم هاتف دوليًا صحيحًا مع رمز الدولة." : "Enter a valid international phone number with country code.");
      return;
    }
    setSaving(true);
    window.dispatchEvent(new CustomEvent("maak:save-inquiry", { detail: {
      service, message, requestData, passportUploadKey,
      customerName: customerName.trim(), customerPhone: customerPhone.trim(),
      onSuccess: (result: { reference: string; url: string }) => { setSaved(result); setSaving(false); setError(""); },
      onError: (reason: string) => { setError(reason); setSaving(false); },
    }}));
  };

  return <div className="maak-booking-submit-actions">
    <div className="flight-input-grid maak-booking-contact-fields">
      <label className="inquiry-field flight-field">{ar ? "الاسم" : "Name"} <span className="field-required">*</span><input required minLength={2} maxLength={120} autoComplete="name" value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder={ar ? "الاسم الكامل" : "Full name"}/></label>
      <label className="inquiry-field flight-field">{ar ? "رقم الهاتف مع رمز الدولة" : "Phone number with country code"} <span className="field-required">*</span><input required type="tel" minLength={7} maxLength={18} autoComplete="tel" value={customerPhone} onChange={event => setCustomerPhone(event.target.value.replace(/[^+٠-٩۰-۹0-9]/g, ""))} placeholder="+967…"/></label>
    </div>
    {error && <p className="account-message" role="alert">{error}</p>}
    {saved && <p className="account-message" role="status">{ar ? "تم تسجيل الحجز بنجاح. الرقم المرجعي:" : "Booking saved. Reference:"} <strong dir="ltr">{saved.reference}</strong></p>}
    <div className="flight-summary-actions">
      <button type="button" className="btn btn-primary" onClick={confirm} disabled={!canSubmit || saving || !!saved}>{saving ? (ar ? "جارٍ تأكيد الطلب…" : "Confirming…") : saved ? (ar ? "تم تأكيد الطلب" : "Request confirmed") : (ar ? "تأكيد الطلب" : "Confirm request")}</button>
      <a className="btn btn-ghost" href={saved?.url ?? whatsappUrl} target="_blank" rel="noopener noreferrer" aria-disabled={!canSubmit} onClick={event => { if (!canSubmit) event.preventDefault(); }}><MessageCircle size={18}/>{ar ? "متابعة الطلب عبر واتساب" : "Follow up via WhatsApp"}</a>
    </div>
  </div>;
}
