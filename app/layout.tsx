import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
  fallback: ["Segoe UI", "system-ui", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Simulado UFPR",
  description:
    "Simulado interativo com questões reais dos vestibulares da UFPR (2012–2026), no formato de fase única.",
  applicationName: "Simulado UFPR",
  themeColor: "#080a0f",
};

export const viewport = {
  themeColor: "#080a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen font-sans">
        <Nav />
        <main className="anim-page mx-auto w-full max-w-6xl px-4 pb-24 pt-6">{children}</main>
      </body>
    </html>
  );
}
