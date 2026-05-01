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

import { getSupabaseServiceRole } from "@/lib/supabaseServer";
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
  display_name: string;
  balance_idr: number;
  total_paid: number;
  total_share: number;
}

interface Expense {
  title: string;
  amount_idr: number;
  is_excluded: boolean;
  created_at: string;
  paid_by_name: string;
  expense_type?: string | null;
  splits?: Array<{
    participant_name: string;
    share_amount_override: number | null;
    share_weight: number;
  }>;
}

interface PaymentAccount {
  label: string;
  provider: string | null;
  account_name: string;
  account_number: string;
}

interface Trip {
  id: string;
  name: string;
  origin_city: string | null;
  destination_city: string | null;
  start_date: string | null;
  end_date: string | null;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } },
) {
  const supabase = getSupabaseServiceRole();

  const { tripId } = params;

  // ── Fetch trip ──────────────────────────────────────────────────────────────
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id, name, origin_city, destination_city, start_date, end_date")
    .eq("id", tripId)
    .single();

  if (tripError || !trip) {
    return NextResponse.json(
      {
        message: "Trip tidak ditemukan",
        tripId,
        error: tripError?.message,
      },
      { status: 404 },
    );
  }

  // ── Fetch participants with balances ────────────────────────────────────────
  const { data: participants } = await supabase
    .from("trip_balances")
    .select("display_name, balance_idr, total_paid, total_share")
    .eq("trip_id", tripId)
    .order("balance_idr");

  // ── Fetch expenses with paid_by participant name ────────────────────────────
  const { data: expenses } = await supabase
    .from("expenses")
    .select(
      "title, amount_idr, expense_type, is_excluded, created_at, paid_by:participants!paid_by(display_name), expense_splits(share_weight, share_amount_override, participants(display_name))",
    )
    .eq("trip_id", tripId)
    .order("created_at");

  // ── Fetch payment accounts attached to trip ─────────────────────────────────
  const { data: paymentAccounts } = await supabase
    .from("trip_payment_accounts")
    .select(
      "payment_account:user_payment_accounts(label, provider, account_name, account_number)",
    )
    .eq("trip_id", tripId);

  const participantList: Participant[] = (participants ?? []).map((p: any) => ({
    display_name: p.display_name,
    balance_idr: Number(p.balance_idr ?? 0),
    total_paid: Number(p.total_paid ?? 0),
    total_share: Number(p.total_share ?? 0),
  }));
  const expenseList = (expenses ?? []).map((e: any) => ({
    title: e.title,
    amount_idr: Number(e.amount_idr),
    expense_type: e.expense_type,
    is_excluded: e.is_excluded,
    created_at: e.created_at,
    paid_by_name: e.paid_by?.display_name ?? "—",
    splits: (e.expense_splits ?? []).map((split: any) => ({
      participant_name: split.participants?.display_name ?? "Tanpa nama",
      share_amount_override:
        split.share_amount_override != null
          ? Number(split.share_amount_override)
          : null,
      share_weight: Number(split.share_weight ?? 0),
    })),
  })) as Expense[];
  const accountList: PaymentAccount[] = (paymentAccounts ?? [])
    .map((a: any) => a.payment_account)
    .filter(Boolean);

  const totalExpenses = expenseList
    .filter((e) => !e.is_excluded)
    .reduce((sum, e) => sum + e.amount_idr, 0);

  const mustPay = participantList.filter((p) => p.balance_idr < 0);
  const willReceive = participantList.filter((p) => p.balance_idr > 0);

  // ── Build HTML ──────────────────────────────────────────────────────────────
  const perPersonShare =
    participantList.length > 0 ? totalExpenses / participantList.length : 0;

  const renderSplitRows = (expense: Expense) => {
    if (!expense.splits?.length) {
      return "";
    }

    const totalWeight = expense.splits.reduce(
      (sum, split) => sum + split.share_weight,
      0,
    );

    return `
      <div style="margin-top:4px;padding-left:12px;color:#6b7280;font-size:10px;display:grid;gap:2px;">
        ${expense.splits
          .map((split) => {
            const amount =
              split.share_amount_override != null
                ? split.share_amount_override
                : totalWeight > 0
                  ? (expense.amount_idr * split.share_weight) / totalWeight
                  : 0;

            return `<div style="display:flex;justify-content:space-between;gap:12px;">
              <span>${split.participant_name}</span>
              <span style="font-weight:600;color:#374151;">${formatRupiah(amount)}</span>
            </div>`;
          })
          .join("")}
      </div>
    `;
  };

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Laporan — ${trip.name}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1f2937;
      background: #fff;
      padding: 24px 32px;
      max-width: 780px;
      margin: 0 auto;
    }

    /* ── No-print ── */
    .no-print { margin-bottom: 20px; display: flex; justify-content: flex-end; gap: 8px; }
    .no-print button {
      background: #2563eb; color: #fff; border: none;
      padding: 8px 20px; border-radius: 6px; font-size: 13px;
      cursor: pointer; font-weight: 600;
    }
    .no-print button:hover { background: #1d4ed8; }
    @media print { .no-print { display: none !important; } body { padding: 0; font-size: 11px; } }

    /* ── Header ── */
    .report-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      border-bottom: 3px solid #2563eb; padding-bottom: 14px; margin-bottom: 20px;
    }
    .report-header h1 { font-size: 20px; font-weight: 800; color: #111827; margin-bottom: 4px; }
    .report-header .route { font-size: 13px; color: #2563eb; font-weight: 600; }
    .report-header .dates { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .report-header .brand { text-align: right; font-size: 10px; color: #9ca3af; }
    .report-header .brand strong { color: #2563eb; font-size: 11px; }

    /* ── Stats row ── */
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
    .stat {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 12px 14px; text-align: center;
    }
    .stat .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; font-weight: 600; }
    .stat .val { font-size: 17px; font-weight: 800; color: #111827; margin-top: 2px; }
    .stat .val.blue { color: #2563eb; }

    /* ── Section ── */
    .section { margin-bottom: 18px; }
    .section-title {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.08em; color: #2563eb; margin-bottom: 8px;
      padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;
    }

    /* ── Table ── */
    table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
    th {
      text-align: left; padding: 6px 8px; background: #f1f5f9;
      font-weight: 700; color: #374151; font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.04em;
      border-bottom: 2px solid #e2e8f0;
    }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    .pay { color: #dc2626; font-weight: 700; }
    .recv { color: #059669; font-weight: 700; }
    .zero { color: #9ca3af; }

    /* ── Payment accounts ── */
    .accounts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .acc-card {
      border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;
      display: flex; flex-direction: column; gap: 2px;
    }
    .acc-card .provider { font-weight: 700; font-size: 11px; color: #374151; }
    .acc-card .accnum { font-family: 'SF Mono', 'Cascadia Code', monospace; font-size: 13px; color: #1d4ed8; font-weight: 600; letter-spacing: 0.02em; }
    .acc-card .holder { font-size: 10px; color: #6b7280; }

    /* ── Settlement grid ── */
    .settle-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .settle-col h4 { font-size: 11px; font-weight: 700; margin-bottom: 6px; }
    .settle-col h4.red { color: #dc2626; }
    .settle-col h4.green { color: #059669; }
    .settle-item { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f3f4f6; font-size: 11.5px; }
    .settle-item:last-child { border-bottom: none; }

    /* ── Status pill ── */
    .pill {
      display: inline-block; font-size: 9px; font-weight: 700;
      padding: 2px 8px; border-radius: 99px; text-transform: uppercase; letter-spacing: 0.03em;
    }
    .pill-red { background: #fef2f2; color: #dc2626; }
    .pill-green { background: #f0fdf4; color: #059669; }
    .pill-gray { background: #f3f4f6; color: #6b7280; }

    /* ── Footer ── */
    .footer { margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 8px; font-size: 10px; color: #9ca3af; text-align: center; }

    /* ── Print ── */
    @media print {
      .section { page-break-inside: avoid; }
      .stat { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .pill { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <div class="no-print">
    <button onclick="window.print()">Simpan sebagai PDF</button>
  </div>

  <!-- Header -->
  <div class="report-header">
    <div>
      <h1>${trip.name}</h1>
      ${trip.origin_city || trip.destination_city ? `<div class="route">${trip.origin_city ?? ""}  →  ${trip.destination_city ?? ""}</div>` : ""}
      <div class="dates">${formatDate(trip.start_date)}${trip.end_date ? ` – ${formatDate(trip.end_date)}` : ""}</div>
    </div>
    <div class="brand">
      <strong>KBM Berkah Ceria</strong><br/>
      Dicetak ${formatDate(new Date().toISOString())}
    </div>
  </div>

  <!-- Stats -->
  <div class="stats">
    <div class="stat">
      <div class="label">Total Pengeluaran</div>
      <div class="val blue">${formatRupiah(totalExpenses)}</div>
    </div>
    <div class="stat">
      <div class="label">Per Orang (rata-rata)</div>
      <div class="val">${formatRupiah(perPersonShare)}</div>
    </div>
    <div class="stat">
      <div class="label">Peserta</div>
      <div class="val">${participantList.length}</div>
    </div>
  </div>

  ${
    accountList.length > 0
      ? `
  <!-- Payment Methods -->
  <div class="section">
    <div class="section-title">Metode Pembayaran</div>
    <div class="accounts-grid">
      ${accountList
        .map(
          (acc) => `
        <div class="acc-card">
          <div class="provider">${acc.provider ?? acc.label}</div>
          <div class="accnum">${acc.account_number}</div>
          <div class="holder">a.n. ${acc.account_name}</div>
        </div>
      `,
        )
        .join("")}
    </div>
  </div>
  `
      : ""
  }

  <!-- Participant Balances -->
  <div class="section">
    <div class="section-title">Saldo Peserta</div>
    <table>
      <thead>
        <tr>
          <th style="width:30%">Nama</th>
          <th class="text-right" style="width:18%">Biaya</th>
          <th class="text-right" style="width:18%">Talangan</th>
          <th class="text-right" style="width:20%">Saldo</th>
          <th class="text-center" style="width:14%">Status</th>
        </tr>
      </thead>
      <tbody>
        ${participantList
          .map((p) => {
            const bal = Number(p.balance_idr);
            const cls = bal < 0 ? "pay" : bal > 0 ? "recv" : "zero";
            const label =
              bal < 0
                ? formatRupiah(Math.abs(bal))
                : bal > 0
                  ? formatRupiah(bal)
                  : "–";
            const prefix = bal < 0 ? "−" : bal > 0 ? "+" : "";
            const pillCls =
              bal < 0 ? "pill-red" : bal > 0 ? "pill-green" : "pill-gray";
            const pillText = bal < 0 ? "Bayar" : bal > 0 ? "Terima" : "Lunas";
            return `<tr>
            <td>${p.display_name}</td>
            <td class="text-right">${formatRupiah(p.total_share)}</td>
            <td class="text-right">${formatRupiah(p.total_paid)}</td>
            <td class="text-right ${cls}">${prefix} ${label}</td>
            <td class="text-center"><span class="pill ${pillCls}">${pillText}</span></td>
          </tr>`;
          })
          .join("")}
      </tbody>
    </table>
  </div>

  ${
    mustPay.length > 0 || willReceive.length > 0
      ? `
  <!-- Settlement -->
  <div class="section">
    <div class="section-title">Siapa Bayar ke Siapa</div>
    <div class="settle-grid">
      <div class="settle-col">
        <h4 class="red">Harus Membayar</h4>
        ${mustPay
          .map(
            (p) => `
          <div class="settle-item">
            <span>${p.display_name}</span>
            <span class="pay">${formatRupiah(Math.abs(Number(p.balance_idr)))}</span>
          </div>
        `,
          )
          .join("")}
      </div>
      <div class="settle-col">
        <h4 class="green">Akan Menerima</h4>
        ${willReceive
          .map(
            (p) => `
          <div class="settle-item">
            <span>${p.display_name}</span>
            <span class="recv">${formatRupiah(Number(p.balance_idr))}</span>
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

  <!-- Expenses -->
  <div class="section">
    <div class="section-title">Daftar Pengeluaran (${expenseList.filter((e) => !e.is_excluded).length} item)</div>
    <table>
      <thead>
        <tr><th>Keterangan</th><th>Dibayar oleh</th><th class="text-right">Jumlah</th></tr>
      </thead>
      <tbody>
        ${expenseList
          .map(
            (e) => `
          <tr${e.is_excluded ? ' style="opacity:0.35;text-decoration:line-through"' : ""}>
            <td>
              ${e.title}${e.expense_type === "makan" ? ' <span style="font-size:9px;color:#b45309;font-weight:700">(makan)</span>' : ""}${e.is_excluded ? ' <span style="font-size:9px;color:#9ca3af">(dikecualikan)</span>' : ""}
              ${renderSplitRows(e)}
            </td>
            <td>${e.paid_by_name}</td>
            <td class="text-right">${formatRupiah(e.amount_idr)}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr style="border-top:2px solid #e2e8f0">
          <td colspan="3" style="font-weight:800;text-align:right;padding:8px">Total</td>
          <td class="text-right" style="font-weight:800;padding:8px;color:#2563eb">${formatRupiah(totalExpenses)}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="footer">KBM Berkah Ceria • Laporan otomatis • ${new Date().getFullYear()}</div>

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
