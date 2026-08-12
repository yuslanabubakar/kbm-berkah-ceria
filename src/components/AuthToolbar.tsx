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
        <p className="font-semibold text-slate-900">
          {user.name || user.email}
        </p>
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
