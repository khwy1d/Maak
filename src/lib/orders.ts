import { supabase, getReferralCode } from "./supabase";

export type InquiryService =
  | "flight" | "ground_transport" | "accommodation" | "car_rental"
  | "medical_travel" | "security_clearance" | "umrah" | "real_estate" | "tourism";

export interface InquiryOrder {
  customerName: string;
  customerPhone: string;
  service: InquiryService;
  requestData: Record<string, unknown>;
  idempotencyKey: string;
}

export async function submitInquiry(order: InquiryOrder) {
  if (!supabase) throw new Error("الحفظ غير متاح الآن؛ يُرجى المحاولة لاحقًا.");
  const { data, error } = await supabase.rpc("create_order", {
    p_idempotency_key: order.idempotencyKey,
    p_customer_name: order.customerName.trim(),
    p_customer_phone: order.customerPhone.trim(),
    p_service: order.service,
    p_request_data: order.requestData,
    p_referral_code: getReferralCode(),
  });
  if (error) throw error;
  return data;
}
