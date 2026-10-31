import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const setupToken = Deno.env.get("MAAK_SETUP_TOKEN") ?? "";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
function safeEqual(a: string, b: string) {
  if (!a || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { autoRefreshToken: false, persistSession: false },
});
async function ensureUser(phone: string, fullName: string, password: string) {
  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let user = listed.users.find((item) => item.phone === phone);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      phone, password, phone_confirm: true, user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    if (!data.user) throw new Error("Supabase did not return the created user.");
    user = data.user;
  }
  const { error: profileError } = await admin.from("profiles").upsert(
    { id: user.id, full_name: fullName, phone }, { onConflict: "id" },
  );
  if (profileError) throw profileError;
  return user.id;
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!setupToken) return json({ error: "لم يتم ضبط رمز التهيئة في إعدادات الوظيفة." }, 503);
  try {
    const body = await req.json();
    if (!safeEqual(typeof body.token === "string" ? body.token : "", setupToken)) {
      return json({ error: "رمز التهيئة غير صحيح." }, 401);
    }
    const adminPassword = typeof body.adminPassword === "string" ? body.adminPassword : "";
    const customerPassword = typeof body.customerPassword === "string" ? body.customerPassword : "";
    if (adminPassword.length < 6 || customerPassword.length < 6) {
      return json({ error: "يجب أن تتكون كل كلمة مرور من 6 أحرف على الأقل." }, 400);
    }
    const adminId = await ensureUser("+967717136229", "خالد أمين", adminPassword);
    await ensureUser("+967735452441", "خالد أمين عبدالواسع محمد", customerPassword);
    const { error: roleError } = await admin.from("user_roles").upsert(
      { user_id: adminId, role: "admin" }, { onConflict: "user_id" },
    );
    if (roleError) throw roleError;
    return json({ success: true, accounts: [
      { label: "الإدارة", phone: "+967717136229" },
      { label: "العميل", phone: "+967735452441" },
    ] });
  } catch (error) {
    console.error("Initial account setup failed:", error);
    return json({ error: error instanceof Error ? error.message : "حدث خطأ أثناء إنشاء الحسابات." }, 500);
  }
});
