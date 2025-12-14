import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { fetchTripDetail } from "@/lib/tripQueries";
import { formatRupiah } from "@/lib/formatCurrency";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COLOR_PRIMARY = "#2E5AAC";
const COLOR_ACCENT = "#FF7B6A";
const COLOR_LIGHT = "#F4E3C1";
const COLOR_TEXT = "#1F2937";
const COLOR_SUBTLE = "#6B7280";
const COLOR_SUCCESS = "#047857";
const COLOR_DANGER = "#DC2626";
const COLOR_CARD_BORDER = "#93C5FD";
const COLOR_CARD_BACKGROUND = "#FFFFFF";

const FONT_REGULAR = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";

type PdfDoc = InstanceType<typeof PDFDocument>;
type TripDetail = NonNullable<Awaited<ReturnType<typeof fetchTripDetail>>>;

type TableColumn = {
  header: string;
  width: number;
  align?: "left" | "center" | "right";
};

type TableCell =
  | string
  | {
      text: string;
      color?: string;
      bold?: boolean;
    };

type TableRow = TableCell[];

function drawTitleBanner(
  doc: PdfDoc,
  detail: TripDetail,
  totalExpenses: number,
) {
  const contentWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const startX = doc.page.margins.left;
  const topY = doc.y;
  const boxHeight = 120;

  doc.save();
  doc
    .roundedRect(startX, topY, contentWidth, boxHeight, 12)
    .fill(COLOR_PRIMARY);
  doc.fillColor("#FFFFFF");
  doc
    .font(FONT_BOLD)
    .fontSize(20)
    .text("Laporan Perjalanan", startX + 24, topY + 22);
  doc
    .font(FONT_REGULAR)
    .fontSize(12)
    .text(detail.trip.nama, startX + 24, topY + 50, {
      width: contentWidth - 48,
    });

  const metaLines = [
    `ID Perjalanan: ${detail.trip.id}`,
    `Rentang Tanggal: ${buildDateRange(detail.trip.tanggalMulai, detail.trip.tanggalSelesai)}`,
    `Lokasi: ${detail.trip.lokasi}`,
    `Total Pengeluaran: ${formatRupiah(totalExpenses)}`,
  ];

  doc
    .font(FONT_REGULAR)
    .fontSize(10)
    .text(metaLines.join("\n"), startX + 24, topY + 78, {
      width: contentWidth - 48,
    });
  doc.restore();

  doc.y = topY + boxHeight + 24;
  doc.fillColor(COLOR_TEXT);
}

function drawStatsRow(doc: PdfDoc, stats: { label: string; value: string }[]) {
  if (!stats.length) return;

  const availableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const x = doc.page.margins.left;
  const gap = 12;
  const cardHeight = 64;
  const cardWidth = (availableWidth - gap * (stats.length - 1)) / stats.length;
  let baseY = doc.y;

  if (baseY + cardHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    baseY = doc.y;
  }

  doc.y = baseY;

  stats.forEach((stat, index) => {
    const cardX = x + index * (cardWidth + gap);
    const cardY = baseY;
    doc.save();
    doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 10).fill(COLOR_LIGHT);
    const valueColor = index === 0 ? COLOR_ACCENT : COLOR_PRIMARY;
    doc
      .fillColor(valueColor)
      .font(FONT_BOLD)
      .fontSize(12)
      .text(stat.value, cardX + 12, cardY + 16, {
        width: cardWidth - 24,
      });
    doc
      .fillColor(COLOR_TEXT)
      .font(FONT_REGULAR)
      .fontSize(9)
      .text(stat.label, cardX + 12, cardY + 38, {
        width: cardWidth - 24,
      });
    doc.restore();
    doc.y = baseY;
  });

  doc.y = baseY + cardHeight + 24;
  doc.fillColor(COLOR_TEXT);
}

function drawSectionTitle(doc: PdfDoc, title: string, subtitle?: string) {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.save();
  doc.fillColor(COLOR_PRIMARY).rect(x, doc.y, width, 2).fill();
  doc.restore();

  const spacing = 6;
  const titleY = doc.y + spacing;

  doc
    .fillColor(COLOR_PRIMARY)
    .font(FONT_BOLD)
    .fontSize(14)
    .text(title, x, titleY, { width, align: "left" });

  if (subtitle) {
    const subtitleY = doc.y + 2;
    doc
      .fillColor(COLOR_SUBTLE)
      .font(FONT_REGULAR)
      .fontSize(10)
      .text(subtitle, x, subtitleY, { width, align: "left" });
  }

  doc.fillColor(COLOR_TEXT);
  doc.moveDown(1);
}

