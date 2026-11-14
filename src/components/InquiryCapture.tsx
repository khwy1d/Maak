import { useEffect, useRef, useState, type FormEvent } from "react";
import { submitInquiry, type InquiryService } from "../lib/orders";
import { createBooking, bookingRef } from "../lib/bookings";
import { formatApiError, supabase } from "../lib/supabase";
import { useAccountName } from "../hooks/useAccountName";
import { getPassportFiles, clearPassportFiles, getOrCreatePassportUploadToken } from "../lib/passportUploads";

type PendingInquiry = { service: InquiryService; message: string; url: string; requestData: Record<string, unknown>; passportUploadKey: string; passportUploadToken: string };
type SavedBooking = { reference: string; url: string } | null;

function normalizeInternationalPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!/^[1-9][0-9]{6,14}$/.test(digits)) return null;
  return "+" + digits;
}
const fallbackIdempotencyKeys = new Map<string, string>();

async function getOrCreateIdempotencyKey(service: string, payload: unknown) {
  const serialized = JSON.stringify(payload);
  let fingerprint = serialized;
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
    fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    // The serialized payload remains a deterministic fallback fingerprint.
  }
  const storageKey = `maak-inquiry-idempotency:${service}:${fingerprint}`;
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return { key: existing, storageKey, fallbackKey: null };
    const key = globalThis.crypto.randomUUID();
    localStorage.setItem(storageKey, key);
    return { key, storageKey, fallbackKey: null };
  } catch {
    const fallbackKey = storageKey;
    const existing = fallbackIdempotencyKeys.get(fallbackKey);
    if (existing) return { key: existing, storageKey: null, fallbackKey };
    const key = globalThis.crypto.randomUUID();
    fallbackIdempotencyKeys.set(fallbackKey, key);
    return { key, storageKey: null, fallbackKey };
  }
}

function clearIdempotencyKey(intent: { key: string; storageKey: string | null; fallbackKey: string | null }) {
  if (intent.fallbackKey) fallbackIdempotencyKeys.delete(intent.fallbackKey);
  if (intent.storageKey) {
    try {
      if (localStorage.getItem(intent.storageKey) === intent.key) localStorage.removeItem(intent.storageKey);
    } catch {
      // A confirmed save can still complete when browser storage is unavailable.
    }
  }
}

const allowedServices = new Set<InquiryService>([
  "flight", "ground_transport", "accommodation", "car_rental",
  "medical_travel", "security_clearance", "umrah", "real_estate", "tourism",
]);

