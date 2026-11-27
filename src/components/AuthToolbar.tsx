"use client";

import { useAuth } from "@/hooks/useAuth";
import { GoogleLogo } from "@/components/icons/GoogleLogo";

export function AuthToolbar() {
  const { user, loading } = useAuth();

  const handleSignIn = () => {
    window.location.href = "/api/auth/login";
  };

  const handleSignOut = () => {
    window.location.href = "/api/auth/logout";
  };

  if (loading) {
    return (
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        Memuat akun...
      </span>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={handleSignIn}
        className="btn-ghost"
        aria-label="Masuk dengan Google"
      >
        <GoogleLogo size={18} />
        <span className="text-[color:var(--text-primary)]">Masuk</span>
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
