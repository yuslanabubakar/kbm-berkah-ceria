const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0
});

export function formatRupiah(value: number) {
  return formatter.format(value);
}
