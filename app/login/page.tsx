"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <section className="mx-auto max-w-lg space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-900">
        Masuk ke KBM Berkah Ceria
      </h1>
      <p className="text-sm text-slate-600">
        Silakan masuk menggunakan akun Google kamu untuk melihat dan mengelola
        perjalanan.
      </p>

      <button
        type="button"
        onClick={() => {
          window.location.href = "/api/auth/login";
        }}
        className="w-full flex items-center justify-center gap-3 rounded-2xl border border-brand-blue bg-brand-blue px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-blue/90 transition-colors"
      >
        <span>Masuk dengan Google</span>
      </button>
    </section>
  );
}
