"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap"}
      title={isDark ? "Mode Terang" : "Mode Gelap"}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 hover:scale-110"
      style={{
        background: "var(--bg-muted)",
        border: "1px solid var(--border-color)",
        color: "var(--text-secondary)",
      }}
    >
      <span
        className="absolute transition-all duration-300"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark
            ? "rotate(90deg) scale(0)"
            : "rotate(0deg) scale(1)",
        }}
      >
        <Sun size={16} strokeWidth={2} />
      </span>
      <span
        className="absolute transition-all duration-300"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark
            ? "rotate(0deg) scale(1)"
            : "rotate(-90deg) scale(0)",
        }}
      >
        <Moon size={16} strokeWidth={2} />
      </span>
    </button>
  );
}
