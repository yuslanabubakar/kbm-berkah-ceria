import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "KBM Berkah Ceria",
  description: "Catat dan bagi biaya perjalanan pakai Rupiah dengan mudah"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased text-slate-900">
        <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-lg font-semibold text-brand-blue">
              KBM Berkah Ceria
            </Link>
            <div className="flex gap-4 text-sm font-medium">
              <Link href="/" className="hover:text-brand-coral">
                Beranda
              </Link>
              <Link href="/ringkasan" className="hover:text-brand-coral">
                Ringkasan
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
