import { useEffect } from "react";
import { submitInquiry } from "../lib/orders";
import { createBooking, bookingRef } from "../lib/bookings";
import { buildFollowUpMessage, buildWhatsAppUrl } from "../lib/whatsapp";
import { formatApiError, supabase } from "../lib/supabase";
import { getPassportFiles, clearPassportFiles, getOrCreatePassportUploadToken } from "../lib/passportUploads";

type SaveInquiryDetail = {
  service: string;
  message: string;
  requestData: Record<string, unknown>;
  passportUploadKey: string;
  customerName: string;
  customerPhone: string;
  onSuccess: (result: { reference: string; url: string }) => void;
  onError: (message: string) => void;
};

function normalizeInternationalPhone(value: string): string | null {
  let digits = value.replace(/[٠-٩۰-۹]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  }).replace(/\D/g, "");
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
  } catch { /* Keep the deterministic serialized fallback. */ }
  const storageKey = `maak-inquiry-idempotency:${service}:${fingerprint}`;
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing) return { key: existing, storageKey, fallbackKey: null as string | null };
    const key = globalThis.crypto.randomUUID();
    localStorage.setItem(storageKey, key);
    return { key, storageKey, fallbackKey: null as string | null };
  } catch {
    const existing = fallbackIdempotencyKeys.get(storageKey);
    if (existing) return { key: existing, storageKey: null, fallbackKey: storageKey };
    const key = globalThis.crypto.randomUUID();
    fallbackIdempotencyKeys.set(storageKey, key);
    return { key, storageKey: null, fallbackKey: storageKey };
  }
}

function clearIdempotencyKey(intent: { key: string; storageKey: string | null; fallbackKey: string | null }) {
  if (intent.fallbackKey) fallbackIdempotencyKeys.delete(intent.fallbackKey);
  if (intent.storageKey) {
    try { if (localStorage.getItem(intent.storageKey) === intent.key) localStorage.removeItem(intent.storageKey); }
    catch { /* Storage can be unavailable. */ }
  }
}

export default function InquiryCapture({ lang: _lang }: { lang: "ar" | "en" }) {
  useEffect(() => {
    const handleSave = async (event: Event) => {
      const detail = (event as CustomEvent<SaveInquiryDetail>).detail;
      if (!detail) return;
      const customerName = detail.customerName.trim();
      const customerPhone = normalizeInternationalPhone(detail.customerPhone);
      if (customerName.length < 2) {
        detail.onError("يرجى إدخال الاسم بشكل صحيح.");
        return;
      }
      if (!customerPhone) {
        detail.onError("أدخل رقم هاتف دوليًا صحيحًا مع رمز الدولة.");
        return;
      }

      try {
        const formData = detail.requestData.form_data as Record<string, unknown> | undefined;
        const dateValues = Array.isArray(detail.requestData.date_values) ? detail.requestData.date_values : [];
        const preferredDate = dateValues.find((value): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) ?? null;
        const passportUploadToken = detail.passportUploadKey ? getOrCreatePassportUploadToken(detail.passportUploadKey) : "";
        const details = {
          ...detail.requestData,
          ...(detail.passportUploadKey ? { passport_upload_token: passportUploadToken } : {}),
          message: detail.message,
          source_path: window.location.pathname,
        };

        const passportFiles = detail.passportUploadKey ? getPassportFiles(detail.passportUploadKey) : [];
        let passportIdempotency: Awaited<ReturnType<typeof getOrCreateIdempotencyKey>> | null = null;
        let passportOrderId: string | null = null;
        if (passportFiles.length) {
          const orderPayload = {
            customerName,
            customerPhone,
            service: detail.service,
            requestData: { ...details, internal_booking: true },
          };
          passportIdempotency = await getOrCreateIdempotencyKey(detail.service, orderPayload);
          const savedOrder = await submitInquiry({ ...orderPayload, idempotencyKey: passportIdempotency.key });
          const savedRecord = (Array.isArray(savedOrder) ? savedOrder[0] : savedOrder) as Record<string, unknown> | null;
          const orderId = typeof savedRecord?.id === "string" ? savedRecord.id : "";
          passportOrderId = orderId || null;
          const passengerNames = Array.isArray(formData?.passenger_names) ? formData.passenger_names : [];
          if (!orderId || passengerNames.length !== passportFiles.length || !supabase) {
            throw new Error("تعذر تجهيز مرفقات الجواز. أعد المحاولة قبل إعادة إرسال الطلب.");
          }
          for (let index = 0; index < passportFiles.length; index += 1) {
            const passengerName = passengerNames[index];
            if (typeof passengerName !== "string" || passengerName.trim().length < 2) {
              throw new Error("تحقق من أسماء المسافرين ومرفقاتهم.");
            }
            const upload = new FormData();
            upload.append("orderId", orderId);
            upload.append("uploadToken", passportUploadToken);
            upload.append("passengerIndex", String(index));
            upload.append("passengerName", passengerName.trim());
            upload.append("file", passportFiles[index], passportFiles[index].name);
            const { error } = await supabase.functions.invoke("upload-passport", { body: upload });
            if (error) throw error;
          }
        }

        const booking = await createBooking({
          customerName,
          customerPhone,
          serviceType: detail.service,
          serviceDetails: passportOrderId ? { ...details, passport_order_id: passportOrderId } : details,
          preferredDate,
        });
        if (passportFiles.length) {
          clearPassportFiles(detail.passportUploadKey);
          if (passportIdempotency) clearIdempotencyKey(passportIdempotency);
        }
        if (detail.service === "flight") {
          try { localStorage.removeItem("maak-flight-request-v2"); } catch { /* Ignore unavailable storage. */ }
        }
        const reference = bookingRef(booking.id);
        detail.onSuccess({ reference, url: buildWhatsAppUrl(buildFollowUpMessage(reference, detail.service)) });
      } catch (cause) {
        detail.onError(formatApiError(cause));
      }
    };

    window.addEventListener("maak:save-inquiry", handleSave);
    return () => window.removeEventListener("maak:save-inquiry", handleSave);
  }, []);

  return null;
}