const PAYMENT_CARD_PADDING = 12;

function buildPaymentCardLines(account: TripDetail["hostAccounts"][number]) {
  return [
    `Jenis: ${channelLabels[account.channel] ?? account.channel}`,
    account.provider ? `Provider: ${account.provider}` : undefined,
    `Nomor: ${account.accountNumber}`,
    `Atas nama: ${account.accountName}`,
    account.instructions ? `Catatan: ${account.instructions}` : undefined,
  ].filter(Boolean) as string[];
}

function calculatePaymentCardHeight(
  doc: PdfDoc,
  width: number,
  title: string,
  lines: string[],
) {
  const textWidth = width - PAYMENT_CARD_PADDING * 2;
  doc.font(FONT_BOLD).fontSize(11);
  const titleHeight = doc.heightOfString(title, { width: textWidth });
  doc.font(FONT_REGULAR).fontSize(10);

  let bodyHeight = 0;
  lines.forEach((line, index) => {
    bodyHeight += doc.heightOfString(line, { width: textWidth });
    if (index < lines.length - 1) {
      bodyHeight += 4;
    }
  });

  const spacing = lines.length ? 6 : 0;
  const totalHeight =
    PAYMENT_CARD_PADDING +
    titleHeight +
    spacing +
    bodyHeight +
    PAYMENT_CARD_PADDING;
  doc.font(FONT_REGULAR).fontSize(10);
  return totalHeight;
}

function renderPaymentCard(
  doc: PdfDoc,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  lines: string[],
) {
  const originalY = doc.y;
  const textWidth = width - PAYMENT_CARD_PADDING * 2;

  doc.save();
  doc.roundedRect(x, y, width, height, 10).fill(COLOR_CARD_BACKGROUND);
  doc
    .strokeColor(COLOR_CARD_BORDER)
    .lineWidth(0.8)
    .roundedRect(x, y, width, height, 10)
    .stroke();
  doc.restore();

  doc.y = y;
  let cursorY = y + PAYMENT_CARD_PADDING;

  doc
    .fillColor(COLOR_PRIMARY)
    .font(FONT_BOLD)
    .fontSize(11)
    .text(title, x + PAYMENT_CARD_PADDING, cursorY, { width: textWidth });

  cursorY = doc.y + 2;

  doc.fillColor(COLOR_TEXT).font(FONT_REGULAR).fontSize(10);
  lines.forEach((line) => {
    doc.text(line, x + PAYMENT_CARD_PADDING, cursorY, { width: textWidth });
    cursorY = doc.y + 2;
  });

  doc.y = originalY;
  doc.fillColor(COLOR_TEXT).font(FONT_REGULAR).fontSize(10);
}

function drawPaymentCards(doc: PdfDoc, accounts: TripDetail["hostAccounts"]) {
  if (!accounts.length) {
    return;
  }

  const availableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columns = accounts.length > 1 && availableWidth > 360 ? 2 : 1;
  const gapX = 12;
  const gapY = 12;
  const cardWidth =
    columns === 1 ? availableWidth : (availableWidth - gapX) / columns;
  const startX = doc.page.margins.left;
  const maxY = () => doc.page.height - doc.page.margins.bottom;

  let y = doc.y;
  let colIndex = 0;
  let rowHeight = 0;

  accounts.forEach((account, index) => {
    const lines = buildPaymentCardLines(account);
    const cardHeight = calculatePaymentCardHeight(
      doc,
      cardWidth,
      account.label,
      lines,
    );

    if (colIndex !== 0 && y + cardHeight > maxY()) {
      y += rowHeight + gapY;
      colIndex = 0;
      rowHeight = 0;
    }

    if (y + cardHeight > maxY()) {
      doc.addPage();
      y = doc.page.margins.top;
      colIndex = 0;
      rowHeight = 0;
    }

    const cardX = startX + colIndex * (cardWidth + gapX);
    renderPaymentCard(
      doc,
      cardX,
      y,
      cardWidth,
      cardHeight,
      account.label,
      lines,
    );

    rowHeight = Math.max(rowHeight, cardHeight);
    colIndex += 1;

    if (colIndex === columns) {
      y += rowHeight + gapY;
      colIndex = 0;
      rowHeight = 0;
    }
  });

  if (colIndex !== 0) {
    y += rowHeight + gapY;
  }

  doc.y = y;
  doc.moveDown(0.5);
  doc.fillColor(COLOR_TEXT).font(FONT_REGULAR).fontSize(10);
}

