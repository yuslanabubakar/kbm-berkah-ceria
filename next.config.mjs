// @ts-check
import { setupDevPlatform } from "@cloudflare/next-on-pages/next-dev";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
    // Removed: serverComponentsExternalPackages: ['pdfkit', 'iconv-lite']
    // pdfkit is a Node.js-only package and cannot run on Cloudflare's edge runtime.
    // The /api/trips/[tripId]/report route has been replaced with an edge-compatible
    // HTML print page. See app/perjalanan/[id]/report/page.tsx
  },
};

// Only run in local dev — this is a no-op during production builds
if (process.env.NODE_ENV === "development") {
  await setupDevPlatform();
}

export default nextConfig;
