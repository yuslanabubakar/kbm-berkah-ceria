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
    <section className="glass-card mx-auto max-w-lg space-y-6 rounded-3xl p-8 shadow-sm">
      <h1
        className="text-2xl font-bold"
        style={{ color: "var(--text-primary)" }}
      >
        Masuk ke KBM Berkah Ceria
      </h1>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Silakan masuk menggunakan akun Google kamu untuk melihat dan mengelola
        perjalanan.
      </p>

      <button
        type="button"
        onClick={() => {
          window.location.href = "/api/auth/login";
        }}
        className="btn-primary w-full justify-center py-3.5 text-base font-semibold shadow-md"
      >
        <span>Masuk dengan Google</span>
      </button>
    </section>
  );
}
