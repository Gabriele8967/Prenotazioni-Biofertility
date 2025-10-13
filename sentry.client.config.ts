// This file configures the initialization of Sentry on the client (browser).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://aa5da709844667d21f95894f0a28239a@o4510183545241600.ingest.de.sentry.io/4510183558152272",

  // Ridotto in produzione per risparmiare quota (10%)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Debug solo in sviluppo
  debug: process.env.NODE_ENV === 'development',

  // Replay sessions per vedere cosa ha fatto l'utente prima dell'errore
  replaysOnErrorSampleRate: 1.0, // 100% delle sessioni con errori
  replaysSessionSampleRate: 0.1, // 10% delle sessioni normali

  integrations: [
    Sentry.replayIntegration({
      // Maschera tutti i campi di input per la privacy (GDPR compliance)
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
  ],

  // Filtra errori noti/innocui
  beforeSend(event, hint) {
    // Ignora errori di rete comuni (non sono bug del nostro codice)
    if (event.exception) {
      const error = hint.originalException;
      if (
        error instanceof Error &&
        (error.message.includes('Network request failed') ||
         error.message.includes('Failed to fetch') ||
         error.message.includes('NetworkError') ||
         error.message.includes('Load failed'))
      ) {
        return null; // Non inviare a Sentry
      }
    }

    // Maschera dati sensibili negli breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
        if (breadcrumb.data) {
          const sensitiveKeys = ['fiscalCode', 'codiceFiscale', 'phone', 'email', 'password'];
          sensitiveKeys.forEach(key => {
            if (breadcrumb.data && key in breadcrumb.data) {
              breadcrumb.data[key] = '[FILTERED]';
            }
          });
        }
        return breadcrumb;
      });
    }

    return event;
  },

  // Ignora errori noti del browser
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    'Network request failed',
    'Failed to fetch',
    'Load failed',
  ],

  // Ambiente per filtrare facilmente
  environment: process.env.NODE_ENV || 'development',
});
