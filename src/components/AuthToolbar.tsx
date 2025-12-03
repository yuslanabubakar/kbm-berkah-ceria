"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseClient";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

const redirectBase = process.env.NEXT_PUBLIC_APP_URL;

export function AuthToolbar() {
  const router = useRouter();
  const { user, loading } = useSupabaseSession();
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  const handleSignIn = useCallback(async () => {
    if (!redirectBase) {
      console.error("NEXT_PUBLIC_APP_URL belum diset");
      return;
    }

    if (typeof window !== "undefined") {
      sessionStorage.setItem("kbm-return-path", window.location.pathname + window.location.search);
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${redirectBase}/auth/callback`
      }
    });
  }, [supabase]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    router.refresh();
  }, [supabase, router]);

  if (loading) {
    return <span className="text-sm text-slate-500">Memuat akun...</span>;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className="rounded-2xl border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-blue/10"
      >
        Masuk dengan Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="text-right">
        <p className="font-semibold text-slate-900">{user.user_metadata?.full_name ?? user.email}</p>
        <p className="text-xs text-slate-500">{user.email}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
      >
        Keluar
      </button>
    </div>
  );
}
