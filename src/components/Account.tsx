import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Bell, Bus, CalendarDays, Car, Check, ChevronLeft, Copy, Facebook, FileText, Gift, Hotel, Info, Instagram, Languages, LockKeyhole, LogOut, MessageCircle, Moon, Phone, Plane, RefreshCw, Settings, ShieldCheck, Sun, TicketPercent, UserRound, Wallet, Eye, Trash2, Upload } from "lucide-react";
import { useApp } from "../context/AppContext";
import Logo from "./Logo";
import { formatApiError, getReferralCode, supabase } from "../lib/supabase";
import { siteConfig } from "../config/site";
import { getUserBookings, bookingRef, updateBookingStatus, type Booking } from "../lib/bookings";
import { buildFollowUpMessage, buildWhatsAppUrl } from "../lib/whatsapp";

type Row = Record<string, any>;

const fallbackWalletDebitKeys = new Map<string, string>();

function getWalletDebitKey(orderId: string, amount: number) {
  const storageKey = `maak-wallet-debit:${orderId}:${amount.toFixed(2)}`;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return { key: existing, storageKey, fallbackKey: null };
    const key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
    return { key, storageKey, fallbackKey: null };
  } catch {
    const existing = fallbackWalletDebitKeys.get(storageKey);
    if (existing) return { key: existing, storageKey: null, fallbackKey: storageKey };
    const key = crypto.randomUUID();
    fallbackWalletDebitKeys.set(storageKey, key);
    return { key, storageKey: null, fallbackKey: storageKey };
  }
}

