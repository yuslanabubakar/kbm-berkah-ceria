# Migration Guide: Vercel → Cloudflare Pages

## kbm-berkah-ceria

Vercel tetap aktif selama proses ini. Tidak ada downtime.

---

## STEP 1 — Install dependencies

```bash
pnpm add -D @cloudflare/next-on-pages wrangler
```

---

## STEP 2 — Copy config files into your repo root

Replace/add these files (all provided alongside this guide):

| File                                     | Action                                            |
| ---------------------------------------- | ------------------------------------------------- |
| `wrangler.toml`                          | **New file** — add to repo root                   |
| `next.config.mjs`                        | **Replace** existing file                         |
| `app/api/trips/[tripId]/report/route.ts` | **Replace** existing file (see `report-route.ts`) |

---

## STEP 3 — Update package.json build script

Change the `build` script:

```json
"scripts": {
  "build": "next build && npx @cloudflare/next-on-pages",
  ...
}
```

---

## STEP 4 — Remove pdfkit and iconv-lite

These packages are Node.js-only and will break the edge build.
The new report route doesn't need them.

```bash
pnpm remove pdfkit iconv-lite
pnpm remove @types/pdfkit
```

---

## STEP 5 — Add .dev.vars for local dev (optional but recommended)

Create `.dev.vars` in repo root (already gitignored by default via .gitignore):

```
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

This is the Cloudflare equivalent of `.env.local` when using `wrangler dev`.

---

## STEP 6 — Test the build locally

```bash
pnpm build
```

If the build succeeds with no errors, you're ready for Cloudflare.

---

## STEP 7 — Deploy to Cloudflare Pages

1. Go to https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Pages**
2. Connect to GitHub → select `kbm-berkah-ceria`
3. Set build settings:
   - **Framework preset**: None (custom)
   - **Build command**: `pnpm run build`
   - **Build output directory**: `.vercel/output/static`
4. Add environment variables (same as your Vercel `.env`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` → set to `https://kbm-berkah-ceria.pages.dev` (temporarily)
5. Click **Save and Deploy**

---

## STEP 8 — Add Cloudflare domain to Supabase + Google OAuth

In Supabase Dashboard → Authentication → URL Configuration:

- Add to **Redirect URLs**: `https://kbm-berkah-ceria.pages.dev/auth/callback`

In Google Cloud Console → OAuth 2.0 Client → Authorized redirect URIs:

- Add: `https://kbm-berkah-ceria.pages.dev/auth/callback`

---

## STEP 9 — Test everything on Cloudflare Pages URL

Open `https://kbm-berkah-ceria.pages.dev` and verify:

- [ ] Login with Google works
- [ ] Dashboard loads
- [ ] Create trip works
- [ ] Add expense works
- [ ] PDF report opens (should now open as a print-ready HTML page, click "Simpan sebagai PDF")
- [ ] Trip sharing works
- [ ] Balance calculations are correct

---

## STEP 10 — Switch production traffic (when ready)

1. In Cloudflare Pages → your project → **Custom domains** → add your domain
2. Update DNS to point to Cloudflare Pages
3. Update `NEXT_PUBLIC_APP_URL` env var to your custom domain
4. Update Supabase + Google OAuth redirect URLs to include your custom domain
5. In Vercel → your project → **Domains** → remove the custom domain

Vercel will keep building and deploying to its `.vercel.app` URL as a free standby.
Disconnect Vercel whenever you're fully confident.

---

## What changed in the PDF report

**Before (pdfkit — Node.js only):**

- `GET /api/trips/:tripId/report` → returns a binary PDF stream

**After (edge-compatible HTML):**

- `GET /api/trips/:tripId/report` → returns a fully-styled HTML page
- User clicks **"Simpan sebagai PDF"** button → browser prints to PDF
- Result is identical quality, no new dependencies, works on any platform

If you want the download to be automatic (no button click), you can add `window.print()`
to run on page load in a `<script>` tag. Or you can call the route URL from a client
component that opens it in a new tab:

```tsx
// In your trip detail page
<a href={`/api/trips/${tripId}/report`} target="_blank" rel="noreferrer">
  Download Laporan PDF
</a>
```

---

## Summary of all code changes

| What                       | Severity            | Files changed                            |
| -------------------------- | ------------------- | ---------------------------------------- |
| Install adapter + wrangler | Config only         | `package.json`, new `wrangler.toml`      |
| Update next.config.mjs     | 3 lines removed     | `next.config.mjs`                        |
| Remove pdfkit              | Package removal     | `package.json`                           |
| Replace PDF route          | ~50 lines rewritten | `app/api/trips/[tripId]/report/route.ts` |

Total: **1 file replaced, 2 files modified, 1 file added.**
