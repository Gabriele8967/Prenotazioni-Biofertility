// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://aa5da709844667d21f95894f0a28239a@o4510183545241600.ingest.de.sentry.io/4510183558152272",

  // Ridotto in produzione per risparmiare quota (10%)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Debug solo in sviluppo
  debug: process.env.NODE_ENV === 'development',

  // Ambiente per filtrare facilmente
  environment: process.env.NODE_ENV || 'development',

  // Ignora errori noti
  ignoreErrors: [
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
  ],
});
