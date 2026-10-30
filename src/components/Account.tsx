import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { Check, Copy, LogOut, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { useApp } from "../context/AppContext";
import { formatApiError, getReferralCode, supabase } from "../lib/supabase";

type Row = Record<string, any>;

export default function Account({ adminOnly = false }: { adminOnly?: boolean }) {
  const { lang } = useApp();
  const ar = lang === "ar";
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pendingPhone, setPendingPhone] = useState("");
  const [balance, setBalance] = useState(0);
  const [profile, setProfile] = useState<Row | null>(null);
  const [orders, setOrders] = useState<Row[]>([]);
  const [transactions, setTransactions] = useState<Row[]>([]);
  const [referrals, setReferrals] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [auditRows, setAuditRows] = useState<Row[]>([]);
  const [commission, setCommission] = useState("0");
  const [tab, setTab] = useState("orders");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const t = (a: string, e: string) => ar ? a : e;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, value) => setSession(value));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (adminOnly) setTab("admin-orders"); }, [adminOnly]);

  const refresh = async () => {
    if (!supabase || !session) return;
    setBusy(true);
    setMessage("");
    try {
      const user = session.user;
      const [{ data: profileRow, error: profileError }, { data: orderRows, error: orderError }, { data: walletRows, error: walletError }, { data: referralRows, error: referralError }, { data: role }, { data: settings }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,phone,referral_code,created_at").eq("id", user.id).single(),
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("referrals").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
        supabase.from("app_settings").select("value").eq("key", "referral_commission").maybeSingle(),
      ]);
      if (profileError) throw profileError;
      if (orderError) throw orderError;
      if (walletError) throw walletError;
      if (referralError) throw referralError;
      setProfile(profileRow);
      setName(profileRow.full_name ?? "");
      setPhone(profileRow.phone ?? user.phone ?? "");
      setOrders(orderRows ?? []);
      setTransactions(walletRows ?? []);
      setReferrals(referralRows ?? []);
      setIsAdmin(role?.role === "admin");
      setCommission(String(settings?.value?.amount ?? 0));
      const { data: walletBalance, error: balanceError } = await supabase.rpc("current_wallet_balance");
      if (balanceError) throw balanceError;
      setBalance(Number(walletBalance ?? 0));
      if (role?.role === "admin") {
        const [{ data: customerRows, error: customersError }, { data: auditLog, error: auditError }] = await Promise.all([
          supabase.from("profiles").select("id,full_name,phone,referral_code,created_at").order("created_at", { ascending: false }),
          supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(100),
        ]);
        if (customersError) throw customersError;
        if (auditError) throw auditError;
        setCustomers(customerRows ?? []);
        setAuditRows(auditLog ?? []);
      }
    } catch (error) {
      setMessage(formatApiError(error));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { if (session) void refresh(); }, [session?.user.id]);

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
    const normalizedPhone = phone.replace(/[^+\d]/g, "");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: { shouldCreateUser: true, data: { full_name: name.trim(), referral_code: getReferralCode() } },
      });
      if (error) throw error;
      setPendingPhone(normalizedPhone);
      setMessage(t("أرسلنا رمز التحقق إلى هاتفك.", "We sent a verification code to your phone."));
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone: pendingPhone, token: otp.trim(), type: "sms" });
      if (error) throw error;
      if (data.user && name.trim()) {
        const { error: profileError } = await supabase.from("profiles").update({ full_name: name.trim() }).eq("id", data.user.id);
        if (profileError) throw profileError;
      }
      setSession(data.session);
      setOtp("");
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const signOut = async () => { await supabase?.auth.signOut(); setSession(null); setIsAdmin(false); };
  const inviteUrl = useMemo(() => profile ? `${window.location.origin}/?ref=${encodeURIComponent(profile.referral_code)}` : "", [profile]);
  const copyInvite = async () => { await navigator.clipboard.writeText(inviteUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); };

  const applyWallet = async (order: Row) => {
    if (!supabase || !order.total_amount) return;
    const due = Math.max(0, Number(order.total_amount) - Number(order.wallet_used));
    const amount = Math.min(balance, due);
    if (amount <= 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("apply_wallet_to_order", { p_order_id: order.id, p_amount: amount, p_idempotency_key: crypto.randomUUID() });
      if (error) throw error;
      await refresh();
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
      const { error } = await supabase.rpc("admin_update_order", { p_order_id: order.id, p_status: status, p_payment_status: payment, p_total_amount: total.trim() ? Number(total) : null, p_admin_note: order.admin_note });
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

  if (!supabase) return <main className="account-page"><section className="account-card"><h1>{t("الحسابات غير مفعّلة بعد", "Accounts are not configured yet")}</h1><p>{t("أضف إعدادات Supabase إلى بيئة النشر لتفعيل الحسابات والتحقق عبر SMS.", "Add Supabase environment settings to the deployment to enable accounts and SMS verification.")}</p></section></main>;

  if (!session) return <main className="account-page" dir={ar ? "rtl" : "ltr"}><section className="account-card"><ShieldCheck size={32}/><h1>{t("حسابك في معك", "Your MAAK account")}</h1><p>{t("سجّل أو ادخل برقم هاتفك؛ سنرسل رمز تحقق عبر SMS.", "Sign up or sign in with your phone. We will send an SMS verification code.")}</p>
    {!pendingPhone ? <form onSubmit={sendCode} className="account-form"><label>{t("الاسم", "Name")}<input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} autoComplete="name"/></label><label>{t("رقم الهاتف بصيغة دولية", "Phone number in international format")}<input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+967…" autoComplete="tel"/></label><button className="btn btn-primary" disabled={busy}>{t("إرسال رمز التحقق", "Send verification code")}</button></form> : <form onSubmit={verifyCode} className="account-form"><label>{t("رمز التحقق", "Verification code")}<input required inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e => setOtp(e.target.value)}/></label><button className="btn btn-primary" disabled={busy}>{t("تأكيد والدخول", "Verify and continue")}</button><button type="button" className="btn btn-ghost" onClick={() => setPendingPhone("")}>{t("تغيير الرقم", "Change number")}</button></form>}
    {message && <p className="account-message" role="status">{message}</p>}<p className="account-note">{t("يمكنك متابعة الطلبات كضيف من خلال نماذج الخدمات.", "You can continue as a guest through the service request forms.")}</p></section></main>;

  if (adminOnly && !isAdmin) return <main className="account-page" dir={ar ? "rtl" : "ltr"}><section className="account-card"><h1>{t("غير مصرح", "Access denied")}</h1><p>{t("هذه الصفحة مخصصة لفريق الإدارة.", "This page is for administrators only.")}</p><button className="btn btn-ghost" onClick={signOut}>{t("تسجيل الخروج", "Sign out")}</button></section></main>;

  const showAdmin = isAdmin && (adminOnly || tab.startsWith("admin"));
  const labels: Record<string, string> = { orders: t("طلباتي", "My orders"), wallet: t("المحفظة", "Wallet"), referrals: t("دعواتي", "Invites"), "admin-orders": t("الطلبات", "Orders"), "admin-customers": t("العملاء", "Customers"), "admin-referrals": t("الإحالات", "Referrals"), "admin-finance": t("العمولات والمحافظ", "Commissions & wallets") };

  return <main className="account-page" dir={ar ? "rtl" : "ltr"}><section className="account-dashboard"><header className="account-top"><div><span>{t("مرحبًا", "Welcome")}</span><h1>{profile?.full_name ?? name}</h1><p>{profile?.phone}</p></div><div className="account-top-actions">{isAdmin && <a className="btn btn-ghost" href={adminOnly ? "/account" : "/admin"}>{t("لوحة الإدارة", "Admin panel")}</a>}<button className="btn btn-ghost" onClick={() => void refresh()} disabled={busy}><RefreshCw size={16}/>{t("تحديث", "Refresh")}</button><button className="btn btn-ghost" onClick={signOut}><LogOut size={16}/>{t("خروج", "Sign out")}</button></div></header>
    {message && <p className="account-message" role="status">{message}</p>}
    {!showAdmin && <div className="account-overview"><article><Wallet/><span>{t("رصيد المحفظة", "Wallet balance")}</span><strong>{balance.toLocaleString()} {t("ر.ي", "YER")}</strong></article><article><span>{t("رمز دعوتك", "Your referral code")}</span><strong>{profile?.referral_code}</strong><button className="btn btn-ghost" onClick={copyInvite}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? t("نُسخ", "Copied") : t("نسخ رابط الدعوة", "Copy invite link")}</button></article></div>}
    <nav className="account-tabs">{(showAdmin ? ["admin-orders", "admin-customers", "admin-referrals", "admin-finance"] : ["orders", "wallet", "referrals"]).map(key => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{labels[key]}</button>)}</nav>
    {!showAdmin && tab === "orders" && <section className="account-list"><h2>{t("الطلبات والحجوزات", "Orders and bookings")}</h2>{orders.length ? orders.map(order => <article className="account-row" key={order.id}><div><strong>{order.service}</strong><small>{new Date(order.created_at).toLocaleString()}</small><p>{t("الخدمة", "Service")}: {order.status} · {t("الدفع", "Payment")}: {order.payment_status}</p></div><div><strong>{order.total_amount == null ? t("بانتظار التسعير", "Awaiting quote") : `${order.total_amount} ${order.currency}`}</strong>{order.total_amount != null && balance > Number(order.wallet_used) && order.payment_status === "unpaid" && <button className="btn btn-primary" disabled={busy} onClick={() => void applyWallet(order)}>{t("استخدام رصيد المحفظة", "Use wallet")}</button>}</div></article>) : <p>{t("لا توجد طلبات محفوظة بعد.", "No saved orders yet.")}</p>}</section>}
    {!showAdmin && tab === "wallet" && <section className="account-list"><h2>{t("سجل المحفظة", "Wallet ledger")} · {balance.toLocaleString()} {t("ر.ي", "YER")}</h2>{transactions.length ? transactions.map(entry => <article className="account-row" key={entry.id}><div><strong>{entry.description}</strong><small>{new Date(entry.created_at).toLocaleString()}</small></div><strong className={entry.amount > 0 ? "credit" : "debit"}>{entry.amount > 0 ? "+" : ""}{entry.amount} {t("ر.ي", "YER")}</strong></article>) : <p>{t("لا توجد حركات في المحفظة.", "No wallet activity yet.")}</p>}</section>}
    {!showAdmin && tab === "referrals" && <section className="account-list"><h2>{t("الإحالات", "Referrals")}</h2><p>{t("تُضاف العمولة مرة واحدة بعد دفع أول حجز وإتمام خدمته.", "A single commission is credited after the invitee pays for and completes their first booking.")}</p>{referrals.length ? referrals.filter(item => item.referrer_id === session.user.id).map(item => <article className="account-row" key={item.id}><strong>{item.referred_phone ?? t("عميل مسجل", "Registered customer")}</strong><span>{item.status}</span><small>{new Date(item.created_at).toLocaleDateString()}</small></article>) : <p>{t("شارك رابطك لدعوة أصدقائك.", "Share your invite link with friends.")}</p>}</section>}
    {showAdmin && tab === "admin-orders" && <section className="account-list"><h2>{t("مراجعة الطلبات", "Review orders")}</h2>{orders.length ? orders.map(order => <article className="account-row" key={order.id}><div><strong>{order.service} · {order.customer_name}</strong><small>{order.customer_phone} · {new Date(order.created_at).toLocaleString()}</small><p>{JSON.stringify(order.request_data)}</p><span>{order.status} · {order.payment_status} · {order.total_amount ?? t("دون تسعير", "unpriced")}</span></div><button className="btn btn-primary" disabled={busy} onClick={() => void updateOrder(order)}>{t("تحديث الحالة", "Update status")}</button></article>) : <p>{t("لا توجد طلبات بعد.", "No orders yet.")}</p>}</section>}
    {showAdmin && tab === "admin-customers" && <section className="account-list"><h2>{t("العملاء", "Customers")}</h2>{customers.map(customer => <article className="account-row" key={customer.id}><div><strong>{customer.full_name}</strong><small>{customer.phone} · {customer.referral_code}</small></div><div className="account-row-actions"><button className="btn btn-ghost" disabled={busy} onClick={() => void renameCustomer(customer)}>{t("تعديل الاسم", "Edit name")}</button><button className="btn btn-ghost" disabled={busy} onClick={() => void adjustWallet(customer)}>{t("تسوية المحفظة", "Adjust wallet")}</button></div></article>)}</section>}
    {showAdmin && tab === "admin-referrals" && <section className="account-list"><h2>{t("الإحالات والعمولات", "Referrals and commissions")}</h2>{referrals.map(item => <article className="account-row" key={item.id}><div><strong>{customers.find(customer => customer.id === item.referrer_id)?.full_name ?? item.referrer_id} → {item.referred_phone}</strong><small>{new Date(item.created_at).toLocaleString()}</small></div><span>{item.status}</span></article>)}</section>}
    {showAdmin && tab === "admin-finance" && <section className="account-list"><h2>{t("إعداد العمولة وسجل الحركات", "Commission setting and wallet ledger")}</h2><form className="account-form account-inline-form" onSubmit={saveCommission}><label>{t("قيمة عمولة الإحالة (ر.ي)", "Referral commission (YER)")}<input type="number" min="0" step="0.01" value={commission} onChange={event => setCommission(event.target.value)}/></label><button className="btn btn-primary" disabled={busy}>{t("حفظ", "Save")}</button></form>{transactions.slice(0, 100).map(entry => <article className="account-row" key={entry.id}><div><strong>{entry.description}</strong><small>{customers.find(customer => customer.id === entry.user_id)?.full_name ?? entry.user_id} · {new Date(entry.created_at).toLocaleString()}</small></div><strong className={entry.amount > 0 ? "credit" : "debit"}>{entry.amount}</strong></article>)}<h2>{t("سجل العمليات الإدارية", "Administrative audit log")}</h2>{auditRows.map(entry => <article className="account-row" key={entry.id}><div><strong>{entry.action} · {entry.entity_type} {entry.entity_id}</strong><small>{new Date(entry.created_at).toLocaleString()} · {JSON.stringify(entry.details)}</small></div></article>)}</section>}
    </section></main>;
}
