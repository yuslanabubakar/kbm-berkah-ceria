"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Map,
  LayoutDashboard,
  ChevronDown,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Logo } from "@/components/Logo";
import { GoogleLogo } from "@/components/icons/GoogleLogo";
import { useAuth } from "@/hooks/useAuth";
import type { Route } from "next";

const NAV_LINKS: { href: Route; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ringkasan", label: "Ringkasan", icon: Map },
];

function UserMenu() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (loading) {
    return <div className="skeleton h-9 w-24 rounded-xl" />;
  }

  if (!user) {
    return (
      <a
        href="/api/auth/login"
        className="btn-ghost h-9 whitespace-nowrap !px-2.5 sm:!px-3.5"
        aria-label="Masuk dengan Google"
        title="Masuk dengan Google"
      >
        <GoogleLogo size={18} />
        <span className="hidden text-[color:var(--text-primary)] sm:inline">
          Masuk
        </span>
      </a>
    );
  }

  const initials = (user.name || user.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-all duration-200 active:translate-y-[2px]"
        style={{
          background: "var(--bg-secondary)",
          border: "2px solid var(--border-color)",
          boxShadow: "0 2px 0 var(--ledge)",
        }}
      >
        {/* Avatar */}
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture}
            alt={user.name || "Profil"}
            className="h-7 w-7 rounded-lg object-cover"
          />
        ) : (
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: "#2E5AAC" }}
          >
            {initials}
          </span>
        )}
        <span
          className="hidden max-w-[100px] truncate text-xs font-semibold md:block"
          style={{ color: "var(--text-primary)" }}
        >
          {user.name?.split(" ")[0] || "Akun"}
        </span>
        <ChevronDown
          size={14}
          className="transition-transform duration-200"
          style={{
            color: "var(--text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-56 animate-slide-down rounded-2xl p-1"
          style={{
            background: "var(--bg-card)",
            border: "2px solid var(--border-color)",
            boxShadow: "0 4px 0 var(--ledge), 0 16px 32px var(--shadow-color)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* User info */}
          <div
            className="px-3 py-2.5 border-b"
            style={{ borderColor: "var(--border-color)" }}
          >
            <p
              className="text-xs font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {user.name || "Pengguna"}
            </p>
            <p
              className="text-xs truncate mt-0.5"
              style={{ color: "var(--text-muted)" }}
            >
              {user.email}
            </p>
          </div>
          {/* Menu items */}
          <div className="p-1">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/api/auth/logout";
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
              style={{ color: "var(--rose-text)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "var(--rose-bg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
              }}
            >
              <LogOut size={15} />
              Keluar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className="glass-navbar sticky top-0 z-40"
        style={{ transition: "background 0.2s" }}
      >
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
          {/* Logo */}
          <Link href="/" aria-label="KBM Berkah Ceria, beranda">
            <Logo size={36} />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="rounded-xl px-3.5 py-2 font-display text-sm font-extrabold transition-all duration-200"
                  style={{
                    color: active
                      ? "var(--brand-ink)"
                      : "var(--text-secondary)",
                    background: active ? "var(--brand-soft)" : "transparent",
                    boxShadow: active
                      ? "inset 0 0 0 2px var(--border-color)"
                      : "none",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
            {/* Mobile menu button */}
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-xl md:hidden"
              style={{
                background: "var(--bg-secondary)",
                border: "2px solid var(--border-color)",
                boxShadow: "0 2px 0 var(--ledge)",
                color: "var(--text-secondary)",
              }}
              onClick={() => setMobileOpen((p) => !p)}
              aria-label="Menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
          style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-40 w-64 md:hidden"
        style={{
          background: "var(--bg-card)",
          backdropFilter: "blur(20px)",
          borderLeft: "2px solid var(--border-color)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
          transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.25s ease-out",
        }}
      >
        <div className="flex flex-col h-full pt-16 p-4">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 font-display text-sm font-extrabold transition-all duration-200"
                  style={{
                    color: active ? "var(--brand-ink)" : "var(--text-primary)",
                    background: active ? "var(--brand-soft)" : "transparent",
                  }}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
}
