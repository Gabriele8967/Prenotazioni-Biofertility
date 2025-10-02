"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminSettingsPage() {
  const [paymentLink, setPaymentLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const res = await fetch("/api/admin/settings");
    const data = await res.json();
    setPaymentLink(data.payment_link || "");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "payment_link",
          value: paymentLink,
        }),
      });

      if (res.ok) {
        setMessage("Impostazioni salvate con successo!");
      } else {
        setMessage("Errore nel salvataggio");
      }
    } catch (error) {
      setMessage("Errore nel salvataggio");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Impostazioni</h1>
          <Link href="/admin/dashboard">
            <Button variant="outline">← Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Link di Pagamento</CardTitle>
            <CardDescription>
              Inserisci il link dove i pazienti verranno indirizzati per completare il pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <Label>URL Pagamento</Label>
                <Input
                  type="url"
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  placeholder="https://your-payment-provider.com/pay"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Questo link verrà inviato ai pazienti dopo la prenotazione
                </p>
              </div>

              {message && (
                <p className={`text-sm ${message.includes("successo") ? "text-green-600" : "text-red-600"}`}>
                  {message}
                </p>
              )}

              <Button type="submit" disabled={saving}>
                {saving ? "Salvataggio..." : "Salva Impostazioni"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Google Calendar</CardTitle>
            <CardDescription>
              Configurazione per l&apos;integrazione con Google Calendar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              Le credenziali Google Calendar sono configurate nelle variabili d&apos;ambiente:
            </p>
            <ul className="text-sm space-y-1 list-disc list-inside text-gray-600">
              <li>GOOGLE_CLIENT_ID</li>
              <li>GOOGLE_CLIENT_SECRET</li>
              <li>GOOGLE_CALENDAR_ID</li>
            </ul>
            <p className="text-xs text-gray-500 mt-4">
              Per modificare queste impostazioni, aggiorna il file .env e riavvia l&apos;applicazione.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
