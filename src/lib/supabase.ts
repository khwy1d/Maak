import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey ? createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
}) : null;

export function getReferralCode() {
  const fromUrl = new URLSearchParams(window.location.search).get("ref")?.trim().toUpperCase();
  try {
    if (fromUrl && /^[A-Z0-9]{6,20}$/.test(fromUrl)) localStorage.setItem("maak-referral-code", fromUrl);
    return localStorage.getItem("maak-referral-code");
  } catch {
    return fromUrl && /^[A-Z0-9]{6,20}$/.test(fromUrl) ? fromUrl : null;
  }
}

export function formatApiError(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Request failed. Please try again.";
}
