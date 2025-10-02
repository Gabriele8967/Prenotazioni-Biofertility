"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { X } from "lucide-react";

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Controlla se l'utente ha già accettato i cookies
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookieConsent", "accepted");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setShowBanner(false);
  };

  const rejectCookies = () => {
    localStorage.setItem("cookieConsent", "rejected");
    localStorage.setItem("cookieConsentDate", new Date().toISOString());
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-gray-200 shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex-1 text-sm text-gray-700">
            <p className="font-semibold mb-1">🍪 Utilizzo dei Cookie</p>
            <p>
              Questo sito utilizza solo cookie tecnici strettamente necessari per il funzionamento del sistema di prenotazione.
              Non utilizziamo cookie di profilazione o tracciamento.{" "}
              <Link href="/privacy" className="text-blue-600 hover:underline font-medium">
                Leggi la Privacy Policy
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={rejectCookies}
              className="whitespace-nowrap"
            >
              Rifiuta
            </Button>
            <Button
              size="sm"
              onClick={acceptCookies}
              className="whitespace-nowrap"
            >
              Accetta
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
