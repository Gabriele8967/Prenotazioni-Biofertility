import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import CookieBanner from "@/components/CookieBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Biofertility - Centro di Procreazione Medicalmente Assistita",
  description: "Centro Biofertility a Roma, diretto dal Prof. Claudio Manna. Specializzati in Procreazione Medicalmente Assistita (PMA), diagnosi e terapie per l'infertilità di coppia. Prenota la tua visita online.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <CookieBanner />
      </body>
    </html>
  );
}
