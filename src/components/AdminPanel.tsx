import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Bell, CheckCircle2, Clock3, ImagePlus, LogOut, RefreshCw, ShieldCheck, UserCog, Users, X, ClipboardList } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase, formatApiError } from "../lib/supabase";

type Row = Record<string, any>;
type Role = "admin" | "staff" | "customer";

const serviceNames: Record<string, string> = {
  flight: "تذاكر الطيران", ground_transport: "النقل البري", accommodation: "الفنادق",
  car_rental: "تأجير السيارات", medical_travel: "السفر العلاجي", security_clearance: "الموافقات الأمنية",
  umrah: "العمرة", real_estate: "الخدمات العقارية", tourism: "السياحة والرحلات",
};
const statusNames: Record<string, string> = {
  requested: "قيد المراجعة", quoted: "بانتظار تأكيد العميل", in_progress: "قيد التنفيذ",
  completed: "مكتمل", cancelled: "ملغي",
};
const paymentNames: Record<string, string> = { unpaid: "غير مدفوع", paid: "مدفوع", refunded: "مسترد" };

export default function AdminPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [profile, setProfile] = useState<Row | null>(null);
  const [orders, setOrders] = useState<Row[]>([]);
  const [notifications, setNotifications] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [banners, setBanners] = useState<Row[]>([]);
  const [tab, setTab] = useState<"orders" | "notifications" | "team" | "banners">("orders");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [bannerAlt, setBannerAlt] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const isAdmin = role === "admin";
  const isStaff = role === "staff" || isAdmin;

  const load = useCallback(async (currentSession: Session | null) => {
    if (!supabase || !currentSession) return;
    setLoading(true);
    setMessage("");
    try {
      const [{ data: roleRow, error: roleError }, { data: profileRow, error: profileError }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", currentSession.user.id).maybeSingle(),
        supabase.from("profiles").select("id,full_name,phone").eq("id", currentSession.user.id).maybeSingle(),
      ]);
      if (roleError) throw roleError;
      if (profileError) throw profileError;
      const currentRole = (roleRow?.role ?? "customer") as Role;
      setRole(currentRole);
      setProfile(profileRow);
      if (currentRole !== "admin" && currentRole !== "staff") return;

      const [{ data: orderRows, error: orderError }, { data: notificationRows, error: notificationError }] = await Promise.all([
        supabase.from("orders")
          .select("id,customer_id,customer_name,customer_phone,service,request_data,status,payment_status,total_amount,wallet_used,currency,created_at,updated_at,review_assignee_id,review_assignee_name,review_started_at")
          .order("created_at", { ascending: false }).limit(250),
        supabase.from("staff_notifications").select("id,order_id,title,body,created_at,read_at")
          .eq("user_id", currentSession.user.id).order("created_at", { ascending: false }).limit(100),
      ]);
      if (orderError) throw orderError;
      if (notificationError) throw notificationError;
      setOrders(orderRows ?? []);
      setNotifications(notificationRows ?? []);

      if (currentRole === "admin") {
        const [{ data: customerRows, error: customerError }, { data: roleRows, error: rolesError }, { data: bannerRows, error: bannerError }] = await Promise.all([
          supabase.from("profiles").select("id,full_name,phone,referral_code,created_at").order("created_at", { ascending: false }).limit(500),
          supabase.from("user_roles").select("user_id,role"),
          supabase.from("home_banners").select("id,storage_path,alt_text,sort_order,is_active,created_at").order("sort_order", { ascending: true }),
        ]);
        if (customerError) throw customerError;
        if (rolesError) throw rolesError;
        if (bannerError) throw bannerError;
        setCustomers(customerRows ?? []);
        setRoles(Object.fromEntries((roleRows ?? []).map((item: Row) => [item.user_id, item.role as Role])));
        setBanners(bannerRows ?? []);
      }
    } catch (error) {
      setMessage(formatApiError(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase) { setLoading(false); setMessage("تعذر الاتصال بقاعدة البيانات."); return; }
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession) void load(nextSession);
      else { setRole(null); setProfile(null); setLoading(false); }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) void load(data.session);
      else setLoading(false);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [load]);

  useEffect(() => {
    const client = supabase;
    if (!session || !isStaff || !client) return;
    const channel = client.channel("maak-staff-admin-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load(session))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "staff_notifications", filter: `user_id=eq.${session.user.id}` }, () => void load(session))
      .subscribe();
    const refreshId = window.setInterval(() => void load(session), 30000);
    return () => { window.clearInterval(refreshId); void client.removeChannel(channel); };
  }, [session?.user.id, isStaff, load]);

  useEffect(() => {
    if (!bannerFile) { setBannerPreview(""); return; }
    const url = URL.createObjectURL(bannerFile);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [bannerFile]);

  const unreadCount = notifications.filter(item => !item.read_at).length;
  const visibleOrders = useMemo(() => orders.filter(order => {
    if (filter === "new") return !order.review_assignee_id;
    if (filter === "mine") return order.review_assignee_id === session?.user.id;
    if (filter === "other") return order.review_assignee_id && order.review_assignee_id !== session?.user.id;
    return true;
  }), [orders, filter]);

  const claimOrder = async (order: Row) => {
    if (!supabase) return;
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.rpc("claim_order_review", { p_order_id: order.id });
      if (error) throw error;
      setExpandedOrder(order.id);
      await load(session);
    } catch (error) {
      setMessage(formatApiError(error));
      await load(session);
    } finally { setBusy(false); }
  };

  const updateOrder = async (order: Row) => {
    if (!supabase || order.review_assignee_id !== session?.user.id) return;
    const status = window.prompt("حالة الطلب: requested أو quoted أو in_progress أو completed أو cancelled", order.status);
    if (!status || !Object.prototype.hasOwnProperty.call(statusNames, status)) return;
    const payment = window.prompt("حالة الدفع: unpaid أو paid أو refunded", order.payment_status);
    if (!payment || !Object.prototype.hasOwnProperty.call(paymentNames, payment)) return;
    const totalText = window.prompt("إجمالي المبلغ (اتركه فارغًا دون تغيير)", order.total_amount == null ? "" : String(order.total_amount));
    if (totalText === null) return;
    const note = window.prompt("ملاحظة داخلية (اختياري)", "");
    if (note === null) return;
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.rpc("staff_update_order", {
        p_order_id: order.id, p_status: status, p_payment_status: payment,
        p_total_amount: totalText.trim() ? Number(totalText) : null, p_admin_note: note.trim() || null,
      });
      if (error) throw error;
      setMessage("تم تحديث الطلب.");
      await load(session);
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const markNotificationRead = async (item: Row) => {
    if (!supabase || item.read_at) return;
    const { error } = await supabase.from("staff_notifications").update({ read_at: new Date().toISOString() }).eq("id", item.id);
    if (error) setMessage(formatApiError(error));
    else await load(session);
  };

  const setCustomerRole = async (customer: Row, nextRole: "staff" | "customer") => {
    if (!supabase || !isAdmin || customer.id === session?.user.id) return;
    const label = nextRole === "staff" ? "ترقية هذا العميل إلى موظف؟" : "إلغاء صلاحية الموظف وإعادته إلى عميل؟";
    if (!window.confirm(label + " سيحتفظ الحساب بنفس بياناته ومعرّفه.")) return;
    setBusy(true); setMessage("");
    try {
      const { error } = await supabase.rpc("admin_set_staff_role", { p_user_id: customer.id, p_role: nextRole });
      if (error) throw error;
      setMessage(nextRole === "staff" ? "تمت ترقية العميل إلى موظف." : "تم إلغاء صلاحية الموظف.");
      await load(session);
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const uploadBanner = async (event: ChangeEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !isAdmin || !bannerFile) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(bannerFile.type) || bannerFile.size > 5 * 1024 * 1024) {
      setMessage("اختر صورة JPG أو PNG أو WebP لا يتجاوز حجمها 5 ميغابايت."); return;
    }
    setBusy(true); setMessage("");
    const path = `home/${crypto.randomUUID()}-${bannerFile.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    try {
      const { error: uploadError } = await supabase.storage.from("home-banners").upload(path, bannerFile, { contentType: bannerFile.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase.from("home_banners").insert({
        storage_path: path, alt_text: bannerAlt.trim(), sort_order: banners.length,
        is_active: true, created_by: session?.user.id,
      });
      if (insertError) {
        await supabase.storage.from("home-banners").remove([path]);
        throw insertError;
      }
      setBannerFile(null); setBannerAlt("");
      setMessage("تمت إضافة البنر إلى الصفحة الرئيسية.");
      await load(session);
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const toggleBanner = async (banner: Row) => {
    if (!supabase || !isAdmin) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("home_banners").update({ is_active: !banner.is_active }).eq("id", banner.id);
      if (error) throw error;
      await load(session);
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const editBannerText = async (banner: Row) => {
    if (!supabase || !isAdmin) return;
    const text = window.prompt("الوصف البديل للصورة", banner.alt_text ?? "");
    if (text === null) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("home_banners").update({ alt_text: text.trim() }).eq("id", banner.id);
      if (error) throw error;
      await load(session);
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const deleteBanner = async (banner: Row) => {
    if (!supabase || !isAdmin || !window.confirm("حذف هذا البنر نهائيًا من الصفحة الرئيسية؟")) return;
    setBusy(true);
    try {
      const { error: rowError } = await supabase.from("home_banners").delete().eq("id", banner.id);
      if (rowError) throw rowError;
      const { error: fileError } = await supabase.storage.from("home-banners").remove([banner.storage_path]);
      if (fileError) setMessage("حُذف البنر من الموقع، لكن تعذر حذف ملف الصورة من التخزين.");
      await load(session);
    } catch (error) { setMessage(formatApiError(error)); }
    finally { setBusy(false); }
  };

  const signOut = async () => { await supabase?.auth.signOut(); };
  const publicBannerUrl = (path: string) => supabase?.storage.from("home-banners").getPublicUrl(path).data.publicUrl ?? "";

  if (loading) return <main className="maak-admin-shell" dir="rtl"><div className="maak-admin-loading">جارٍ تجهيز لوحة الإدارة…</div></main>;
  if (!session) return <main className="maak-admin-shell" dir="rtl"><section className="maak-admin-empty"><ShieldCheck size={38}/><h1>سجّل الدخول أولًا</h1><p>تحتاج إلى حسابك للوصول إلى لوحة الطلبات.</p><a className="btn btn-primary" href="/login">تسجيل الدخول</a></section></main>;
  if (!isStaff) return <main className="maak-admin-shell" dir="rtl"><section className="maak-admin-empty"><ShieldCheck size={38}/><h1>غير مصرح بالدخول</h1><p>هذه اللوحة مخصصة للمدير والموظفين الذين عيّنهم المدير.</p><a className="btn btn-ghost" href="/account">العودة إلى حسابي</a></section></main>;

  const tabs = [
    { id: "orders" as const, label: "الطلبات", icon: ClipboardList },
    { id: "notifications" as const, label: "الإشعارات", icon: Bell },
    ...(isAdmin ? [{ id: "team" as const, label: "الموظفون", icon: Users }, { id: "banners" as const, label: "بنرات الرئيسية", icon: ImagePlus }] : []),
  ];

  return <main className="maak-admin-shell" dir="rtl">
    <header className="maak-admin-header">
      <div><span className="maak-admin-eyebrow">MAAK · WORKSPACE</span><h1>لوحة إدارة معك</h1><p>{profile?.full_name ?? "فريق معك"} · {isAdmin ? "مدير" : "موظف"}</p></div>
      <div className="maak-admin-header-actions"><button className="btn btn-ghost" onClick={() => void load(session)} disabled={busy}><RefreshCw size={17}/> تحديث</button><button className="btn btn-ghost" onClick={signOut}><LogOut size={17}/> خروج</button></div>
    </header>
    {message && <div className="maak-admin-message" role="status">{message}<button onClick={() => setMessage("")} aria-label="إغلاق"><X size={16}/></button></div>}
    <nav className="maak-admin-tabs">{tabs.map(item => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><item.icon size={18}/>{item.label}{item.id === "notifications" && unreadCount > 0 && <b>{unreadCount}</b>}</button>)}</nav>

    {tab === "orders" && <section className="maak-admin-section">
      <div className="maak-admin-section-heading"><div><h2>الطلبات والحجوزات</h2><p>افتح الطلب لاستلام مراجعته، وسيظهر اسم الموظف لجميع أعضاء الفريق.</p></div><span>{orders.length} طلب</span></div>
      <div className="maak-admin-filters">{[["all","الكل"],["new","جديدة"],["mine","أراجعها"],["other","استلمها موظف آخر"]].map(([key,label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}</div>
      {visibleOrders.length ? <div className="maak-admin-order-list">{visibleOrders.map(order => {
        const mine = order.review_assignee_id === session.user.id;
        const assigned = Boolean(order.review_assignee_id);
        return <article className="maak-admin-order" key={order.id}>
          <div className="maak-admin-order-top"><div><span className="maak-admin-order-service">{serviceNames[order.service] ?? order.service}</span><h3>{order.customer_name}</h3><a href={`tel:${order.customer_phone}`} dir="ltr">{order.customer_phone}</a></div><span className={`maak-admin-status ${order.status}`}>{statusNames[order.status] ?? order.status}</span></div>
          <div className="maak-admin-order-meta"><span>{new Date(order.created_at).toLocaleString("ar")}</span><span>{paymentNames[order.payment_status] ?? order.payment_status}</span><strong>{order.total_amount == null ? "بانتظار التسعير" : `${Number(order.total_amount).toLocaleString("ar")} ${order.currency}`}</strong></div>
          {assigned ? <div className={`maak-admin-claimed ${mine ? "mine" : ""}`}><CheckCircle2 size={17}/>{mine ? "أنت تتولى مراجعة هذا الطلب" : `قيد المراجعة من قبل: ${order.review_assignee_name ?? "موظف"}`}{order.review_started_at && <small>{new Date(order.review_started_at).toLocaleString("ar")}</small>}</div> : <div className="maak-admin-unclaimed"><Clock3 size={17}/>طلب جديد بانتظار أن يستلمه أحد الموظفين</div>}
          <div className="maak-admin-order-actions">
            <button className="btn btn-ghost" onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}>{expandedOrder === order.id ? "إخفاء التفاصيل" : "تفاصيل الطلب"}</button>
            {!assigned && <button className="btn btn-primary" disabled={busy} onClick={() => void claimOrder(order)}>استلام ومراجعة</button>}
            {mine && <button className="btn btn-primary" disabled={busy} onClick={() => void updateOrder(order)}>تحديث الطلب</button>}
          </div>
          {expandedOrder === order.id && <pre className="maak-admin-request-data">{JSON.stringify(order.request_data, null, 2)}</pre>}
        </article>;
      })}</div> : <div className="maak-admin-empty"><ClipboardList size={34}/><h3>لا توجد طلبات في هذا التصنيف</h3><p>ستظهر الطلبات الجديدة هنا فور إرسال العملاء لها.</p></div>}
    </section>}

    {tab === "notifications" && <section className="maak-admin-section"><div className="maak-admin-section-heading"><div><h2>إشعارات الفريق</h2><p>تنبيهات الطلبات الجديدة المرسلة إلى حسابك.</p></div><span>{unreadCount} غير مقروء</span></div>
      {notifications.length ? <div className="maak-admin-notification-list">{notifications.map(item => <button key={item.id} className={`maak-admin-notification ${item.read_at ? "read" : "unread"}`} onClick={() => { void markNotificationRead(item); setTab("orders"); setFilter("all"); setExpandedOrder(item.order_id); }}><Bell size={19}/><span><strong>{item.title}</strong><small>{item.body}</small><small>{new Date(item.created_at).toLocaleString("ar")}</small></span>{!item.read_at && <i/>}</button>)}</div> : <div className="maak-admin-empty"><Bell size={34}/><h3>لا توجد إشعارات</h3><p>سننبهك هنا عند وصول طلب جديد.</p></div>}
    </section>}

    {tab === "team" && isAdmin && <section className="maak-admin-section"><div className="maak-admin-section-heading"><div><h2>إدارة فريق العمل</h2><p>رقِّ حساب العميل إلى موظف أو ألغِ صلاحية الموظف. لا يتغير حسابه أو بياناته.</p></div><span>{customers.filter(c => roles[c.id] === "staff").length} موظف</span></div>
      <div className="maak-admin-team-list">{customers.map(customer => {
        const currentRole = roles[customer.id] ?? "customer";
        if (currentRole === "admin") return null;
        return <article className="maak-admin-team-row" key={customer.id}><div><strong>{customer.full_name}</strong><small>{customer.phone}</small><small>{currentRole === "staff" ? "موظف" : "عميل"}</small></div>{currentRole === "staff" ? <button className="btn btn-ghost" disabled={busy || customer.id === session.user.id} onClick={() => void setCustomerRole(customer, "customer")}>إلغاء صلاحية الموظف</button> : <button className="btn btn-primary" disabled={busy} onClick={() => void setCustomerRole(customer, "staff")}><UserCog size={17}/> ترقية إلى موظف</button>}</article>;
      })}</div>
    </section>}

    {tab === "banners" && isAdmin && <section className="maak-admin-section"><div className="maak-admin-section-heading"><div><h2>صور البنر في الصفحة الرئيسية</h2><p>أضف الصور أو عدّل وصفها أو أخفها مؤقتًا أو احذفها.</p></div><span>{banners.filter(b => b.is_active).length} منشور</span></div>
      <form className="maak-admin-banner-form" onSubmit={uploadBanner}>
        <label className="maak-admin-file-pick"><ImagePlus size={23}/><strong>{bannerFile ? bannerFile.name : "اختر صورة البنر"}</strong><small>JPG أو PNG أو WebP · حتى 5 ميغابايت</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setBannerFile(event.target.files?.[0] ?? null)}/></label>
        {bannerPreview && <img className="maak-admin-banner-preview" src={bannerPreview} alt="معاينة البنر"/>}
        <label>وصف الصورة<input value={bannerAlt} onChange={event => setBannerAlt(event.target.value)} maxLength={180} placeholder="وصف مختصر للصورة"/></label>
        <button className="btn btn-primary" disabled={busy || !bannerFile}><ImagePlus size={17}/> إضافة إلى الصفحة الرئيسية</button>
      </form>
      <div className="maak-admin-banner-list">{banners.map(banner => <article className="maak-admin-banner-row" key={banner.id}><img src={publicBannerUrl(banner.storage_path)} alt={banner.alt_text || "بنر معك"}/><div><strong>{banner.alt_text || "بنر بدون وصف"}</strong><small>{banner.is_active ? "ظاهر في الصفحة الرئيسية" : "مخفي مؤقتًا"}</small><div className="maak-admin-banner-actions"><button className="btn btn-ghost" disabled={busy} onClick={() => void editBannerText(banner)}>تعديل الوصف</button><button className="btn btn-ghost" disabled={busy} onClick={() => void toggleBanner(banner)}>{banner.is_active ? "إخفاء" : "إظهار"}</button><button className="btn btn-ghost danger" disabled={busy} onClick={() => void deleteBanner(banner)}>حذف</button></div></div></article>)}</div>
    </section>}
  </main>;
}