function drawTable(doc: PdfDoc, columns: TableColumn[], rows: TableRow[]) {
  if (!rows.length) {
    doc
      .fillColor(COLOR_SUBTLE)
      .font(FONT_REGULAR)
      .fontSize(10)
      .text("Tidak ada data tersedia.");
    doc.fillColor(COLOR_TEXT).moveDown();
    return;
  }

  const x = doc.page.margins.left;
  const headerHeight = 26;
  const rowPadding = 6;
  const borderColor = "#D1D5DB";
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);

  let y = doc.y;
  const getMaxY = () => doc.page.height - doc.page.margins.bottom;

  const moveToNextPage = () => {
    doc.addPage();
    y = doc.page.margins.top;
    doc.y = y;
    hasHeaderOnPage = false;
  };

  const drawHeaderRow = () => {
    doc.y = y;
    doc.save();
    doc.fillColor(COLOR_PRIMARY).rect(x, y, tableWidth, headerHeight).fill();
    doc.restore();

    doc.save();
    doc.fillColor("#FFFFFF").font(FONT_BOLD).fontSize(10);
    let cellX = x;
    columns.forEach((column) => {
      doc.text(column.header, cellX + rowPadding, y + rowPadding, {
        width: column.width - rowPadding * 2,
        align: column.align ?? "left",
      });
      cellX += column.width;
    });
    doc.restore();

    doc.save();
    doc
      .strokeColor(borderColor)
      .lineWidth(0.5)
      .rect(x, y, tableWidth, headerHeight)
      .stroke();
    doc.restore();

    y += headerHeight;
    doc.y = y;
  };

  let hasHeaderOnPage = false;

  const ensureHeader = () => {
    if (!hasHeaderOnPage) {
      if (y + headerHeight > getMaxY()) {
        moveToNextPage();
      }
      drawHeaderRow();
      hasHeaderOnPage = true;
    }
  };

  rows.forEach((row, rowIndex) => {
    ensureHeader();

    let rowHeight = 0;
    columns.forEach((column, index) => {
      const cell = row[index];
      const cellText = typeof cell === "string" ? cell : cell?.text ?? "";
      const isBoldCell = typeof cell === "string" ? false : cell?.bold ?? false;
      doc.font(isBoldCell ? FONT_BOLD : FONT_REGULAR).fontSize(9);
      const cellHeight = doc.heightOfString(cellText, {
        width: column.width - rowPadding * 2,
        align: column.align ?? "left",
      });
      rowHeight = Math.max(rowHeight, cellHeight);
    });
    doc.font(FONT_REGULAR).fontSize(9);
    rowHeight += rowPadding * 2;

    if (y + rowHeight > getMaxY()) {
      moveToNextPage();
      ensureHeader();
    }

    const fillColor = rowIndex % 2 === 0 ? "#FFFFFF" : COLOR_LIGHT;
    doc.save();
    doc.fillColor(fillColor).rect(x, y, tableWidth, rowHeight).fill();
    doc.restore();

    let cellX = x;
    columns.forEach((column, index) => {
      const cell = row[index];
      const cellText = typeof cell === "string" ? cell : cell?.text ?? "";
      const isBoldCell = typeof cell === "string" ? false : cell?.bold ?? false;
      const customColor = typeof cell === "string" ? undefined : cell?.color;
      const defaultColor =
        column.align === "right" ? COLOR_PRIMARY : COLOR_TEXT;
      doc
        .font(isBoldCell ? FONT_BOLD : FONT_REGULAR)
        .fontSize(9)
        .fillColor(customColor ?? defaultColor)
        .text(cellText, cellX + rowPadding, y + rowPadding, {
          width: column.width - rowPadding * 2,
          align: column.align ?? "left",
        });
      cellX += column.width;
    });

    doc.font(FONT_REGULAR).fontSize(9).fillColor(COLOR_TEXT);
    doc.save();
    doc
      .strokeColor(borderColor)
      .lineWidth(0.5)
      .moveTo(x, y)
      .lineTo(x + tableWidth, y)
      .stroke();
    doc.restore();

    y += rowHeight;
    doc.y = y;
  });

  doc.save();
  doc
    .strokeColor(borderColor)
    .lineWidth(0.5)
    .moveTo(x, y)
    .lineTo(x + tableWidth, y)
    .stroke();
  doc.restore();

  doc.y = y + 16;
  doc.x = doc.page.margins.left;
  doc.fillColor(COLOR_TEXT);
}

