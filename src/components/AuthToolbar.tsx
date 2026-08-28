"use client";

import { useAuth } from "@/hooks/useAuth";

export function AuthToolbar() {
  const { user, loading } = useAuth();

  const handleSignIn = () => {
    window.location.href = "/api/auth/login";
  };

  const handleSignOut = () => {
    window.location.href = "/api/auth/logout";
  };

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
        <p
          className="font-semibold text-sm"
          style={{ color: "var(--text-primary)" }}
        >
          {user.name || user.email}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {user.email}
        </p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="btn-ghost !px-3 !py-1.5 !text-xs !rounded-full"
      >
        Keluar
      </button>
    </div>
  );
}
