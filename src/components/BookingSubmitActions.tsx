import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  useEffect(() => {
    if (!supabase) { setIsAuthenticated(false); return; }
    let active = true;
    void supabase.auth.getUser().then(({ data }) => { if (active) setIsAuthenticated(!!data.user); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { if (active) setIsAuthenticated(!!session?.user); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ reference: string; url: string } | null>(null);
  const message = (() => {
    try { return new URL(whatsappUrl).searchParams.get("text") ?? ""; }
    catch { return ""; }
  })();

  const confirm = () => {
    setError("");
    setSaving(true);
    window.dispatchEvent(new CustomEvent("maak:save-inquiry", { detail: {
      service, message, requestData, passportUploadKey,
      onSuccess: (result: { reference: string; url: string }) => { setSaved(result); setSaving(false); setError(""); },
      onError: (reason: string) => { setError(reason); setSaving(false); },
    }}));
  };

  return <div className="maak-booking-submit-actions">
    {error && <p className="account-message" role="alert">{error}</p>}
    {saved && <p className="account-message" role="status">{ar ? "تم تسجيل الحجز بنجاح. الرقم المرجعي:" : "Booking saved. Reference:"} <strong dir="ltr">{saved.reference}</strong></p>}
    <div className="flight-summary-actions">
      {isAuthenticated === true && <button type="button" className="btn btn-primary" onClick={confirm} disabled={!canSubmit || saving || !!saved}>{saving ? (ar ? "جارٍ تأكيد الطلب…" : "Confirming…") : saved ? (ar ? "تم تأكيد الطلب" : "Request confirmed") : (ar ? "تأكيد الطلب" : "Confirm request")}</button>}
      <a className="btn btn-ghost" href={saved?.url ?? whatsappUrl} target="_blank" rel="noopener noreferrer" aria-disabled={!canSubmit} onClick={event => { if (!canSubmit) event.preventDefault(); }}><MessageCircle size={18}/>{ar ? "متابعة الطلب عبر واتساب" : "Follow up via WhatsApp"}</a>
    </div>
  </div>;
}
