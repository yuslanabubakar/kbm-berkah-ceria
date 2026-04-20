"use client";

import { useState } from "react";
import clsx from "clsx";

type Props = {
  tripId: string;
  tripName: string;
};

function buildFilename(name: string, id: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const base = slug || "laporan-perjalanan";
  return `${base}-${id}.pdf`;
}

export function GenerateReportButton({ tripId, tripName }: Props) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      window.open(`/api/trips/${tripId}/report`, "_blank", "noreferrer");
    } catch (error) {
      console.error(error);
      alert("Gagal membuka laporan");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className={clsx(
        "inline-flex items-center gap-2 rounded-2xl border border-brand-blue px-4 py-2 text-sm font-semibold",
        "text-brand-blue hover:bg-brand-blue/10",
        isDownloading && "cursor-progress opacity-60",
      )}
    >
      {isDownloading ? "Menyiapkan laporan..." : "Download laporan PDF"}
    </button>
  );
}
