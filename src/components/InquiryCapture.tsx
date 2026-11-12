import { useEffect, useState, type FormEvent } from "react";
import { submitInquiry } from "../lib/orders";
import { formatApiError, supabase } from "../lib/supabase";
import { useAccountName } from "../hooks/useAccountName";

type PendingInquiry = { service: string; message: string; url: string; requestData: Record<string, unknown> };
async function getOrCreateIdempotencyKey(payload: unknown): Promise<string> {
  const serialized = JSON.stringify(payload);
  try {
    if (!globalThis.crypto?.subtle) throw new Error("Secure hashing unavailable");
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(serialized));
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const storageKey = `maak-inquiry-idempotency:${fingerprint}`;
    const now = Date.now();
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as { key?: string; createdAt?: number };
        if (parsed.key && parsed.createdAt && now - parsed.createdAt < 24 * 60 * 60 * 1000) return parsed.key;
      }
      const key = globalThis.crypto.randomUUID();
      sessionStorage.setItem(storageKey, JSON.stringify({ key, createdAt: now }));
      return key;
    } catch {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    return globalThis.crypto.randomUUID();
  }
}

const serviceNames: Record<string, string> = {
  "/flights": "flight", "/transport": "ground_transport", "/hotels": "accommodation",
  "/car-rental": "car_rental", "/medical-tourism": "medical_travel", "/security-clearance-egypt": "security_clearance",
  "/umrah": "umrah", "/real-estate": "real_estate", "/tourism": "tourism",
};

export default function InquiryCapture({ lang }: { lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const accountName = useAccountName();
  const [pending, setPending] = useState<PendingInquiry | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (pending && accountName) setName(current => current || accountName); }, [accountName, pending]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const capture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[data-save-inquiry="true"]');
      const service = serviceNames[window.location.pathname.replace(/\/+$/, "")];
      if (!link || !service) return;
      const parsed = new URL(link.href);
      if (parsed.protocol !== "https:" || parsed.hostname !== "wa.me" || !/^\\d+$/.test(parsed.pathname.slice(1))) return;
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
      event.preventDefault();
      event.stopImmediatePropagation();
      setPending({ service, message, url: link.href, requestData });
      setName(accountName);
      setError("");
      void client.auth.getUser().then(async ({ data }) => {
        if (!data.user) return;
        const { data: profile } = await client.from("profiles").select("full_name,phone").eq("id", data.user.id).maybeSingle();
        if (profile) setPhone(profile.phone ?? "");
      });
    };
    document.addEventListener("click", capture, true);
    return () => document.removeEventListener("click", capture, true);
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!pending) return;
    setBusy(true); setError("");
    const whatsapp = window.open("about:blank", "_blank");
    if (whatsapp) whatsapp.opener = null;
    try {
      const orderPayload = {
        customerName: name,
        customerPhone: phone,
        service: pending.service,
        requestData: { ...pending.requestData, message: pending.message, source_path: window.location.pathname },
      };
      const idempotencyKey = await getOrCreateIdempotencyKey(orderPayload);
      await submitInquiry({ ...orderPayload, idempotencyKey });
      if (pending.service === "flight") {
        try { localStorage.removeItem("maak-flight-request-v2"); } catch { /* storage may be unavailable */ }
      }
      if (whatsapp) whatsapp.location.href = pending.url;
      else window.location.assign(pending.url);
      setPending(null);
    } catch (cause) {
      whatsapp?.close();
      setError(formatApiError(cause));
    } finally { setBusy(false); }
  };

  if (!pending) return null;
  return <div className="account-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setPending(null); }}>
    <section className="account-card inquiry-contact-modal" role="dialog" aria-modal="true" aria-labelledby="inquiry-capture-title" dir={ar ? "rtl" : "ltr"}>
      <button type="button" className="account-modal-close" onClick={() => setPending(null)} aria-label={ar ? "إغلاق" : "Close"}>×</button>
      <h2 id="inquiry-capture-title">{ar ? "بيانات التواصل وحفظ الطلب" : "Contact details and save request"}</h2>
      <p>{ar ? "سنحفظ طلبك في النظام قبل فتح واتساب. لا يُعد ذلك تأكيدًا للحجز." : "We will save your request before opening WhatsApp. This does not confirm a booking."}</p>
      <form className="account-form" onSubmit={submit}>
        <label>{ar ? "الاسم" : "Name"}<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} autoComplete="name"/></label>
        <label>{ar ? "رقم الهاتف بصيغة دولية" : "Phone number in international format"}<input required type="tel" minLength={7} maxLength={16} pattern="\\+[1-9][0-9]{6,14}" title={ar ? "أدخل رقمًا دوليًا بصيغة + ورمز الدولة والرقم" : "Enter an international number with +, country code and number"} value={phone} onChange={event => setPhone(event.target.value.replace(/[^+\d]/g, ""))} placeholder="+967…" autoComplete="tel"/></label>
        {error && <p className="account-message" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? (ar ? "جارٍ حفظ الطلب…" : "Saving request…") : (ar ? "حفظ الطلب والمتابعة إلى واتساب" : "Save request and continue to WhatsApp")}</button>
      </form>
    </section>
  </div>;
}
