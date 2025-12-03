"use client";

import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabaseClient";

export type UseSupabaseSessionResult = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

export function useSupabaseSession(): UseSupabaseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { session, user: session?.user ?? null, loading };
}
