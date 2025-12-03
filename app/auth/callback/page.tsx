"use client";

import { Suspense, useEffect } from "react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabaseClient";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    async function completeSignIn() {
      const error = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      
      if (error) {
        console.error("Google sign-in error:", error, errorDescription);
        router.replace("/login");
        return;
      }

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !data.session) {
          console.error("Session error:", sessionError);
          router.replace("/login");
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        const storedPath = sessionStorage.getItem("kbm-return-path") ?? "/dashboard";
        sessionStorage.removeItem("kbm-return-path");
        const safePath: Route = storedPath.startsWith("/") ? (storedPath as Route) : "/dashboard";
        
        window.location.href = safePath;
      } catch (err) {
        console.error("Auth callback error:", err);
        router.replace("/login");
      }
    }

    completeSignIn();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
      <p className="text-sm text-slate-500">Menyelesaikan proses login...</p>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
          <p className="text-sm text-slate-500">Menunggu respons login...</p>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
