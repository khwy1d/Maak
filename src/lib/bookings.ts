import { supabase } from "./supabase";

export type BookingStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

export type CreateBookingInput = {
  customerName: string;
  customerPhone: string;
  serviceType: string;
  serviceDetails?: Record<string, unknown>;
  preferredDate?: string | null;
  notes?: string | null;
};

export type Booking = {
  id: string;
  user_id: string | null;
  customer_name: string;
  customer_phone: string;
  service_type: string;
  service_details: Record<string, unknown>;
  preferred_date: string | null;
  notes: string | null;
  status: BookingStatus;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
};

export function bookingRef(id: string): string {
  const compact = id.replace(/-/g, "").toUpperCase();
  return `MAK-${compact.slice(0, 6)}`;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  if (!supabase) throw new Error("خدمة الحجوزات غير متاحة حاليًا. حاول لاحقًا.");
  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.replace(/[^+\d]/g, "");
  if (customerName.length < 2) throw new Error("يرجى إدخال اسم صحيح.");
  if (!/^\+?[1-9]\d{6,14}$/.test(customerPhone)) throw new Error("يرجى إدخال رقم هاتف دولي صحيح مع رمز الدولة.");
  if (!input.serviceType.trim()) throw new Error("نوع الخدمة غير محدد.");

  const { data: id, error } = await supabase.rpc("create_booking", {
    p_customer_name: customerName,
    p_customer_phone: customerPhone.startsWith("+") ? customerPhone : `+${customerPhone}`,
    p_service_type: input.serviceType.trim(),
    p_service_details: input.serviceDetails ?? {},
    p_preferred_date: input.preferredDate || null,
    p_notes: input.notes?.trim() || null,
  });
  if (error) throw new Error(error.message || "تعذر حفظ الحجز. يرجى المحاولة مرة أخرى.");

  return {
    id: id as string,
    user_id: null,
    customer_name: customerName,
    customer_phone: customerPhone.startsWith("+") ? customerPhone : `+${customerPhone}`,
    service_type: input.serviceType.trim(),
    service_details: input.serviceDetails ?? {},
    preferred_date: input.preferredDate || null,
    notes: input.notes?.trim() || null,
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function getUserBookings(): Promise<Booking[]> {
  if (!supabase) throw new Error("خدمة الحجوزات غير متاحة حاليًا.");
  const { data, error } = await supabase.from("bookings")
    .select("id,user_id,customer_name,customer_phone,service_type,service_details,preferred_date,notes,status,created_at,updated_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message || "تعذر تحميل حجوزاتك.");
  return (data ?? []) as Booking[];
}

export async function getAllBookings(): Promise<Booking[]> {
  if (!supabase) throw new Error("خدمة الحجوزات غير متاحة حاليًا.");
  const { data, error } = await supabase.rpc("admin_list_bookings");
  if (error) throw new Error(error.message || "تعذر تحميل قائمة الحجوزات.");
  return (data ?? []) as Booking[];
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  adminNotes: string | null,
): Promise<Booking> {
  if (!supabase) throw new Error("خدمة الحجوزات غير متاحة حاليًا.");
  const { data, error } = await supabase.rpc("admin_update_booking", {
    p_booking_id: bookingId,
    p_status: status,
    p_admin_notes: adminNotes,
  });
  if (error) throw new Error(error.message || "تعذر تحديث الحجز.");
  return data as Booking;
}