export default function Account({ adminOnly = false, initialTab = "profile", initialMode = "login" }: { adminOnly?: boolean; initialTab?: string; initialMode?: "login" | "signup" }) {
  const { lang, theme, toggleLang, toggleTheme } = useApp();
  const ar = lang === "ar";
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "signup">(initialMode);
  const [referralInput, setReferralInput] = useState(getReferralCode() ?? "");
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "completed" | "cancelled">("all");
  const [profileEditing, setProfileEditing] = useState(false);
  const [accountPanel, setAccountPanel] = useState<"documents" | "settings" | "info" | null>(null);
  const [otp, setOtp] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState<Row | null>(null);
  const [passportSignedUrl, setPassportSignedUrl] = useState("");
  const [passportBusy, setPassportBusy] = useState(false);
  const [orders, setOrders] = useState<Row[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [transactions, setTransactions] = useState<Row[]>([]);
  const [referrals, setReferrals] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [auditRows, setAuditRows] = useState<Row[]>([]);
  const [commission, setCommission] = useState("0");
  const [tab, setTab] = useState(initialTab);
  const [notifications, setNotifications] = useState<Row[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const refreshRequestRef = useRef(0);
  const activeUserIdRef = useRef<string | null>(null);
  const t = (a: string, e: string) => ar ? a : e;
  const bookingServiceLabel = (service: string) => {
    const names: Record<string, [string, string]> = {
      flight: ["تذاكر الطيران", "Flight tickets"],
      ground_transport: ["النقل البري", "Ground transport"],
      accommodation: ["حجوزات الفنادق", "Hotel reservations"],
      car_rental: ["تأجير السيارات", "Car rental"],
      medical_travel: ["السفر العلاجي", "Medical travel"],
      security_clearance: ["الموافقات الأمنية لمصر", "Egypt security clearance"],
      umrah: ["العمرة", "Umrah"],
      real_estate: ["الخدمات العقارية", "Real estate services"],
      tourism: ["السياحة والرحلات", "Tourism and trips"],
    };
    const pair = names[service];
    return pair ? t(pair[0], pair[1]) : service;
  };
  const bookingStatusLabel = (status: string) => {
    const names: Record<string, [string, string]> = {
      pending: ["قيد المراجعة", "Pending review"],
      confirmed: ["مؤكد", "Confirmed"],
      in_progress: ["قيد التنفيذ", "In progress"],
      completed: ["مكتمل", "Completed"],
      cancelled: ["ملغي", "Cancelled"],
    };
    const pair = names[status];
    return pair ? t(pair[0], pair[1]) : status;
  };

  useEffect(() => {
    if (!supabase) return;
    let authEventSeen = false;
    const { data } = supabase.auth.onAuthStateChange((_event, value) => {
      authEventSeen = true;
      const nextUserId = value?.user.id ?? null;
      if (activeUserIdRef.current !== nextUserId) {
        activeUserIdRef.current = nextUserId;
        refreshRequestRef.current += 1;
        setIsAdmin(false);
        setIsStaff(false);
        setProfile(null);
        setPassportSignedUrl("");
        setAccountPanel(null);
        setOrders([]);
        setBookings([]);
        setTransactions([]);
        setReferrals([]);
        setCustomers([]);
        setAuditRows([]);
        setBalance(0);
        setCommission("0");
        setName("");
        setPhone("");
        setBusy(false);
        setMessage("");
      }
      setSession(value);
    });
    supabase.auth.getSession().then(({ data: authData }) => {
      if (authEventSeen) return;
      activeUserIdRef.current = authData.session?.user.id ?? null;
      setSession(authData.session);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (adminOnly) setTab("admin-orders"); else setTab(initialTab); setAuthMode(initialMode); }, [adminOnly, initialTab, initialMode]);

  useEffect(() => {
    if (initialTab !== "notifications" || !supabase) return;
    let active = true;
    setNotificationsLoading(true);
    let query = supabase.from("notifications")
      .select("id,title,body,created_at")
      .order("created_at", { ascending: false });
    query = session
      ? query.or(`user_id.is.null,user_id.eq.${session.user.id}`)
      : query.is("user_id", null);
    void query.then(({ data, error }) => {
      if (!active) return;
      setNotifications(error ? [] : data ?? []);
      setNotificationsLoading(false);
    });
    return () => { active = false; };
  }, [initialTab, session?.user.id]);

  const refresh = async () => {
    if (!supabase || !session) return;
    const requestUserId = session.user.id;
    const requestId = ++refreshRequestRef.current;
    setBusy(true);
    setMessage("");
    try {
      const user = session.user;
      const [{ data: profileRow, error: profileError }, { data: orderRows, error: orderError }, { data: walletRows, error: walletError }, { data: referralRows, error: referralError }, { data: role }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone,referral_code,passport_storage_path,created_at").eq("id", user.id).single(),
        supabase.from("orders").select("id,customer_id,customer_name,customer_phone,service,request_data,referral_code,status,payment_status,total_amount,wallet_used,currency,created_at,updated_at").order("created_at", { ascending: false }),
        supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("referrals").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "referral_commission").maybeSingle(),
      ]);
      if (requestId !== refreshRequestRef.current || activeUserIdRef.current !== requestUserId) return;
      if (profileError) throw profileError;
      if (orderError) throw orderError;
      if (walletError) throw walletError;
      if (referralError) throw referralError;
      setProfile(profileRow);
      setName(profileRow.full_name ?? "");
      setPhone(profileRow.phone ?? user.phone ?? "");
      setOrders(role?.role === "staff" ? (orderRows ?? []).filter((order: Row) => order.customer_id === user.id) : orderRows ?? []);
      try {
        const userBookings = await getUserBookings(user.id);
        if (requestId !== refreshRequestRef.current || activeUserIdRef.current !== requestUserId) return;
        setBookings(userBookings);
      } catch (bookingError) {
        if (requestId !== refreshRequestRef.current || activeUserIdRef.current !== requestUserId) return;
        setBookings([]);
        setMessage(formatApiError(bookingError));
      }
      setTransactions(walletRows ?? []);
      setReferrals(referralRows ?? []);
      setIsAdmin(role?.role === "admin");
      setIsStaff(role?.role === "admin" || role?.role === "staff");
      setCommission(String(settings?.value?.amount ?? 0));
      const { data: walletBalance, error: balanceError } = await supabase.rpc("current_wallet_balance");
      if (requestId !== refreshRequestRef.current || activeUserIdRef.current !== requestUserId) return;
      if (balanceError) throw balanceError;
      setBalance(Number(walletBalance ?? 0));
      if (role?.role === "admin") {
        const [{ data: customerRows, error: customersError }, { data: auditLog, error: auditError }] = await Promise.all([
          supabase.from("profiles").select("id,full_name,phone,referral_code,created_at").order("created_at", { ascending: false }),
          supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100),
        ]);
        if (requestId !== refreshRequestRef.current || activeUserIdRef.current !== requestUserId) return;
        if (customersError) throw customersError;
        if (auditError) throw auditError;
        setCustomers(customerRows ?? []);
        setAuditRows(auditLog ?? []);
      }
    } catch (error) {
      if (requestId === refreshRequestRef.current && activeUserIdRef.current === requestUserId) setMessage(formatApiError(error));
    } finally {
      if (requestId === refreshRequestRef.current) setBusy(false);
    }
  };

  const cancelSelectedBooking = async () => {
    if (!selectedBooking || !["pending", "confirmed"].includes(selectedBooking.status)) return;
    if (!window.confirm(t("هل أنت متأكد من إلغاء هذا الحجز؟", "Are you sure you want to cancel this booking?"))) return;
    setBusy(true);
    setMessage("");
    try {
      await updateBookingStatus(selectedBooking.id, "cancelled");
      setSelectedBooking({ ...selectedBooking, status: "cancelled" });
      setMessage(t("تم إلغاء الحجز.", "Booking cancelled."));
      await refresh();
    } catch (error) {
      setMessage(formatApiError(error));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (session) void refresh(); }, [session?.user.id]);
  useEffect(() => {
    let active = true;
    const path = profile?.passport_storage_path;
    if (!supabase || !path || !session) { setPassportSignedUrl(""); return; }
    void supabase.storage.from("customer-passports").createSignedUrl(path, 3600).then(({ data, error }) => {
      if (active) setPassportSignedUrl(error ? "" : data?.signedUrl ?? "");
    });
    return () => { active = false; };
  }, [profile?.passport_storage_path, session?.user.id]);

  const goToHomeAfterAuth = () => {
    window.history.replaceState({}, "", `/${lang}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  const normalizePhone = (value: string) => {
    const localized = value.trim().replace(/[٠-٩۰-۹]/g, digit => {
      const code = digit.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    });
    const hasPlusPrefix = localized.startsWith("+");
    const digits = localized.replace(/\D/g, "");
    if (!digits) return "";
    if (hasPlusPrefix) return `+${digits}`;
    if (digits.startsWith("00")) return `+${digits.slice(2)}`;
    if (digits.startsWith("967")) return `+${digits}`;
    if (/^07\d{8}$/.test(digits)) return `+967${digits.slice(1)}`;
    if (/^7\d{8}$/.test(digits)) return `+967${digits}`;
    return `+${digits}`;
  };

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) { setMessage(t("الحسابات غير مفعّلة على هذه النسخة.", "Accounts are not enabled in this deployment.")); return; }
    setBusy(true); setMessage("");
    try {
      const normalizedPhone = normalizePhone(phone);
      const internationalDigits = normalizedPhone.startsWith("+") ? normalizedPhone.slice(1) : "";
      const isValidInternationalPhone =
        internationalDigits.length >= 7 &&
        internationalDigits.length <= 15 &&
        internationalDigits[0] !== "0" &&
        Array.from(internationalDigits).every(digit => digit >= "0" && digit <= "9");
      if (!isValidInternationalPhone) {
        throw new Error(t(
          "أدخل رقمًا يمنيًا بصيغة 7… أو 07…، أو رقمًا دوليًا يبدأ برمز الدولة.",
          "Enter a Yemeni number as 7… or 07…, or an international number with its country code."
        ));
      }
      let authResult = await supabase.auth.signInWithPassword({ phone: normalizedPhone, password });
      // Backward compatibility for existing Maak accounts created with the internal
      // phone-derived email identity. New phone-based accounts still use phone auth.
      if (authResult.error?.code === "invalid_credentials") {
        const legacyEmail = `${internationalDigits}@auth.maak.invalid`;
        authResult = await supabase.auth.signInWithPassword({ email: legacyEmail, password });
      }
      if (authResult.error) throw authResult.error;
      setSession(authResult.data.session);
      setPassword("");
      goToHomeAfterAuth();
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const signUp = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) { setMessage(t("الحسابات غير مفعّلة على هذه النسخة.", "Accounts are not enabled in this deployment.")); return; }
    if (!/^[0-9]{6}$/.test(password)) { setMessage(t("كلمة المرور يجب أن تتكون من 6 أرقام بالضبط.", "Password must contain exactly 6 digits.")); return; }
    if (password !== confirmPassword) { setMessage(t("كلمتا المرور غير متطابقتين.", "Passwords do not match.")); return; }
    setBusy(true); setMessage("");
    const normalizedPhone = normalizePhone(phone);
    try {
      if (!/^\+[1-9][0-9]{6,14}$/.test(normalizedPhone)) {
        throw new Error(t("أدخل رقم هاتف دوليًا صحيحًا مع رمز الدولة.", "Enter a valid international phone number with its country code."));
      }
      const { data, error } = await supabase.auth.signUp({
        phone: normalizedPhone,
        password,
        options: { data: { full_name: name.trim(), referral_code: referralInput.trim().toUpperCase() || getReferralCode() } },
      });
      if (error) throw error;
      if (!data.user) throw new Error(t("تعذر إنشاء الحساب. حاول مرة أخرى.", "Could not create the account. Please try again."));
      setPendingPhone(normalizedPhone);
      setOtp("");
      setMessage(t("أُنشئ الحساب. أدخل رمز SMS لتأكيد رقم هاتفك.", "Your account is created. Enter the SMS code to verify your phone."));
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) { setMessage(t("الحسابات غير مفعّلة على هذه النسخة.", "Accounts are not enabled in this deployment.")); return; }
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: pendingPhone, token: otp.trim(), type: "sms" });
      if (error) throw error;
      if (!data.session) throw new Error(t("تم تأكيد الرقم. سجّل الدخول الآن بكلمة المرور.", "Phone verified. Please sign in with your password."));
      setSession(data.session);
      setOtp("");
      setPassword("");
      setConfirmPassword("");
      goToHomeAfterAuth();
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const savePassportDocument = async (file?: File) => {
    if (!file || !supabase || !session) return;
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type) || file.size < 1 || file.size > 10 * 1024 * 1024) {
      setMessage(t("اختر صورة JPG أو PNG أو ملف PDF لا يتجاوز 10 ميغابايت.", "Choose a JPG, PNG, or PDF file up to 10 MB."));
      return;
    }
    setPassportBusy(true); setMessage("");
    try {
      const form = new FormData();
      form.append("action", "upload");
      form.append("file", file, file.name);
      const { data, error } = await supabase.functions.invoke("manage-passport", { body: form });
      if (error) throw error;
      if (!data?.storagePath) throw new Error(t("تعذر حفظ الوثيقة.", "Could not save the document."));
      setProfile(current => current ? { ...current, passport_storage_path: data.storagePath } : current);
      setMessage(t("تم حفظ وثيقة الجواز في حسابك.", "Your passport document has been saved to your account."));
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setPassportBusy(false); }
  };
  const deletePassportDocument = async () => {
    if (!supabase || !session || !profile?.passport_storage_path) return;
    if (!window.confirm(t("هل تريد حذف صورة الجواز من حسابك؟", "Delete the passport document from your account?"))) return;
    setPassportBusy(true); setMessage("");
    try {
      const form = new FormData();
      form.append("action", "delete");
      const { error } = await supabase.functions.invoke("manage-passport", { body: form });
      if (error) throw error;
      setProfile(current => current ? { ...current, passport_storage_path: null } : current);
      setPassportSignedUrl("");
      setMessage(t("تم حذف وثيقة الجواز من حسابك.", "Your passport document has been deleted from your account."));
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setPassportBusy(false); }
  };
  const signOut = async () => {
    const { error } = await supabase?.auth.signOut() ?? { error: null };
    if (error) { setMessage(formatApiError(error)); return; }
    setSession(null);
    setIsAdmin(false);
    window.history.replaceState({}, "", `/${lang}/login`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  const inviteUrl = useMemo(() => profile ? `${window.location.origin}/?ref=${encodeURIComponent(profile.referral_code)}` : "", [profile]);
  const copyInvite = async () => { try { await navigator.clipboard.writeText(inviteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setMessage(t("تعذر نسخ الرابط. يمكنك نسخه يدويًا.", "Could not copy the link. You can copy it manually.")); } };
  const copyReferralCode = async () => { const code = profile?.referral_code; if (!code) return; try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setMessage(t("تعذر نسخ الرمز.", "Could not copy the code.")); } };
  const shareInvite = async () => { if (navigator.share) { try { await navigator.share({ title: t("دعوة إلى معك", "Join MAAK"), text: t("استخدم رابط الدعوة للتسجيل في معك.", "Use my invitation link to join MAAK."), url: inviteUrl }); } catch { /* sharing was cancelled */ } } else { await copyInvite(); } };
  const saveProfile = async (event: FormEvent) => { event.preventDefault(); if (!supabase || !session || !name.trim()) return; setBusy(true); setMessage(""); try { const { error } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", session.user.id); if (error) throw error; setProfileEditing(false); setMessage(t("تم حفظ الاسم.", "Name saved.")); await refresh(); } catch (error) { setMessage(formatApiError(error)); } finally { setBusy(false); } };

  const applyWallet = async (order: Row) => {
    if (!supabase || !order.total_amount) return;
    const due = Math.max(0, Number(order.total_amount) - Number(order.wallet_used));
    const amount = Math.min(balance, due);
    if (amount <= 0) return;
    setBusy(true);
    const debitIntent = getWalletDebitKey(order.id, amount);
    try {
      const { error } = await supabase.rpc("apply_wallet_to_order", { p_order_id: order.id, p_amount: amount, p_idempotency_key: debitIntent.key });
      if (error) throw error;
      await refresh();
      if (debitIntent.storageKey) {
        try { sessionStorage.removeItem(debitIntent.storageKey); } catch { /* storage may be unavailable */ }
      }
      if (debitIntent.fallbackKey) fallbackWalletDebitKeys.delete(debitIntent.fallbackKey);
      setMessage(t("تم تطبيق الرصيد على الطلب.", "Wallet balance applied to the order."));
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const updateOrder = async (order: Row) => {
    if (!supabase) return;
    const total = window.prompt(t("القيمة الإجمالية للطلب", "Order total"), order.total_amount == null ? "" : String(order.total_amount));
    if (total === null) return;
    const payment = window.prompt(t("حالة الدفع: unpaid أو paid أو refunded", "Payment status: unpaid, paid, or refunded"), order.payment_status);
    if (!payment || !["unpaid", "paid", "refunded"].includes(payment)) return;
    const status = window.prompt(t("حالة الخدمة: requested أو quoted أو in_progress أو completed أو cancelled", "Service status: requested, quoted, in_progress, completed, or cancelled"), order.status);
    if (!status || !["requested", "quoted", "in_progress", "completed", "cancelled"].includes(status)) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_update_order", { p_order_id: order.id, p_status: status, p_payment_status: payment, p_total_amount: total.trim() ? Number(total) : null });
      if (error) throw error;
      await refresh();
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const saveCommission = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_set_commission", { p_amount: Number(commission), p_currency: "YER" });
      if (error) throw error;
      setMessage(t("تم تحديث العمولة.", "Commission updated."));
      await refresh();
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const adjustWallet = async (customer: Row) => {
    if (!supabase) return;
    const value = window.prompt(t("مبلغ الحركة موجب للإضافة وسالب للخصم", "Enter a positive credit or negative debit"), "");
    if (value === null || !Number.isFinite(Number(value)) || Number(value) === 0) return;
    const description = window.prompt(t("سبب الحركة", "Reason for this adjustment"), t("تسوية إدارية", "Admin adjustment"));
    if (!description) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("admin_adjust_wallet", { p_user_id: customer.id, p_amount: Number(value), p_description: description, p_idempotency_key: crypto.randomUUID() });
      if (error) throw error;
      await refresh();
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const renameCustomer = async (customer: Row) => {
    if (!supabase) return;
    const fullName = window.prompt(t("اسم العميل", "Customer name"), customer.full_name);
    if (!fullName?.trim()) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", customer.id);
      if (error) throw error;
      await refresh();
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };



  if (!adminOnly && initialTab === "notifications") return <main className="maak-app-page maak-notifications-page" dir={ar ? "rtl" : "ltr"}>
    {notificationsLoading ? <section className="maak-empty-state maak-notifications-empty" aria-live="polite"><p>{t("جارٍ تحميل الإشعارات…", "Loading notifications…")}</p></section> : notifications.length ? <section className="maak-notification-list" aria-label={t("قائمة الإشعارات", "Notifications list")}>
      {notifications.map(item => <article className="maak-notification-item" key={item.id}>
        <span className="maak-notification-item-icon"><Bell size={20}/></span>
        <div><strong>{item.title}</strong><p>{item.body}</p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(ar ? "ar" : "en")}</time></div>
      </article>)}
    </section> : <section className="maak-empty-state maak-notifications-empty"><Bell size={36}/><strong>{t("لا توجد إشعارات حالياً", "No notifications yet")}</strong><p>{t("ستظهر هنا التنبيهات والتحديثات المهمة من معك، ويمكنك تصفحها دون تسجيل الدخول.", "Important MAAK announcements and updates will appear here. You can view this page without signing in.")}</p></section>}
  </main>;

  if (!session && !adminOnly && ["orders", "referrals", "profile"].includes(initialTab)) {
    const loginButton = <a className="btn btn-primary" href={`/${lang}/login`} onClick={(event) => { event.preventDefault(); window.history.pushState({}, "", `/${lang}/login`); window.dispatchEvent(new PopStateEvent("popstate")); }}>{t("تسجيل الدخول", "Sign in")}</a>;
    if (initialTab === "orders") return <main className="maak-app-page" dir={ar ? "rtl" : "ltr"}>
      <nav className="maak-filter-tabs" aria-label={t("تصفية الحجوزات", "Filter bookings")}>{[[ "all", t("الكل", "All") ], [ "active", t("النشطة", "Active") ], [ "completed", t("المكتملة", "Completed") ], [ "cancelled", t("الملغاة", "Cancelled") ]].map(([key, label]) => <button type="button" key={key} className={key === "all" ? "active" : ""} disabled>{label}</button>)}</nav>
      <section className="maak-booking-list"><div className="maak-empty-state"><CalendarDays size={34}/><strong>{t("سجّل الدخول لعرض حجوزاتك", "Sign in to view your bookings")}</strong><p>{t("يمكنك تصفح هذه الصفحة الآن، وستظهر هنا حجوزاتك ومتابعة حالتها بعد تسجيل الدخول.", "You can browse this page now. Your bookings and their status will appear here after you sign in.")}</p>{loginButton}</div></section>
    </main>;
    if (initialTab === "referrals") return <main className="maak-app-page maak-rewards-page" dir={ar ? "rtl" : "ltr"}>
      <section className="maak-rewards-balance"><h2>{t("رصيد المكافآت", "Rewards balance")}</h2><strong>— <small>{t("ر.ي", "YER")}</small></strong><div className="maak-rewards-summary"><div><span>{t("مكتسبة", "Earned")}</span><b>—</b></div><div><span>{t("معلقة", "Pending")}</span><b>—</b></div></div></section>
      <section className="maak-invite-card"><span className="maak-invite-icon"><Gift size={26}/></span><h2>{t("ادعُ أصدقاءك", "Invite your friends")}</h2><p>{t("سجّل الدخول للحصول على رمز الدعوة ومشاركة رابطك وكسب المكافآت عند إكمال حجوزات أصدقائك.", "Sign in to get your invitation code, share your link, and earn rewards when your friends complete their bookings.")}</p>{loginButton}</section>
      <section className="maak-reward-stats" aria-label={t("إحصائيات الدعوات", "Invitation statistics")}><article><span>{t("عدد الدعوات", "Invitations")}</span><strong>—</strong></article><article><span>{t("المكتملة", "Completed")}</span><strong>—</strong></article><article><span>{t("قيد الانتظار", "Pending")}</span><strong>—</strong></article></section>
      <section className="maak-reward-ledger"><h2>{t("سجل الحركات", "Activity")}</h2><p className="maak-empty-inline">{t("سجّل الدخول لعرض سجل مكافآتك وحركات الرصيد.", "Sign in to view your rewards and wallet activity.")}</p>{loginButton}</section>
    </main>;
    return <main className="maak-app-page maak-profile-page" dir={ar ? "rtl" : "ltr"}>
      <section className="maak-profile-hero"><span className="maak-avatar"><UserRound size={66}/></span><h2>{t("مرحبًا بك في معك", "Welcome to MAAK")}</h2></section>
      <section className="maak-contact-card"><div className="maak-account-phone"><strong>—</strong><Phone size={20}/><small>{t("رقم الهاتف", "Phone number")}</small></div><div className="maak-account-code"><strong>—</strong><small>{t("رمز الحساب", "Account code")}</small></div></section>
      <section className="maak-profile-group"><h2>{t("حسابي", "My account")}</h2><div className="maak-settings-card"><p className="maak-settings-note">{t("سجّل الدخول للوصول إلى ملفك الشخصي وإعدادات حسابك ووثائقك المحفوظة.", "Sign in to access your personal profile, account settings, and saved documents.")}</p>{loginButton}</div></section>
    </main>;
  }

  if (!session) return <main className="account-page account-auth-page" dir={ar ? "rtl" : "ltr"}>
    <section className="account-auth-shell">
      <header className="account-auth-top"><button type="button" className="account-auth-language" onClick={toggleLang} aria-label={t("تغيير اللغة", "Change language")}><Languages size={20}/></button><h1>{t("مرحبًا", "Welcome")}</h1></header>
      <div className="account-auth-brand"><Logo size={112}/><strong>{t("دائمًا معك", "Always with you")}</strong></div>
      <section className="account-auth-panel">
        <h2>{pendingPhone ? t("تأكيد رقم الهاتف", "Verify your phone") : authMode === "login" ? t("تسجيل الدخول", "Sign in") : t("إنشاء حساب", "Create account")}</h2>
        <p>{pendingPhone ? t("أدخل رمز التأكيد الذي أرسلناه برسالة SMS إلى رقمك.", "Enter the verification code sent to your phone by SMS.") : authMode === "login" ? t("أدخل بياناتك للوصول إلى حسابك.", "Enter your details to access your account.") : t("اكتب بياناتك كما تظهر في هويتك.", "Enter your details as they appear on your ID.")}</p>
        {!supabase && <p className="account-auth-unavailable" role="status">{t("الحسابات غير مفعّلة في هذه المعاينة. ستعمل عند إعداد خدمة الحسابات للنشر.", "Accounts are not enabled in this preview. They will work once account services are configured for deployment.")}</p>}
        {pendingPhone ? <form onSubmit={verifyCode} className="account-form account-auth-form">
          <label className="account-auth-field"><span>{t("رمز التأكيد", "Verification code")}</span><span className="account-auth-input"><ShieldCheck size={20}/><input required inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e => setOtp(e.target.value)} /></span></label>
          <button className="btn btn-primary account-auth-submit" disabled={busy}>{busy ? t("جارٍ التأكيد…", "Verifying…") : t("تأكيد رقم الهاتف", "Verify phone number")}</button>
          <a className="account-auth-link" href="/login">{t("العودة إلى تسجيل الدخول", "Back to sign in")}</a>
        </form> : authMode === "login" ? <form onSubmit={signIn} className="account-form account-auth-form">
          <label className="account-auth-field"><span>{t("رقم الهاتف", "Phone number")}</span><span className="account-auth-input"><Phone size={20}/><input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+967…" autoComplete="tel" /></span></label>
          <label className="account-auth-field"><span>{t("كلمة المرور", "Password")}</span><span className="account-auth-input"><LockKeyhole size={20}/><input required type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></span></label>
          <div className="account-auth-forgot"><a href="/contact">{t("نسيت كلمة المرور؟", "Forgot password?")}</a></div>
          <button className="btn btn-primary account-auth-submit" disabled={busy}>{busy ? t("جارٍ الدخول…", "Signing in…") : t("تسجيل الدخول", "Sign in")}</button>
          <p className="account-auth-switch">{t("ليس لديك حساب؟", "Don't have an account?")} <a href="/signup">{t("إنشاء حساب", "Create account")}</a></p>
          <a className="account-auth-guest" href="/">{t("الاستمرار كضيف", "Continue as guest")}</a>
        </form> : <form onSubmit={signUp} className="account-form account-auth-form">
          <label className="account-auth-field"><span>{t("الاسم الكامل", "Full name")}</span><span className="account-auth-input"><UserRound size={20}/><input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder={t("اكتب اسمك الكامل كما في هويتك", "Full name as it appears on your ID")} /></span></label>
          <label className="account-auth-field"><span>{t("رقم الهاتف", "Phone number")}</span><span className="account-auth-input"><Phone size={20}/><input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+967…" autoComplete="tel" /></span></label>
          <label className="account-auth-field"><span>{t("كلمة المرور", "Password")}</span><span className="account-auth-input"><LockKeyhole size={20}/><input required minLength={6} maxLength={6} pattern="[0-9]{6}" inputMode="numeric" type="password" value={password} onChange={e => setPassword(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="new-password" /></span></label>
          <label className="account-auth-field"><span>{t("تأكيد كلمة المرور", "Confirm password")}</span><span className="account-auth-input"><LockKeyhole size={20}/><input required minLength={6} maxLength={6} pattern="[0-9]{6}" inputMode="numeric" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value.replace(/\D/g, "").slice(0, 6))} autoComplete="new-password" /></span></label>
          <label className="account-auth-field"><span>{t("رمز الدعوة", "Invitation code")} <small>{t("(اختياري)", "(optional)")}</small></span><span className="account-auth-input"><TicketPercent size={20}/><input value={referralInput} onChange={e => setReferralInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20))} placeholder="AB12CD34EF" /></span></label>
          <button className="btn btn-primary account-auth-submit" disabled={busy}>{busy ? t("جارٍ إنشاء الحساب…", "Creating account…") : t("إنشاء الحساب وإرسال الرمز", "Create account and send code")}</button>
          <p className="account-auth-switch">{t("لديك حساب؟", "Already have an account?")} <a href="/login">{t("تسجيل الدخول", "Sign in")}</a></p>
        </form>}
        {message && <p className="account-message" role="status">{message}</p>}
        {authMode === "login" && !pendingPhone && <nav className="account-auth-social" aria-label={t("تابع معك", "Follow MAAK")}><a className="auth-social-facebook" href="https://www.facebook.com/share/1MxwiuHyvi/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Facebook size={25}/></a><a className="auth-social-instagram" href="https://www.instagram.com/maaktravel" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={25}/></a><a className="auth-social-whatsapp" href={"https://wa.me/" + siteConfig.whatsappNumber.replace(/\D/g, "")} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle size={25}/></a></nav>}
      </section>
    </section>
  </main>;

  if (adminOnly && !isAdmin) return <main className="account-page" dir={ar ? "rtl" : "ltr"}><section className="account-card"><h1>{t("غير مصرح", "Access denied")}</h1><p>{t("هذه الصفحة مخصصة لفريق الإدارة.", "This page is for administrators only.")}</p><button className="btn btn-ghost" onClick={signOut}>{t("تسجيل الخروج", "Sign out")}</button></section></main>;

  const showAdmin = isAdmin && (adminOnly || tab.startsWith("admin"));
  const labels: Record<string, string> = { orders: t("طلباتي", "My orders"), wallet: t("المحفظة", "Wallet"), referrals: t("دعواتي", "Invites"), "admin-orders": t("الطلبات", "Orders"), "admin-customers": t("العملاء", "Customers"), "admin-referrals": t("الإحالات", "Referrals"), "admin-finance": t("العمولات والمحافظ", "Commissions & wallets") };

  if (!showAdmin) {
    const ownedReferrals = referrals.filter(item => item.referrer_id === session?.user.id);
    const completedReferrals = ownedReferrals.filter(item => ["completed", "rewarded", "paid"].includes(String(item.status).toLowerCase()));
    const pendingReferrals = ownedReferrals.filter(item => !["completed", "rewarded", "paid", "cancelled", "rejected"].includes(String(item.status).toLowerCase()));
    const pendingRewards = pendingReferrals.length * Number(commission || 0);
    const earnedRewards = transactions.filter(item => Number(item.amount) > 0).reduce((total, item) => total + Number(item.amount), 0);
    const activeOrderCount = orders.filter(order => ["requested", "quoted", "in_progress"].includes(String(order.status).toLowerCase())).length;
    const matchingOrders = orders.filter(order => orderFilter === "all"
      || (orderFilter === "active" && ["requested", "quoted", "in_progress"].includes(String(order.status).toLowerCase()))
      || (orderFilter === "completed" && String(order.status).toLowerCase() === "completed")
      || (orderFilter === "cancelled" && ["cancelled", "canceled"].includes(String(order.status).toLowerCase())));
    const formatDate = (value: string) => new Date(value).toLocaleDateString(ar ? "ar" : "en-US", { year: "numeric", month: "long", day: "numeric" });
    const statusLabel = (status: string) => ({
      requested: t("قيد المراجعة", "Under review"),
      quoted: t("بانتظار التأكيد", "Awaiting confirmation"),
      in_progress: t("قيد التنفيذ", "In progress"),
      completed: t("مكتمل", "Completed"),
      cancelled: t("ملغي", "Cancelled"),
      canceled: t("ملغي", "Cancelled"),
    } as Record<string, string>)[String(status).toLowerCase()] ?? status;
    const serviceLabel = (value: string) => {
      const key = String(value ?? "").toLowerCase();
      if (key.includes("flight") || key.includes("طيران") || key.includes("تذكرة")) return t("حجز تذاكر الطيران", "Flight booking");
      if (key.includes("hotel") || key.includes("فندق") || key.includes("إقامة")) return t("حجز الفنادق", "Hotel booking");
      if (key.includes("umrah") || key.includes("عمرة")) return t("العمرة", "Umrah");
      if (key.includes("car") || key.includes("سيار")) return t("تأجير السيارات", "Car rental");
      if (key.includes("bus") || key.includes("باص") || key.includes("نقل بري")) return t("النقل البري", "Ground transport");
      return value;
    };
    const serviceIcon = (value: string) => {
      const key = String(value ?? "").toLowerCase();
      if (key.includes("flight") || key.includes("طيران") || key.includes("تذكرة")) return <Plane size={26}/>;
      if (key.includes("hotel") || key.includes("فندق") || key.includes("إقامة")) return <Hotel size={26}/>;
      if (key.includes("umrah") || key.includes("عمرة")) return <Moon size={26}/>;
      if (key.includes("car") || key.includes("سيار")) return <Car size={26}/>;
      if (key.includes("bus") || key.includes("باص") || key.includes("نقل بري")) return <Bus size={26}/>;
      return <CalendarDays size={26}/>;
    };
    const bookingFilters: Array<["all" | "active" | "completed" | "cancelled", string]> = [
      ["all", t("الكل", "All")], ["active", t("النشطة", "Active")], ["completed", t("المكتملة", "Completed")], ["cancelled", t("الملغاة", "Cancelled")]
    ];

    if (tab === "orders") return <main className="maak-app-page" dir={ar ? "rtl" : "ltr"}>
      {message && <p className="account-message" role="status">{message}</p>}
      <nav className="maak-filter-tabs" aria-label={t("تصفية الحجوزات", "Filter bookings")}>{bookingFilters.map(([key, title]) => <button type="button" key={key} className={orderFilter === key ? "active" : ""} aria-pressed={orderFilter === key} onClick={() => setOrderFilter(key)}>{title}</button>)}</nav>
      <section className="maak-booking-list" aria-live="polite">
        {busy && !orders.length && <p className="maak-empty-state">{t("جارٍ تحميل الحجوزات…", "Loading bookings…")}</p>}
        {!busy && !matchingOrders.length && <div className="maak-empty-state"><CalendarDays size={34}/><strong>{t("لا توجد حجوزات هنا بعد", "No bookings here yet")}</strong><p>{t("ستظهر طلباتك ومتابعة حالتها في هذه الصفحة.", "Your requests and their status will appear here.")}</p><a className="btn btn-primary" href="/services">{t("استعرض الخدمات", "Explore services")}</a></div>}
        {matchingOrders.map(order => {
          const status = String(order.status ?? "requested").toLowerCase();
          const ref = order.order_number ?? order.reference ?? ("MK-" + String(order.id ?? "").replace(/\D/g, "").slice(-5).padStart(5, "0"));
          return <article className="maak-booking-card" key={order.id}>
            <span className="maak-service-icon">{serviceIcon(order.service)}</span>
            <div className="maak-booking-details">
              <h2>{serviceLabel(order.service)}</h2><strong className="maak-booking-reference">{ref}</strong>
              <p>{t("تاريخ التقديم", "Submitted")}: {formatDate(order.created_at)}</p>
              <span className={"maak-booking-status status-" + status.replace(/[^a-z]/g, "-")}>{statusLabel(status)}</span>
            </div>
            <ChevronLeft className="maak-booking-chevron" size={21} aria-hidden="true"/>
          </article>;
        })}
      </section>
    </main>;

    if (tab === "referrals") return <main className="maak-app-page maak-rewards-page" dir={ar ? "rtl" : "ltr"}>
      {message && <p className="account-message" role="status">{message}</p>}
      <section className="maak-rewards-balance">
        <h2>{t("رصيد المكافآت", "Rewards balance")}</h2>
        <strong>{balance.toLocaleString()} <small>{t("ر.ي", "YER")}</small></strong>
        <div className="maak-rewards-summary"><div><span>{t("مكتسبة", "Earned")}</span><b>{earnedRewards.toLocaleString()}</b></div><div><span>{t("معلقة", "Pending")}</span><b>{pendingRewards.toLocaleString()}</b></div></div>
      </section>
      <section className="maak-invite-card">
        <span className="maak-invite-icon"><Gift size={26}/></span>
        <h2>{t("ادعُ أصدقاءك", "Invite your friends")}</h2>
        <p>{t("شارك رمز الدعوة مع أصدقائك واحصل على مكافآت عند إكمال حجوزاتهم.", "Share your invitation code and earn rewards when your friends complete their bookings.")}</p>
        <div className="maak-invite-code"><strong>{profile?.referral_code ?? "—"}</strong><button type="button" onClick={() => void copyReferralCode()} aria-label={t("نسخ رمز الدعوة", "Copy invitation code")}>{copied ? <Check size={20}/> : <Copy size={20}/>}</button></div>
        <button type="button" className="btn btn-primary maak-share-invite" onClick={() => void shareInvite()}>{t("مشاركة رابط الدعوة", "Share invitation link")}</button>
      </section>
      <section className="maak-reward-stats" aria-label={t("إحصائيات الدعوات", "Invitation statistics")}>
        <article><span>{t("عدد الدعوات", "Invitations")}</span><strong>{ownedReferrals.length}</strong></article>
        <article><span>{t("المكتملة", "Completed")}</span><strong>{completedReferrals.length}</strong></article>
        <article><span>{t("قيد الانتظار", "Pending")}</span><strong>{pendingReferrals.length}</strong></article>
      </section>
      <section className="maak-reward-ledger">
        <h2>{t("سجل الحركات", "Activity")}</h2>
        {transactions.length ? transactions.map(entry => <article className="maak-ledger-row" key={entry.id}><span className="maak-ledger-icon"><UserRound size={22}/></span><div><strong>{entry.description}</strong><small>{formatDate(entry.created_at)}</small></div><div className="maak-ledger-amount"><strong className={Number(entry.amount) >= 0 ? "credit" : "debit"}>{Number(entry.amount) > 0 ? "+" : ""}{Number(entry.amount).toLocaleString()}</strong><small>{Number(entry.amount) >= 0 ? t("مكتسبة", "Earned") : t("خصم", "Debit")}</small></div></article>) : <p className="maak-empty-inline">{t("ستظهر المكافآت وحركات الرصيد هنا.", "Rewards and wallet activity will appear here.")}</p>}
      </section>
    </main>;

    return <main className="maak-app-page maak-profile-page" dir={ar ? "rtl" : "ltr"}>
      <section className="maak-profile-hero"><span className="maak-avatar"><UserRound size={66}/></span><h2>{profile?.full_name ?? name}</h2></section>
      <section className="maak-contact-card">
        <div className="maak-account-phone"><strong dir="ltr">{profile?.phone ?? phone}</strong><Phone size={20}/><small>{t("رقم الهاتف", "Phone number")}</small></div>
        <div className="maak-account-code"><strong dir="ltr">{profile?.referral_code ?? "—"}</strong><button type="button" onClick={() => void copyReferralCode()} aria-label={t("نسخ رمز الحساب", "Copy account code")}>{copied ? <Check size={18}/> : <Copy size={18}/>}</button><small>{t("رمز الحساب", "Account code")}</small></div>
      </section>
      {message && <p className="account-message" role="status">{message}</p>}
      <section className="maak-profile-group">
        <h2>{t("حسابي", "My account")}</h2>
        <div className="maak-settings-card">
          <button type="button" className="maak-settings-row" onClick={() => setProfileEditing(value => !value)}><span className="maak-settings-icon"><UserRound size={22}/></span><strong>{t("الملف الشخصي", "Personal profile")}</strong><ChevronLeft size={20}/></button>
          {profileEditing && <form className="maak-profile-edit" onSubmit={saveProfile}><label>{t("الاسم الكامل", "Full name")}<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)}/></label><label>{t("رقم الهاتف", "Phone number")}<input value={profile?.phone ?? phone} readOnly dir="ltr"/></label><button className="btn btn-primary" disabled={busy}>{busy ? t("جارٍ الحفظ…", "Saving…") : t("حفظ التغييرات", "Save changes")}</button></form>}
          <button type="button" className="maak-settings-row" onClick={() => setAccountPanel(value => value === "settings" ? null : "settings")}><span className="maak-settings-icon"><Settings size={22}/></span><strong>{t("إعدادات الحساب", "Account settings")}</strong><ChevronLeft size={20}/></button>
          {accountPanel === "settings" && <p className="maak-settings-note">{t("رقم الهاتف هو وسيلة تسجيل الدخول إلى حسابك.", "Your phone number is the sign-in method for your account.")}</p>}
          <button type="button" className="maak-settings-row" onClick={() => setAccountPanel(value => value === "documents" ? null : "documents")}><span className="maak-settings-icon"><FileText size={22}/></span><strong>{t("وثائقي", "My documents")}</strong><ChevronLeft size={20}/></button>
          {accountPanel === "documents" && <div className="maak-documents-panel">
            {profile?.passport_storage_path ? <div className="maak-passport-saved">
              <div><strong>{t("جواز السفر", "Passport")}</strong><small>{t("محفوظ في مساحة خاصة بحسابك", "Saved in your private account storage")}</small></div>
              {passportSignedUrl ? <><a className="btn btn-ghost" href={passportSignedUrl} target="_blank" rel="noopener noreferrer"><Eye size={17}/>{t("عرض", "View")}</a>{!profile.passport_storage_path.toLowerCase().endsWith(".pdf") && <img className="maak-passport-preview" src={passportSignedUrl} alt={t("صورة جواز السفر المحفوظة", "Saved passport document")}/>}</> : <span className="maak-settings-note">{t("جارٍ تجهيز رابط العرض الآمن…", "Preparing secure view link…")}</span>}
              <button type="button" className="btn btn-ghost" disabled={passportBusy} onClick={() => void deletePassportDocument()}><Trash2 size={17}/>{t("حذف", "Delete")}</button>
            </div> : <p className="maak-settings-note">{t("لا توجد وثيقة جواز محفوظة في حسابك حاليًا.", "No passport document is saved to your account yet.")}</p>}
            <label className="btn btn-primary maak-passport-manage-upload"><Upload size={18}/>{passportBusy ? t("جارٍ الحفظ…", "Saving…") : profile?.passport_storage_path ? t("استبدال صورة الجواز", "Replace passport document") : t("إضافة صورة الجواز", "Add passport document")}
              <input type="file" accept="image/jpeg,image/png,application/pdf" disabled={passportBusy} onChange={event => { void savePassportDocument(event.target.files?.[0]); event.currentTarget.value = ""; }}/>
            </label>
            <p className="maak-settings-note">{t("يمكنك عرض الوثيقة أو استبدالها أو حذفها في أي وقت. لا يستطيع غيرك الوصول إليها.", "You can view, replace, or delete this document at any time. It is not publicly accessible.")}</p>
          </div>}
        </div>
      </section>
      <section className="maak-profile-group maak-app-settings">
        <h2>{t("التطبيق", "App")}</h2>
        <div className="maak-settings-card">
          <button type="button" className="maak-settings-row" onClick={() => { toggleTheme(); setMessage(""); }}><span className="maak-settings-icon">{theme === "dark" ? <Moon size={22}/> : <Sun size={22}/>}</span><strong>{t("المظهر", "Appearance")}</strong><small>{theme === "dark" ? t("داكن", "Dark") : t("فاتح", "Light")}</small><ChevronLeft size={20}/></button>
          <button type="button" className="maak-settings-row" onClick={toggleLang}><span className="maak-settings-icon"><Languages size={22}/></span><strong>{t("اللغة", "Language")}</strong><small>{lang === "ar" ? "العربية" : "English"}</small><ChevronLeft size={20}/></button>
          <button type="button" className="maak-settings-row" onClick={() => setAccountPanel(value => value === "info" ? null : "info")}><span className="maak-settings-icon"><Info size={22}/></span><strong>{t("معلومات التطبيق", "App information")}</strong><ChevronLeft size={20}/></button>
          {accountPanel === "info" && <p className="maak-settings-note">{t("معك للسفر والسياحة — دائمًا معك في كل رحلة.", "MAAK Travel and Tourism — with you on every journey.")}</p>}
        </div>
      </section>
      {isStaff && <a className="btn btn-ghost maak-admin-link" href="/admin">{t("لوحة الإدارة", "Admin panel")}</a>}
      <button type="button" className="maak-sign-out" onClick={signOut}><LogOut size={20}/>{t("تسجيل الخروج", "Sign out")}</button>
    </main>;
  }

  return <main className="account-page" dir={ar ? "rtl" : "ltr"}><section className="account-dashboard"><header className="account-top"><div><span>{t("مرحبًا", "Welcome")}</span><h1>{profile?.full_name ?? name}</h1><p>{profile?.phone}</p></div><div className="account-top-actions">{isStaff && <a className="btn btn-ghost" href={adminOnly ? "/account" : "/admin"}>{t("لوحة الإدارة", "Admin panel")}</a>}<button className="btn btn-ghost" onClick={() => void refresh()} disabled={busy}><RefreshCw size={16}/>{t("تحديث", "Refresh")}</button><button className="btn btn-ghost" onClick={signOut}><LogOut size={16}/>{t("خروج", "Sign out")}</button></div></header>
    {message && <p className="account-message" role="status">{message}</p>}
    {!showAdmin && <div className="account-overview"><article><Wallet/><span>{t("رصيد المحفظة", "Wallet balance")}</span><strong>{balance.toLocaleString()} {t("ر.ي", "YER")}</strong></article><article><span>{t("رمز دعوتك", "Your referral code")}</span><strong>{profile?.referral_code}</strong><button className="btn btn-ghost" onClick={copyInvite}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? t("نُسخ", "Copied") : t("نسخ رابط الدعوة", "Copy invite link")}</button></article></div>}
    <nav className="account-tabs">{(showAdmin ? ["admin-orders", "admin-customers", "admin-referrals", "admin-finance"] : ["orders", "wallet", "referrals"]).map(key => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{labels[key]}</button>)}</nav>
    {!showAdmin && tab === "orders" && <section className="account-list"><h2>{t("الطلبات والحجوزات", "Orders and bookings")}</h2>{bookings.length > 0 && <div className="account-list"><h3>{t("حجوزاتي في نظام الحجوزات", "My internal bookings")}</h3>{bookings.map(booking => <article className="account-row maak-booking-account-row" key={booking.id} role="button" tabIndex={0} onClick={() => setSelectedBooking(booking)} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedBooking(booking); } }}><div><strong>{bookingServiceLabel(booking.service_type)}</strong><small dir="ltr">{bookingRef(booking.id)} · {new Date(booking.created_at).toLocaleString()}</small><p>{t("الحالة", "Status")}: {bookingStatusLabel(booking.status)}</p>{booking.preferred_date && <small>{t("الموعد المفضل", "Preferred date")}: {booking.preferred_date}</small>}<small>{t("اضغط لعرض الإجراءات", "Select to view actions")}</small></div></article>)}
      {selectedBooking && <div className="account-modal-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) setSelectedBooking(null); }}>
        <section className="account-card" role="dialog" aria-modal="true" aria-labelledby="booking-actions-title" dir={ar ? "rtl" : "ltr"}>
          <button type="button" className="account-modal-close" onClick={() => setSelectedBooking(null)} aria-label={t("إغلاق", "Close")}>×</button>
          <h2 id="booking-actions-title">{t("إجراءات الحجز", "Booking actions")}</h2>
          <p><strong>{bookingServiceLabel(selectedBooking.service_type)}</strong></p>
          <p>{t("الرقم المرجعي:", "Reference:")} <strong dir="ltr">{bookingRef(selectedBooking.id)}</strong></p>
          <p>{t("الحالة:", "Status:")} {bookingStatusLabel(selectedBooking.status)}</p>
          <div className="account-form">
            <a className="btn btn-primary" href={buildWhatsAppUrl(buildFollowUpMessage(bookingRef(selectedBooking.id), selectedBooking.service_type))} target="_blank" rel="noopener noreferrer"><MessageCircle size={17}/>{t("متابعة الطلب عبر واتساب", "Follow up via WhatsApp")}</a>
            {["pending", "confirmed"].includes(selectedBooking.status) && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void cancelSelectedBooking()}>{t("إلغاء الحجز", "Cancel booking")}</button>}
          </div>
        </section>
      </div>}</div>}{orders.length ? orders.map(order => <article className="account-row" key={order.id}><div><strong>{order.service}</strong><small>{new Date(order.created_at).toLocaleString()}</small><p>{t("الخدمة", "Service")}: {order.status} · {t("الدفع", "Payment")}: {order.payment_status}</p></div><div><strong>{order.total_amount == null ? t("بانتظار التسعير", "Awaiting quote") : `${order.total_amount} ${order.currency}`}</strong>{order.total_amount != null && balance > Number(order.wallet_used) && order.payment_status === "unpaid" && <button className="btn btn-primary" disabled={busy} onClick={() => void applyWallet(order)}>{t("استخدام رصيد المحفظة", "Use wallet")}</button>}</div></article>) : <p>{t("لا توجد طلبات محفوظة بعد.", "No saved orders yet.")}</p>}</section>}
    {!showAdmin && tab === "wallet" && <section className="account-list"><h2>{t("سجل المحفظة", "Wallet ledger")} · {balance.toLocaleString()} {t("ر.ي", "YER")}</h2>{transactions.length ? transactions.map(entry => <article className="account-row" key={entry.id}><div><strong>{entry.description}</strong><small>{new Date(entry.created_at).toLocaleString()}</small></div><strong className={entry.amount > 0 ? "credit" : "debit"}>{entry.amount > 0 ? "+" : ""}{entry.amount} {t("ر.ي", "YER")}</strong></article>) : <p>{t("لا توجد حركات في المحفظة.", "No wallet activity yet.")}</p>}</section>}
    {!showAdmin && tab === "referrals" && <section className="account-list"><h2>{t("الإحالات", "Referrals")}</h2><p>{t("تُضاف العمولة مرة واحدة بعد دفع أول حجز وإتمام خدمته.", "A single commission is credited after the invitee pays for and completes their first booking.")}</p>{referrals.length ? referrals.filter(item => item.referrer_id === session.user.id).map(item => <article className="account-row" key={item.id}><strong>{item.referred_phone ?? t("عميل مسجل", "Registered customer")}</strong><span>{item.status}</span><small>{new Date(item.created_at).toLocaleDateString()}</small></article>) : <p>{t("شارك رابطك لدعوة أصدقائك.", "Share your invite link with friends.")}</p>}</section>}
    {showAdmin && tab === "admin-orders" && <section className="account-list"><h2>{t("مراجعة الطلبات", "Review orders")}</h2>{orders.length ? orders.map(order => <article className="account-row" key={order.id}><div><strong>{order.service} · {order.customer_name}</strong><small>{order.customer_phone} · {new Date(order.created_at).toLocaleString()}</small><p>{JSON.stringify(order.request_data)}</p><span>{order.status} · {order.payment_status} · {order.total_amount ?? t("دون تسعير", "unpriced")}</span></div><button className="btn btn-primary" disabled={busy} onClick={() => void updateOrder(order)}>{t("تحديث الحالة", "Update status")}</button></article>) : <p>{t("لا توجد طلبات بعد.", "No orders yet.")}</p>}</section>}
    {showAdmin && tab === "admin-customers" && <section className="account-list"><h2>{t("العملاء", "Customers")}</h2>{customers.map(customer => <article className="account-row" key={customer.id}><div><strong>{customer.full_name}</strong><small>{customer.phone} · {customer.referral_code}</small></div><div className="account-row-actions"><button className="btn btn-ghost" disabled={busy} onClick={() => void renameCustomer(customer)}>{t("تعديل الاسم", "Edit name")}</button><button className="btn btn-ghost" disabled={busy} onClick={() => void adjustWallet(customer)}>{t("تسوية المحفظة", "Adjust wallet")}</button></div></article>)}</section>}
    {showAdmin && tab === "admin-referrals" && <section className="account-list"><h2>{t("الإحالات والعمولات", "Referrals and commissions")}</h2>{referrals.map(item => <article className="account-row" key={item.id}><div><strong>{customers.find(customer => customer.id === item.referrer_id)?.full_name ?? item.referrer_id} → {item.referred_phone}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div><span>{item.status}</span></article>)}</section>}
    {showAdmin && tab === "admin-finance" && <section className="account-list"><h2>{t("إعداد العمولة وسجل الحركات", "Commission setting and wallet ledger")}</h2><form className="account-form account-inline-form" onSubmit={saveCommission}><label>{t("قيمة عمولة الإحالة (ر.ي)", "Referral commission (YER)")}<input type="number" min="0" step="0.01" value={commission} onChange={event => setCommission(event.target.value)}/></label><button className="btn btn-primary" disabled={busy}>{t("حفظ", "Save")}</button></form>{transactions.slice(0, 100).map(entry => <article className="account-row" key={entry.id}><div><strong>{entry.description}</strong><small>{customers.find(customer => customer.id === entry.user_id)?.full_name ?? entry.user_id} · {new Date(entry.created_at).toLocaleString()}</small></div><strong className={entry.amount > 0 ? "credit" : "debit"}>{entry.amount}</strong></article>)}<h2>{t("سجل العمليات الإدارية", "Administrative audit log")}</h2>{auditRows.map(entry => <article className="account-row" key={entry.id}><div><strong>{entry.action} · {entry.entity_type} {entry.entity_id}</strong><small>{new Date(entry.created_at).toLocaleString()} · {JSON.stringify(entry.details)}</small></div></article>)}</section>}
    </section></main>;
}
