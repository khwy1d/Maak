import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/** Provides the signed-in account name to service forms, with auth metadata as a fallback. */
export function useAccountName() {
  const [accountName, setAccountName] = useState("");

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    const loadName = async (user: { id: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) {
        if (active) setAccountName("");
        return;
      }
      const metadataName = typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.trim() : "";
      if (metadataName && active) setAccountName(metadataName);
      const { data } = await supabase!.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
      if (active) setAccountName(data?.full_name?.trim() || metadataName);
    };

    void supabase.auth.getUser().then(({ data }) => loadName(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadName(session?.user ?? null);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return accountName;
}
