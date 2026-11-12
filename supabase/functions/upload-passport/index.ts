import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const configuredOrigins = (Deno.env.get("APP_ORIGINS") ?? "").split(",").map(value => value.trim()).filter(Boolean);
const allowedOrigins = new Set(["https://maaktravel.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000", ...configuredOrigins]);
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = "customer-passports";
const maxBytes = 10 * 1024 * 1024;
const mimeExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "application/pdf": "pdf" };

function json(body: Record<string, unknown>, status: number, origin: string | null) {
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
    const headers = new Headers({
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
      "access-control-max-age": "86400",
    });
    if (origin && allowedOrigins.has(origin)) {
      headers.set("access-control-allow-origin", origin);
      headers.set("vary", "Origin");
    }
    return new Response("", { status: 204, headers });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  if (origin && !allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403, origin);

  try {
    if (![supabaseUrl, anonKey, serviceRoleKey].every(Boolean)) return json({ error: "Passport storage is not configured." }, 503, origin);
    const form = await request.formData();
    const orderId = String(form.get("orderId") ?? "");
    const uploadToken = String(form.get("uploadToken") ?? "");
    const passengerIndex = Number(form.get("passengerIndex"));
    const passengerName = String(form.get("passengerName") ?? "").trim();
    const file = form.get("file");
    if (!/^[0-9a-f-]{36}$/i.test(orderId) || !/^[0-9a-f-]{36}$/i.test(uploadToken)
      || !Number.isInteger(passengerIndex) || passengerIndex < 0 || passengerIndex > 29
      || passengerName.length < 2 || passengerName.length > 120 || !(file instanceof File)) {
      return json({ error: "Invalid passport upload details." }, 400, origin);
    }
    const extension = mimeExtensions[file.type];
    if (!extension || file.size < 1 || file.size > maxBytes) {
      return json({ error: "Use a JPG, PNG, or PDF file up to 10 MB." }, 400, origin);
    }
    const fileBytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
    const validSignature = file.type === "image/jpeg"
      ? fileBytes[0] === 0xff && fileBytes[1] === 0xd8 && fileBytes[2] === 0xff
      : file.type === "image/png"
        ? fileBytes.length === 8 && fileBytes[0] === 0x89 && fileBytes[1] === 0x50 && fileBytes[2] === 0x4e && fileBytes[3] === 0x47 && fileBytes[4] === 0x0d && fileBytes[5] === 0x0a && fileBytes[6] === 0x1a && fileBytes[7] === 0x0a
        : new TextDecoder().decode(fileBytes.slice(0, 4)) === "%PDF";
    if (!validSignature) return json({ error: "The file content does not match its declared type." }, 400, origin);

    let userId: string | null = null;
    const authorization = request.headers.get("authorization") ?? "";
    const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (bearer) {
      const { data, error } = await authClient.auth.getUser(bearer);
      if (error || !data.user) return json({ error: "Your session could not be verified. Sign in again." }, 401, origin);
      userId = data.user.id;
    }

    const { data: order, error: orderError } = await admin.from("orders")
      .select("id,customer_id,service,request_data")
      .eq("id", orderId).maybeSingle();
    if (orderError) throw orderError;
    if (!order) return json({ error: "Request not found." }, 404, origin);

    const requestData = order.request_data as Record<string, unknown>;
    const formData = requestData.form_data as Record<string, unknown> | undefined;
    const names = formData?.passenger_names;
    if (!["flight", "umrah"].includes(order.service) || formData?.passport_consent !== true || !Array.isArray(names)
      || names[passengerIndex] !== passengerName) return json({ error: "Passenger does not match this request." }, 400, origin);

    const documents = Array.isArray(formData?.passport_documents) ? formData.passport_documents as Array<Record<string, unknown>> : [];
    const existing = documents.find(item => item.passenger_index === passengerIndex);
    const alreadyUploadedForToken = typeof existing?.storage_path === "string"
      && existing.storage_path.includes(uploadToken)
      && existing.passenger_name === passengerName;
    if (order.customer_id) {
      if (!userId || order.customer_id !== userId) return json({ error: "You cannot upload documents to this request." }, 403, origin);
    } else if (userId) {
      return json({ error: "Guest requests must be uploaded from the original guest session." }, 403, origin);
    } else if (requestData.passport_upload_token !== uploadToken && !alreadyUploadedForToken) {
      return json({ error: "Guest upload authorization is invalid or expired." }, 403, origin);
    }
    let linkToAccount = false;
    if (userId && order.customer_id === userId) {
      const { data: ownerProfile, error: ownerProfileError } = await admin.from("profiles")
        .select("full_name,passport_storage_path").eq("id", userId).maybeSingle();
      if (ownerProfileError) throw ownerProfileError;
      const normalizeName = (value: string) => value.normalize("NFKC").toLocaleLowerCase()
        .replace(/[\u064B-\u065F\u0670\u0640]/g, "").trim().replace(/\s+/g, " ");
      linkToAccount = !!ownerProfile?.full_name
        && normalizeName(ownerProfile.full_name) === normalizeName(passengerName);
    }

    const ownerFolder = userId ?? "guest";
    const storagePath = `${ownerFolder}/${orderId}/passenger-${passengerIndex + 1}-${uploadToken}.${extension}`;
    const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "0",
    });
    if (uploadError) throw uploadError;

    const metadata = {
      passenger_index: passengerIndex,
      passenger_name: passengerName,
      storage_path: storagePath,
      linked_user_id: linkToAccount ? userId : null,
      content_type: file.type,
      uploaded_at: new Date().toISOString(),
    };
    const nextDocuments = [...documents.filter(item => item.passenger_index !== passengerIndex), metadata]
      .sort((a, b) => Number(a.passenger_index) - Number(b.passenger_index));
    const nextFormData = { ...formData, passport_documents: nextDocuments, passport_consent_recorded_at: formData?.passport_consent_recorded_at ?? new Date().toISOString() };
    const nextRequestData: Record<string, unknown> = { ...requestData, form_data: nextFormData };
    if (nextDocuments.length >= names.length) delete nextRequestData.passport_upload_token;
    const { error: updateError } = await admin.from("orders").update({ request_data: nextRequestData }).eq("id", orderId);
    if (updateError) throw updateError;

    if (linkToAccount && userId) {
      const accountPath = `${userId}/account/passport-${crypto.randomUUID()}.${extension}`;
      const { error: copyError } = await admin.storage.from(bucket).copy(storagePath, accountPath);
      if (copyError) throw copyError;
      const { error: profileError } = await admin.from("profiles")
        .update({ passport_storage_path: accountPath }).eq("id", userId);
      if (profileError) {
        await admin.storage.from(bucket).remove([accountPath]);
        throw profileError;
      }
    }

    return json({ ok: true, storagePath, passengerIndex }, 200, origin);
  } catch (error) {
    console.error("Passport upload failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: "Could not securely save the passport image. Please try again." }, 500, origin);
  }
});
