import { useEffect, useState, type FormEvent } from "react";
import { createInquiryOrder } from "../lib/orders";
import { formatApiError, supabase } from "../lib/supabase";

type PendingInquiry = { service: string; message: string; url: string };
const serviceNames: Record<string, string> = {
  "/flights": "flight", "/transport": "ground_transport", "/hotels": "accommodation",
  "/car-rental": "car_rental", "/medical-tourism": "medical_travel", "/security-clearance-egypt": "security_clearance",
  "/umrah": "umrah", "/real-estate": "real_estate", "/tourism": "tourism",
};

export default function InquiryCapture({ lang }: { lang: "ar" | "en" }) {
  const ar = lang === "ar";
  const [pending, setPending] = useState<PendingInquiry | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const capture = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLAnchorElement>('a[href^="https://wa.me/"]');
      const service = serviceNames[window.location.pathname.replace(/\/+$/, "")];
      if (!link || !service) return;
      const parsed = new URL(link.href);
      const message = parsed.searchParams.get("text") ?? service;
      event.preventDefault();
      event.stopImmediatePropagation();
      setPending({ service, message, url: link.href });
      setError("");
      void client.auth.getUser().then(async ({ data }) => {
        if (!data.user) return;
        const { data: profile } = await client.from("profiles").select("full_name,phone").eq("id", data.user.id).maybeSingle();
        if (profile) { setName(profile.full_name ?? ""); setPhone(profile.phone ?? ""); }
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
      await createInquiryOrder({
        customerName: name,
        customerPhone: phone,
        service: pending.service,
        requestData: { message: pending.message, source_path: window.location.pathname },
        idempotencyKey: crypto.randomUUID(),
      });
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
        <label>{ar ? "رقم الهاتف بصيغة دولية" : "Phone number in international format"}<input required type="tel" minLength={7} maxLength={18} value={phone} onChange={event => setPhone(event.target.value.replace(/[^+\d]/g, ""))} placeholder="+967…" autoComplete="tel"/></label>
        {error && <p className="account-message" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? (ar ? "جارٍ حفظ الطلب…" : "Saving request…") : (ar ? "حفظ الطلب والمتابعة إلى واتساب" : "Save request and continue to WhatsApp")}</button>
      </form>
    </section>
  </div>;
}
