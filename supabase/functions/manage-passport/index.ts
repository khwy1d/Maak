import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const bucket = "customer-passports";
const configuredOrigins = (Deno.env.get("APP_ORIGINS") ?? "").split(",").map(value => value.trim()).filter(Boolean);
const allowedOrigins = new Set(["https://maaktravel.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000", ...configuredOrigins]);
const maxBytes = 10 * 1024 * 1024;
const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });

function respond(body: Record<string, unknown>, status = 200, origin: string | null = null) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  if (origin && allowedOrigins.has(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async request => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (!origin || !allowedOrigins.has(origin)) return new Response("", { status: 403 });
    return new Response("", { status: 204, headers: {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
    "access-control-max-age": "86400",
  }});
  }
  if (request.method !== "POST") return respond({ error: "Method not allowed." }, 405, origin);
  try {
    const authorization = request.headers.get("authorization") ?? "";
    const bearer = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
    if (!bearer) return respond({ error: "Sign in to manage your passport document." }, 401, origin);
    const { data: authData, error: authError } = await authClient.auth.getUser(bearer);
    if (authError || !authData.user) return respond({ error: "Your session could not be verified." }, 401, origin);
    const userId = authData.user.id;
    const form = await request.formData();
    const action = String(form.get("action") ?? "");
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("passport_storage_path").eq("id", userId).single();
    if (profileError) throw profileError;
    const oldPath = typeof profile.passport_storage_path === "string" ? profile.passport_storage_path : null;
    if (oldPath && !oldPath.startsWith(userId + "/account/")) return respond({ error: "Invalid account document path." }, 403, origin);

    if (action === "delete") {
      if (oldPath) {
        const { error: updateError } = await admin.from("profiles").update({ passport_storage_path: null }).eq("id", userId);
        if (updateError) throw updateError;
        const { error: removeError } = await admin.storage.from(bucket).remove([oldPath]);
        if (removeError) throw removeError;
      }
      return respond({ ok: true }, 200, origin);
    }

    if (action !== "upload") return respond({ error: "Unsupported action." }, 400, origin);
    const file = form.get("file");
    if (!(file instanceof File)) return respond({ error: "Choose a passport document." }, 400, origin);
    const extension = extensions[file.type];
    if (!extension || file.size < 1 || file.size > maxBytes) return respond({ error: "Use a JPG, PNG, or PDF up to 10 MB." }, 400, origin);
    const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const valid = file.type === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : file.type === "image/png"
        ? bytes.length === 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
        : new TextDecoder().decode(bytes.slice(0, 4)) === "%PDF";
    if (!valid) return respond({ error: "The file content does not match its declared type." }, 400, origin);
    const newPath = userId + "/account/passport-" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await admin.storage.from(bucket).upload(newPath, file, { contentType: file.type, cacheControl: "0", upsert: false });
    if (uploadError) throw uploadError;
    const { error: updateError } = await admin.from("profiles").update({ passport_storage_path: newPath }).eq("id", userId);
    if (updateError) {
      await admin.storage.from(bucket).remove([newPath]);
      throw updateError;
    }
    if (oldPath && oldPath !== newPath) {
      const { error: removeError } = await admin.storage.from(bucket).remove([oldPath]);
      if (removeError) console.error("Old passport cleanup failed", removeError.message);
    }
    return respond({ ok: true, storagePath: newPath }, 200, origin);
  } catch (error) {
    console.error("Passport account operation failed", error instanceof Error ? error.message : "unknown error");
    return respond({ error: "Could not update your passport document. Please try again." }, 500, origin);
  }
});
