import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "KBM Berkah Ceria",
  description: "Catat dan bagi biaya perjalanan pakai Rupiah dengan mudah",
  keywords: ["perjalanan", "split bill", "biaya bersama", "rupiah"],
  openGraph: {
    title: "KBM Berkah Ceria",
    description: "Catat dan bagi biaya perjalanan pakai Rupiah dengan mudah",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          <ToastProvider>
            <Navbar />
            <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
              {children}
            </main>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