export default function InquiryCapture({ lang }: { lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const accountName = useAccountName();
  const [pending, setPending] = useState<PendingInquiry | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedBooking, setSavedBooking] = useState<SavedBooking>(null);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => { if (pending && accountName) setName(current => current || accountName); }, [accountName, pending]);

  useEffect(() => {
    if (!pending) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      const target = returnFocusRef.current;
      requestAnimationFrame(() => {
        if (target?.isConnected) target.focus();
        returnFocusRef.current = null;
      });
    };
  }, [pending]);

  useEffect(() => {
    const client = supabase;
    const capture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[data-save-inquiry="true"]');
      if (!link) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const service = link.dataset.inquiryService as InquiryService | undefined;
      if (!service || !allowedServices.has(service)) {
        setError(ar ? "نوع الخدمة غير صالح." : "Invalid service type.");
        return;
      }
      const parsed = new URL(link.href);
      if (parsed.protocol !== "https:" || parsed.hostname !== "wa.me" || !/^\d+$/.test(parsed.pathname.slice(1))) {
        setError(ar ? "رابط واتساب غير صالح." : "Invalid WhatsApp link.");
        return;
      }
      const message = parsed.searchParams.get("text") ?? service;
      let requestData: Record<string, unknown> = {};
      try {
        const rawRequestData = link.dataset.requestData;
        if (rawRequestData) {
          const parsedRequestData: unknown = JSON.parse(rawRequestData);
          if (parsedRequestData && typeof parsedRequestData === "object" && !Array.isArray(parsedRequestData)) {
            requestData = parsedRequestData as Record<string, unknown>;
          }
        }
      } catch {
        setError(ar ? "تعذر قراءة تفاصيل الطلب. أعد المحاولة." : "Could not read request details. Please try again.");
        return;
      }
      returnFocusRef.current = link;
      setSavedBooking(null);
      setPending({ service, message, url: link.href, requestData, passportUploadKey: link.dataset.passportUploadKey ?? "", passportUploadToken: getOrCreatePassportUploadToken(link.dataset.passportUploadKey ?? "") });
      setName(accountName);
      setError("");
      if (client) {
        void client.auth.getUser().then(async ({ data }) => {
          if (!data.user) return;
          const { data: profile } = await client.from("profiles").select("full_name,phone").eq("id", data.user.id).maybeSingle();
          if (profile) setPhone(profile.phone ?? "");
        });
      }
    };
    document.addEventListener("click", capture, true);
    return () => document.removeEventListener("click", capture, true);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    const normalizedPhone = normalizeInternationalPhone(phone);
    if (!normalizedPhone) {
      setError(ar ? "أدخل رقمًا دوليًا صحيحًا مع رمز الدولة." : "Enter a valid international phone number with its country code.");
      return;
    }
    if (name.trim().length < 2) {
      setError(ar ? "يرجى إدخال الاسم." : "Please enter your name.");
      return;
    }
    setBusy(true); setError("");
    try {
      const formData = pending.requestData.form_data as Record<string, unknown> | undefined;
      const dateValues = Array.isArray(pending.requestData.date_values) ? pending.requestData.date_values : [];
      const preferredDate = dateValues.find((value): value is string => typeof value === "string" && /^\\d{4}-\\d{2}-\\d{2}$/.test(value)) ?? null;
      const details = {
        ...pending.requestData,
        ...(pending.passportUploadKey ? { passport_upload_token: pending.passportUploadToken } : {}),
        message: pending.message,
        source_path: window.location.pathname,
      };
      const booking = await createBooking({
        customerName: name,
        customerPhone: normalizedPhone,
        serviceType: pending.service,
        serviceDetails: details,
        preferredDate,
      });

      // Passport uploads currently use the existing secure order-upload endpoint,
      // so retain the legacy order record only for requests carrying passport files.
      const passportFiles = pending.passportUploadKey ? getPassportFiles(pending.passportUploadKey) : [];
      if (passportFiles.length) {
        const orderPayload = {
          customerName: name,
          customerPhone: normalizedPhone,
          service: pending.service,
          requestData: details,
        };
        const idempotencyIntent = await getOrCreateIdempotencyKey(pending.service, orderPayload);
        const savedOrder = await submitInquiry({ ...orderPayload, idempotencyKey: idempotencyIntent.key });
        const savedRecord = (Array.isArray(savedOrder) ? savedOrder[0] : savedOrder) as Record<string, unknown> | null;
        const orderId = typeof savedRecord?.id === "string" ? savedRecord.id : "";
        const passengerNames = Array.isArray(formData?.passenger_names) ? formData.passenger_names : [];
        if (!orderId || passengerNames.length !== passportFiles.length || !supabase) {
          throw new Error(ar ? "حُفظ الحجز، لكن تعذر تجهيز مرفقات الجواز. تواصل معنا مع رقم الحجز." : "The booking was saved, but passport attachments could not be prepared. Contact us with the booking reference.");
        }
        for (let index = 0; index < passportFiles.length; index += 1) {
          const passengerName = passengerNames[index];
          if (typeof passengerName !== "string" || passengerName.trim().length < 2) {
            throw new Error(ar ? "تحقق من أسماء المسافرين ومرفقاتهم." : "Check passenger names and their attachments.");
          }
          const upload = new FormData();
          upload.append("orderId", orderId);
          upload.append("uploadToken", pending.passportUploadToken);
          upload.append("passengerIndex", String(index));
          upload.append("passengerName", passengerName.trim());
          upload.append("file", passportFiles[index], passportFiles[index].name);
          const { error: uploadError } = await supabase.functions.invoke("upload-passport", { body: upload });
          if (uploadError) throw uploadError;
        }
        clearPassportFiles(pending.passportUploadKey);
        clearIdempotencyKey(idempotencyIntent);
      }
      if (pending.service === "flight") {
        try { localStorage.removeItem("maak-flight-request-v2"); } catch { /* storage may be unavailable */ }
      }
      setSavedBooking({ reference: bookingRef(booking.id), url: pending.url });
    } catch (cause) {
      setError(formatApiError(cause));
    } finally { setBusy(false); }
  };

  if (!pending) return null;
  return <dialog ref={dialogRef} className="account-modal-backdrop" aria-labelledby="inquiry-capture-title" dir={ar ? "rtl" : "ltr"}
    onCancel={event => { if (busy) event.preventDefault(); else setPending(null); }}
    onClick={event => { if (event.target === event.currentTarget && !busy) setPending(null); }}>
    <section className="account-card inquiry-contact-modal">
      <button ref={closeButtonRef} type="button" className="account-modal-close" onClick={() => setPending(null)} aria-label={ar ? "إغلاق" : "Close"}>×</button>
      <h2 id="inquiry-capture-title">{ar ? "بيانات التواصل وحفظ الطلب" : "Contact details and save request"}</h2>
      <p>{ar ? "سيُسجّل طلبك في نظام الحجوزات الداخلي، ثم يمكنك متابعة التفاصيل عبر واتساب اختياريًا." : "Your request will be saved in the internal booking system. You can optionally follow up on WhatsApp."}</p>
      {savedBooking ? <div className="account-form" role="status"><h3>{ar ? "تم تسجيل طلبك بنجاح" : "Your request has been registered"}</h3><p>{ar ? "الرقم المرجعي للحجز:" : "Booking reference:"} <strong dir="ltr">{savedBooking.reference}</strong></p><p>{ar ? "حالة الطلب: قيد المراجعة. يمكنك الاحتفاظ بالرقم لمتابعته." : "Status: pending review. Keep this reference to follow up."}</p><a className="btn btn-primary" href={savedBooking.url} target="_blank" rel="noopener noreferrer">{ar ? "متابعة اختيارية عبر واتساب" : "Optional WhatsApp follow-up"}</a><button type="button" className="btn btn-ghost" onClick={() => { setSavedBooking(null); setPending(null); }}>{ar ? "إغلاق" : "Close"}</button></div> : <form className="account-form" onSubmit={submit}>
        <label>{ar ? "الاسم" : "Name"}<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} autoComplete="name"/></label>
        <label>{ar ? "رقم الهاتف بصيغة دولية" : "Phone number in international format"}<input required type="tel" minLength={7} maxLength={18} pattern="(?:\\+|00)?[1-9][0-9]{6,14}" title={ar ? "أدخل رقمًا دوليًا مع رمز الدولة، ويمكن استخدام + أو 00" : "Enter an international number with its country code; + or 00 is accepted"} value={phone} onChange={event => setPhone(event.target.value.replace(/[^+\d]/g, ""))} placeholder="+967…" autoComplete="tel"/></label>
        {error && <p className="account-message" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? (ar ? "جارٍ تسجيل الحجز…" : "Registering booking…") : (ar ? "تأكيد الطلب وحفظه" : "Confirm request and save")}</button>
      </form>
    </section>
  </dialog>;
}
