import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function InitialSetup() {
  const [token, setToken] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [customerPassword, setCustomerPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setFailed(false);
    if (!supabase) {
      setFailed(true);
      setMessage("إعدادات الاتصال بقاعدة البيانات غير متوفرة.");
      return;
    }
    if (adminPassword.length < 6 || customerPassword.length < 6) {
      setFailed(true);
      setMessage("يجب أن تتكون كل كلمة مرور من 6 أحرف على الأقل.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("maak-initial-accounts", {
        body: { token, adminPassword, customerPassword },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "تعذر إكمال التهيئة.");
      setMessage("تم إنشاء الحسابين بنجاح وتأكيد رقمي الهاتف. احفظ بيانات الدخول في مكان آمن.");
      setToken("");
      setAdminPassword("");
      setCustomerPassword("");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الحسابين.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page-shell" dir="rtl" style={{ maxWidth: 560, margin: "48px auto", padding: "24px" }}>
      <section className="glass-card" style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>تهيئة حسابات معك</h1>
        <p>صفحة مؤقتة لإنشاء حساب الإدارة وحساب العميل. استخدمها مرة واحدة فقط، ثم احذفها بعد نجاح العملية.</p>
        <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            رمز التهيئة المؤقت
            <input value={token} onChange={e => setToken(e.target.value)} type="password" autoComplete="off" required />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            كلمة مرور حساب الإدارة (+967717136229)
            <input value={adminPassword} onChange={e => setAdminPassword(e.target.value)} type="password" autoComplete="new-password" minLength={6} required />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            كلمة مرور حساب العميل (+967735452441)
            <input value={customerPassword} onChange={e => setCustomerPassword(e.target.value)} type="password" autoComplete="new-password" minLength={6} required />
          </label>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "جارٍ إنشاء الحسابين..." : "إنشاء الحسابين"}
          </button>
        </form>
        {message && <p role="status" style={{ marginBottom: 0, color: failed ? "#d66" : "var(--color-primary, #20B8A6)" }}>{message}</p>}
      </section>
    </main>
  );
}
