"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, AlertCircle } from "lucide-react";

interface GoogleCalendarConnectProps {
  isConnected: boolean;
}

export function GoogleCalendarConnect({ isConnected }: GoogleCalendarConnectProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Controlla messaggi dal callback URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleAuth = params.get('google_auth');
    const error = params.get('error');

    if (googleAuth === 'success') {
      setMessage({ type: 'success', text: 'Google Calendar connesso con successo!' });
      // Rimuovi il parametro dall'URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (error) {
      setMessage({ type: 'error', text: `Errore: ${error}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/staff/auth/google');
      const data = await response.json();

      if (data.authUrl) {
        // Redirect a Google per autenticazione
        window.location.href = data.authUrl;
      } else {
        setMessage({ type: 'error', text: 'Errore nella generazione del link di autenticazione' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore di connessione. Riprova.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <CardTitle>Google Calendar</CardTitle>
        </div>
        <CardDescription>
          Connetti il tuo account Google per sincronizzare automaticamente gli appuntamenti
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div
            className={`p-4 rounded-lg flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            <span className="text-sm font-medium">
              {isConnected ? 'Connesso' : 'Non connesso'}
            </span>
          </div>

          {!isConnected && (
            <Button onClick={handleConnect} disabled={loading}>
              {loading ? 'Connessione in corso...' : 'Connetti Google Calendar'}
            </Button>
          )}

          {isConnected && (
            <Button onClick={handleConnect} variant="outline" disabled={loading}>
              {loading ? 'Riconnessione in corso...' : 'Riconnetti'}
            </Button>
          )}
        </div>

        {isConnected && (
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <p className="font-medium mb-1">✅ Sincronizzazione attiva</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Gli orari disponibili vengono letti dal tuo calendario Google</li>
              <li>Le prenotazioni vengono create automaticamente sul tuo calendario</li>
              <li>I pazienti ricevono inviti via email</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
