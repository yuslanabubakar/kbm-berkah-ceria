"use client";

import { useEffect } from "react";

export const runtime = "edge";

export default function AuthCallbackPage() {
  useEffect(() => {
    window.location.href = "/";
  }, []);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-center">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Menyelesaikan proses login...
      </p>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
    </div>
  );
}
