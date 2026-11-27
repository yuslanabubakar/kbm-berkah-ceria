/**
 * Manual Rupiah formatter — produces identical output on both server (Node/Edge)
 * and browser, preventing React hydration mismatches caused by locale differences
 * in Intl.NumberFormat between environments.
 *
 * Output format: "Rp1.234.567"
 */
export function formatRupiah(value: number): string {
  const rounded = Math.round(value);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${formatted}`;
}

/**
 * Formats a positive number with Indonesian thousand dots ("150.000") for text inputs.
 */
export function formatThousandsInput(
  value: number | "" | null | undefined,
): string {
  if (value === "" || value == null || value === 0 || Number.isNaN(value)) {
    return "";
  }
  const rounded = Math.max(0, Math.round(Number(value)));
  return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Parses a user-typed formatted Rupiah string ("150.000" or "Rp 150.000") into an integer.
 */
export function parseThousandsInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}
