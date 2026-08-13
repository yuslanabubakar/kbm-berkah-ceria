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
