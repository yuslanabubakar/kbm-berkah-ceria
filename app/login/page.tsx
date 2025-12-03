"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseSession } from "@/hooks/useSupabaseSession";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useSupabaseSession();

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
      <h1 className="text-2xl font-semibold text-slate-900">Masuk ke KBM Berkah Ceria</h1>
      <p className="text-sm text-slate-600">
        Klik tombol &quot;Masuk dengan Google&quot; di pojok kanan atas untuk mulai menggunakan aplikasi. Jika belum bisa, pastikan
        kamu sudah diundang oleh host trip.
      </p>
      <p className="text-sm text-slate-500">
        Setelah login, kamu akan diarahkan ke dashboard untuk melihat dan mengelola perjalanan.
      </p>
    </section>
  );
}
