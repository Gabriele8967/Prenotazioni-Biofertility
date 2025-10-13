// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://aa5da709844667d21f95894f0a28239a@o4510183545241600.ingest.de.sentry.io/4510183558152272",

  // Ridotto in produzione per risparmiare quota (10% delle richieste)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Debug solo in sviluppo
  debug: process.env.NODE_ENV === 'development',

  // Ambiente per filtrare facilmente
  environment: process.env.NODE_ENV || 'development',

  // Filtra informazioni sensibili prima di inviarle a Sentry
  beforeSend(event, hint) {
    // Rimuovi cookies (possono contenere sessioni)
    if (event.request) {
      delete event.request.cookies;

      // Maschera parametri sensibili
      if (event.request.data) {
        const sensitiveFields = [
          'password',
          'token',
          'fiscalCode',
          'codiceFiscale',
          'numeroDocumento',
          'documentoFrente',
          'documentoRetro',
          'consentSignature',
          'ipAddress',
        ];

        sensitiveFields.forEach(field => {
          if (event.request?.data && field in event.request.data) {
            event.request.data[field] = '[FILTERED]';
          }
        });
      }
    }

    // Maschera dati personali negli extra
    if (event.extra) {
      const sensitiveKeys = ['fiscalCode', 'phone', 'email', 'indirizzo'];
      sensitiveKeys.forEach(key => {
        if (event.extra && key in event.extra) {
          event.extra[key] = '[FILTERED]';
        }
      });
    }

    return event;
  },

  // Ignora errori noti/innocui
  ignoreErrors: [
    // Errori di rete comuni
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    // Errori del browser
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],
});
