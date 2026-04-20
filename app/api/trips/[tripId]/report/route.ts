/**
 * REPLACEMENT FOR: app/api/trips/[tripId]/report/route.ts
 *
 * The old route used `pdfkit` (Node.js only) to stream a PDF binary.
 * Cloudflare Pages runs on the edge runtime — no Node.js APIs available.
 *
 * NEW APPROACH: This route returns a fully-styled HTML page.
 * The frontend opens it in a new tab and the user presses Ctrl+P / Cmd+P
 * to save as PDF. This works identically from the user's perspective and
 * requires zero new dependencies.
 *
 * Place this file at:
 *   app/api/trips/[tripId]/report/route.ts
 *
 * (Replace the existing file entirely)
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateStr));
}

// ─── Types (minimal — adjust to match your actual DB schema) ─────────────────

interface Participant {
  name: string;
  is_driver: boolean;
  balance: number; // positive = receive, negative = must pay
}

interface Expense {
  description: string;
  amount: number;
  paid_by: string;
  created_at: string;
  excluded: boolean;
}

interface HostAccount {
  bank_name: string;
  account_number: string;
  account_holder: string;
}

interface Trip {
  id: string;
  name: string;
  start_city: string;
  end_city: string;
  start_date: string | null;
  end_date: string | null;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } },
) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role for server-side reads
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );

  const { tripId } = params;

  // ── Fetch trip ──────────────────────────────────────────────────────────────
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, name, start_city, end_city, start_date, end_date")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) {
    return new NextResponse("Trip tidak ditemukan", { status: 404 });
  }

  // ── Fetch participants with balances ────────────────────────────────────────
  // Adjust query to match your actual view/table name
  const { data: participants } = await supabase
    .from("trip_balances") // your view from 0001_init.sql
    .select("name, is_driver, balance")
    .eq("trip_id", tripId)
    .order("balance");

  // ── Fetch expenses ──────────────────────────────────────────────────────────
  const { data: expenses } = await supabase
    .from("expenses")
    .select("description, amount, paid_by, created_at, excluded")
    .eq("trip_id", tripId)
    .order("created_at");

  // ── Fetch host accounts ─────────────────────────────────────────────────────
  const { data: hostAccounts } = await supabase
    .from("host_payment_accounts")
    .select("bank_name, account_number, account_holder")
    .eq("trip_id", tripId);

  const participantList: Participant[] = participants ?? [];
  const expenseList: Expense[] = expenses ?? [];
  const accountList: HostAccount[] = hostAccounts ?? [];

  const totalExpenses = expenseList
    .filter((e) => !e.excluded)
    .reduce((sum, e) => sum + e.amount, 0);

  const mustPay = participantList.filter((p) => p.balance < 0);
  const willReceive = participantList.filter((p) => p.balance > 0);

  // ── Build HTML ──────────────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Laporan Perjalanan — ${trip.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 13px;
      color: #1a1a1a;
      background: #fff;
      padding: 32px 40px;
      max-width: 800px;
      margin: 0 auto;
    }

    /* ── Print button (hidden when printing) ── */
    .print-btn {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .print-btn button {
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 24px;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      font-weight: 600;
    }
    .print-btn button:hover { background: #1d4ed8; }

    @media print {
      .print-btn { display: none; }
      body { padding: 0; }
    }

    /* ── Header ── */
    .header { margin-bottom: 28px; border-bottom: 2px solid #2563eb; padding-bottom: 16px; }
    .header h1 { font-size: 22px; font-weight: 700; color: #2563eb; }
    .header .meta { color: #555; margin-top: 6px; font-size: 12px; }
    .header .meta span { margin-right: 16px; }

    /* ── Section ── */
    .section { margin-bottom: 32px; }
    .section-title {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #2563eb;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      margin-bottom: 14px;
    }

    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    th {
      text-align: left;
      padding: 8px 10px;
      background: #f1f5f9;
      font-weight: 600;
      color: #374151;
      border-bottom: 1px solid #e5e7eb;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #f3f4f6;
      vertical-align: top;
    }
    tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* ── Balance colors ── */
    .pay   { color: #dc2626; font-weight: 600; }
    .recv  { color: #16a34a; font-weight: 600; }
    .zero  { color: #6b7280; }

    /* ── Summary cards ── */
    .summary-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .card .label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.04em; }
    .card .value { font-size: 18px; font-weight: 700; margin-top: 4px; color: #111; }

    /* ── Accounts ── */
    .account-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .account-item .bank { font-weight: 700; min-width: 100px; }
    .account-item .number { font-family: monospace; font-size: 14px; color: #1d4ed8; }
    .account-item .holder { color: #6b7280; font-size: 12px; }

    /* ── Badge ── */
    .badge {
      display: inline-block;
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 99px;
      font-weight: 600;
      margin-left: 6px;
    }
    .badge-driver { background: #dbeafe; color: #1e40af; }

    /* ── Footer ── */
    .footer {
      margin-top: 40px;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      font-size: 11px;
      color: #9ca3af;
      text-align: center;
    }

    @media print {
      .section { page-break-inside: avoid; }
      .section:nth-child(2) { page-break-before: always; }
      .section:nth-child(4) { page-break-before: always; }
    }
  </style>
</head>
<body>

  <div class="print-btn">
    <button onclick="window.print()">🖨️ Simpan sebagai PDF</button>
  </div>

  <!-- Header -->
  <div class="header">
    <h1>${trip.name}</h1>
    <div class="meta">
      <span>📍 ${trip.start_city ?? ""} → ${trip.end_city ?? ""}</span>
      <span>📅 ${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}</span>
      <span>🖨️ Dicetak: ${formatDate(new Date().toISOString())}</span>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="section">
    <div class="section-title">Ringkasan</div>
    <div class="summary-cards">
      <div class="card">
        <div class="label">Total Pengeluaran</div>
        <div class="value">${formatRupiah(totalExpenses)}</div>
      </div>
      <div class="card">
        <div class="label">Jumlah Peserta</div>
        <div class="value">${participantList.length} orang</div>
      </div>
    </div>
  </div>

  <!-- Payment Methods -->
  ${
    accountList.length > 0
      ? `
  <div class="section">
    <div class="section-title">Metode Pembayaran Host</div>
    ${accountList
      .map(
        (acc) => `
      <div class="account-item">
        <div class="bank">${acc.bank_name}</div>
        <div class="number">${acc.account_number}</div>
        <div class="holder">${acc.account_holder}</div>
      </div>
    `,
      )
      .join("")}
  </div>
  `
      : ""
  }

  <!-- Participant Summary -->
  <div class="section">
    <div class="section-title">Ringkasan Peserta</div>
    <table>
      <thead>
        <tr>
          <th>Nama</th>
          <th class="text-right">Saldo</th>
          <th class="text-center">Status</th>
        </tr>
      </thead>
      <tbody>
        ${participantList
          .map((p) => {
            const balanceClass =
              p.balance < 0 ? "pay" : p.balance > 0 ? "recv" : "zero";
            const balanceLabel =
              p.balance < 0
                ? `Bayar ${formatRupiah(Math.abs(p.balance))}`
                : p.balance > 0
                  ? `Terima ${formatRupiah(p.balance)}`
                  : "Lunas";
            return `
          <tr>
            <td>
              ${p.name}
              ${p.is_driver ? '<span class="badge badge-driver">Supir</span>' : ""}
            </td>
            <td class="text-right ${balanceClass}">${balanceLabel}</td>
            <td class="text-center">
              ${p.balance < 0 ? "🔴 Harus Bayar" : p.balance > 0 ? "🟢 Menerima" : "✅ Lunas"}
            </td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>

  <!-- Siapa Bayar Siapa -->
  ${
    mustPay.length > 0 || willReceive.length > 0
      ? `
  <div class="section">
    <div class="section-title">Siapa Bayar ke Siapa</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div>
        <div style="font-weight:600; margin-bottom:8px; color:#dc2626;">🔴 Harus Membayar</div>
        ${mustPay
          .map(
            (p) => `
          <div style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">
            ${p.name}: <span class="pay">${formatRupiah(Math.abs(p.balance))}</span>
          </div>
        `,
          )
          .join("")}
      </div>
      <div>
        <div style="font-weight:600; margin-bottom:8px; color:#16a34a;">🟢 Akan Menerima</div>
        ${willReceive
          .map(
            (p) => `
          <div style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;">
            ${p.name}: <span class="recv">${formatRupiah(p.balance)}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    </div>
  </div>
  `
      : ""
  }

  <!-- Expense List -->
  <div class="section">
    <div class="section-title">Daftar Pengeluaran (${expenseList.filter((e) => !e.excluded).length} item)</div>
    <table>
      <thead>
        <tr>
          <th>Keterangan</th>
          <th>Dibayar oleh</th>
          <th>Tanggal</th>
          <th class="text-right">Jumlah</th>
        </tr>
      </thead>
      <tbody>
        ${expenseList
          .map(
            (e) => `
          <tr style="${e.excluded ? "opacity:0.4; text-decoration:line-through;" : ""}">
            <td>${e.description}${e.excluded ? " <em style='font-size:11px;color:#9ca3af'>(dikecualikan)</em>" : ""}</td>
            <td>${e.paid_by}</td>
            <td>${formatDate(e.created_at)}</td>
            <td class="text-right">${formatRupiah(e.amount)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="font-weight:700; padding: 10px 10px 2px; text-align:right;">Total</td>
          <td class="text-right" style="font-weight:700; padding: 10px 10px 2px;">${formatRupiah(totalExpenses)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="footer">
    Laporan dibuat otomatis oleh KBM Berkah Ceria • ${new Date().getFullYear()}
  </div>

</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Prevent caching so it's always fresh
      "Cache-Control": "no-store",
    },
  });
}
