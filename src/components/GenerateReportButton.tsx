"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/components/Toast";

type Props = {
  tripId: string;
  tripName: string;
  onDark?: boolean;
};

export function GenerateReportButton({
  tripId,
  tripName,
  onDark = false,
}: Props) {
  const [isDownloading, setIsDownloading] = useState(false);
  const showToast = useToast();

  async function handleDownload() {
    setIsDownloading(true);
    try {
      window.open(`/api/trips/${tripId}/report`, "_blank", "noreferrer");
      showToast(`Laporan "${tripName}" sedang dibuka...`, "info");
    } catch (error) {
      console.error(error);
      showToast("Gagal membuka laporan PDF", "error");
    } finally {
      setIsDownloading(false);
    }
  }

  const buttonStyle = onDark
    ? {
        background: "rgba(255,255,255,0.15)",
        color: "#ffffff",
        border: "1px solid rgba(255,255,255,0.35)",
      }
    : {
        background: "rgba(46, 90, 172, 0.10)",
        color: "#2E5AAC",
        border: "1px solid rgba(46, 90, 172, 0.25)",
      };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-progress disabled:translate-y-0"
      style={buttonStyle}
    >
      {isDownloading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <FileText size={15} />
      )}
      {isDownloading ? "Menyiapkan..." : "Laporan PDF"}
    </button>
  );
}