const channelLabels: Record<string, string> = {
  bank: "Bank Transfer",
  ewallet: "E-Wallet",
  cash: "Tunai",
  other: "Lainnya",
};

function formatDate(value?: string) {
  if (!value) return "-";
  return format(new Date(value), "d MMM yyyy", { locale: localeId });
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  return format(new Date(value), "d MMM yyyy HH:mm", { locale: localeId });
}

function buildDateRange(start?: string, end?: string) {
  if (!start) return "-";
  if (!end) {
    return `${formatDate(start)} · berjalan`;
  }
  return `${formatDate(start)} - ${formatDate(end)}`;
}

function safeFilename(name: string, id: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const base = slug || "laporan-perjalanan";
  return `${base}-${id}.pdf`;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const bufferLike = bytes.buffer as ArrayBufferLike;
  if (
    bufferLike instanceof ArrayBuffer &&
    bytes.byteOffset === 0 &&
    bytes.byteLength === bufferLike.byteLength
  ) {
    return bufferLike;
  }
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

async function createPdfBytes(detail: TripDetail) {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  doc.on("data", (chunk) => {
    const part =
      chunk instanceof Uint8Array
        ? chunk
        : new Uint8Array(chunk as ArrayBufferLike);
    chunks.push(part);
    totalLength += part.byteLength;
  });

  const pdfPromise = new Promise<Uint8Array>((resolve, reject) => {
    doc.on("end", () => {
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      chunks.forEach((part) => {
        merged.set(part, offset);
        offset += part.byteLength;
      });
      resolve(merged);
    });
    doc.on("error", (error) => reject(error));
  });

  const totalExpenses = detail.expenses.reduce(
    (sum, expense) => sum + expense.amountIdr,
    0,
  );

  drawTitleBanner(doc, detail, totalExpenses);

  drawStatsRow(doc, [
    { label: "Total Pengeluaran", value: formatRupiah(totalExpenses) },
    { label: "Total Transaksi", value: `${detail.expenses.length}` },
    { label: "Jumlah Peserta", value: `${detail.participants.length}` },
  ]);

  drawSectionTitle(
    doc,
    "Metode Pembayaran",
    "Rincian akun yang dapat digunakan peserta",
  );

  if (detail.hostAccounts.length === 0) {
    doc
      .fillColor(COLOR_SUBTLE)
      .font(FONT_REGULAR)
      .fontSize(10)
      .text("Belum ada metode pembayaran yang dicatat oleh host.");
    doc.fillColor(COLOR_TEXT).moveDown();
  } else {
    drawPaymentCards(doc, detail.hostAccounts);
  }

  doc.addPage();

  drawSectionTitle(
    doc,
    "Ringkasan Peserta",
    "Saldo dan kontribusi setiap peserta",
  );

  const participantsColumns: TableColumn[] = [];
  const availableWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  participantsColumns.push(
    { header: "Nama", width: availableWidth * 0.32 },
    { header: "Biaya", width: availableWidth * 0.17, align: "right" },
    { header: "Talangan", width: availableWidth * 0.17, align: "right" },
    { header: "Kembalian", width: availableWidth * 0.17, align: "right" },
    { header: "Harus Bayar", width: availableWidth * 0.17, align: "right" },
  );

  const participantRows: TableRow[] = detail.balances.map<TableRow>((row) => {
    const biaya = row.totalShare;
    const talangan = row.totalPaid;
    const kembalian = Math.max(talangan - biaya, 0);
    const harusBayar = row.balance < 0 ? Math.abs(row.balance) : 0;
    const harusBayarColor = harusBayar > 0 ? COLOR_DANGER : COLOR_SUCCESS;

    return [
      row.nama,
      formatRupiah(biaya),
      formatRupiah(talangan),
      formatRupiah(kembalian),
      {
        text: formatRupiah(harusBayar),
        color: harusBayarColor,
        bold: true,
      },
    ];
  });

  drawTable(doc, participantsColumns, participantRows);

  drawSectionTitle(
    doc,
    "Rincian Leg & Kendaraan",
    "Daftar leg perjalanan beserta kendaraan dan penumpang",
  );

  if (!detail.legs.length) {
    doc
      .fillColor(COLOR_SUBTLE)
      .font(FONT_REGULAR)
      .fontSize(10)
      .text("Belum ada leg yang tercatat untuk perjalanan ini.");
    doc.fillColor(COLOR_TEXT).moveDown();
  } else {
    const legVehicleColumns: TableColumn[] = [];
    legVehicleColumns.push(
      { header: "Leg", width: availableWidth * 0.25 },
      { header: "Jadwal", width: availableWidth * 0.2 },
      { header: "Kendaraan", width: availableWidth * 0.23 },
      { header: "Penumpang", width: availableWidth * 0.32 },
    );

    const legVehicleRows: TableRow[] = [];

    detail.legs.forEach((leg) => {
      const legLabelLines = [`Leg ${leg.order}`, leg.label]
        .filter(Boolean)
        .join("\n");
      const scheduleLines = [
        leg.start ? `Mulai: ${formatDateTime(leg.start)}` : undefined,
        leg.end ? `Selesai: ${formatDateTime(leg.end)}` : undefined,
      ]
        .filter(Boolean)
        .join("\n");
      const scheduleText = scheduleLines || "-";

      if (!leg.vehicles.length) {
        legVehicleRows.push([
          legLabelLines,
          scheduleText,
          "Belum ada kendaraan",
          "-",
        ]);
        return;
      }

      leg.vehicles.forEach((vehicle) => {
        const vehicleLines = [
          vehicle.label,
          vehicle.plateNumber ? `Plat: ${vehicle.plateNumber}` : undefined,
          vehicle.seatCapacity ? `${vehicle.seatCapacity} kursi` : undefined,
          vehicle.departureTime
            ? `Berangkat: ${formatDateTime(vehicle.departureTime)}`
            : undefined,
          vehicle.notes ? `Catatan: ${vehicle.notes}` : undefined,
        ]
          .filter(Boolean)
          .join("\n");

        const passengerLines = vehicle.assignments.length
          ? vehicle.assignments
              .map(
                (assignment) =>
                  `${assignment.participantName}${assignment.role === "driver" ? " (Supir)" : ""}`,
              )
              .join("\n")
          : "Belum ada penumpang";

        legVehicleRows.push([
          legLabelLines,
          scheduleText,
          vehicleLines,
          passengerLines,
        ]);
      });
    });

    drawTable(doc, legVehicleColumns, legVehicleRows);
  }

  doc.addPage();

  drawSectionTitle(
    doc,
    "Daftar Pengeluaran",
    "Rincian transaksi selama perjalanan",
  );

  const expenseColumns: TableColumn[] = [];
  expenseColumns.push(
    { header: "No", width: availableWidth * 0.07, align: "center" },
    { header: "Judul", width: availableWidth * 0.22 },
    { header: "Tanggal", width: availableWidth * 0.18 },
    { header: "Jumlah", width: availableWidth * 0.16, align: "right" },
    { header: "Dibayar Oleh", width: availableWidth * 0.17 },
    { header: "Keterangan", width: availableWidth * 0.2 },
  );

  const expenseRows: TableRow[] = detail.expenses.map<TableRow>(
    (expense, index) => {
      const scopeText =
        expense.shareScope === "vehicle"
          ? "Penumpang kendaraan terkait"
          : "Semua penumpang leg";
      const notesText = expense.notes ? `Catatan: ${expense.notes}` : "";
      const info = [scopeText, notesText].filter(Boolean).join("\n");

      return [
        `${index + 1}`,
        expense.judul,
        formatDateTime(expense.date),
        formatRupiah(expense.amountIdr),
        expense.paidBy.nama,
        info,
      ];
    },
  );

  drawTable(doc, expenseColumns, expenseRows);

  doc.end();

  return pdfPromise;
}

export async function GET(
  _request: Request,
  { params }: { params: { tripId: string } },
) {
  const { tripId } = params;

  if (!tripId) {
    return NextResponse.json(
      { message: "Trip tidak ditemukan" },
      { status: 404 },
    );
  }

  const supabase = getSupabaseServer();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { message: "Tidak terautentikasi" },
      { status: 401 },
    );
  }

  try {
    const detail = await fetchTripDetail(tripId);

    if (!detail) {
      return NextResponse.json(
        { message: "Trip tidak ditemukan atau akses ditolak" },
        { status: 404 },
      );
    }

    const pdfBytes = await createPdfBytes(detail);
    const arrayBuffer = toArrayBuffer(pdfBytes);
    const filename = safeFilename(detail.trip.nama, detail.trip.id);

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Gagal menghasilkan laporan trip", error);
    return NextResponse.json(
      { message: "Gagal membuat laporan" },
      { status: 500 },
    );
  }
}
