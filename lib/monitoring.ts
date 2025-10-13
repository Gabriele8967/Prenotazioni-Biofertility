/**
 * Sistema di monitoring e health check dell'applicazione
 */

import { db } from './db';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    api: HealthCheck;
    environment: HealthCheck;
  };
  uptime: number;
}

export interface HealthCheck {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  error?: string;
  details?: any;
}

const startTime = Date.now();

/**
 * Verifica salute database
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();

  try {
    // Prova una query semplice
    await db.$queryRaw`SELECT 1`;

    const responseTime = Date.now() - start;

    // Considera degradato se lento
    if (responseTime > 1000) {
      return {
        status: 'degraded',
        responseTime,
        details: { message: 'Database risponde lentamente' }
      };
    }

    return {
      status: 'up',
      responseTime
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Verifica configurazione ambiente
 */
function checkEnvironment(): HealthCheck {
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];

  const missingVars = requiredEnvVars.filter(
    varName => !process.env[varName]
  );

  if (missingVars.length > 0) {
    return {
      status: 'down',
      error: `Variabili d'ambiente mancanti: ${missingVars.join(', ')}`,
      details: { missingVars }
    };
  }

  // Verifica variabili opzionali ma importanti
  const optionalVars = [
    'STRIPE_SECRET_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'FATTURE_IN_CLOUD_API_KEY',
  ];

  const missingOptional = optionalVars.filter(
    varName => !process.env[varName]
  );

  if (missingOptional.length > 0) {
    return {
      status: 'degraded',
      details: {
        message: 'Alcune funzionalità potrebbero non essere disponibili',
        missingOptional
      }
    };
  }

  return {
    status: 'up',
    details: { message: 'Tutte le variabili d\'ambiente sono configurate' }
  };
}

/**
 * Verifica salute API interne
 */
async function checkApi(): Promise<HealthCheck> {
  // Per ora ritorna sempre up, in futuro si possono aggiungere check specifici
  return {
    status: 'up',
    details: { message: 'API disponibili' }
  };
}

/**
 * Esegue health check completo
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const [database, api, environment] = await Promise.all([
    checkDatabase(),
    checkApi(),
    Promise.resolve(checkEnvironment())
  ]);

  const checks = { database, api, environment };

  // Determina status generale
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  const hasDown = Object.values(checks).some(c => c.status === 'down');
  const hasDegraded = Object.values(checks).some(c => c.status === 'degraded');

  if (hasDown) {
    status = 'unhealthy';
  } else if (hasDegraded) {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    checks,
    uptime: Date.now() - startTime
  };
}

/**
 * Metriche applicazione
 */
export interface ApplicationMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  requests?: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
}

/**
 * Raccoglie metriche applicazione
 */
export function getApplicationMetrics(): ApplicationMetrics {
  const memUsage = process.memoryUsage();

  return {
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    memory: {
      used: memUsage.heapUsed,
      total: memUsage.heapTotal,
      percentage: (memUsage.heapUsed / memUsage.heapTotal) * 100
    }
  };
}

/**
 * Helper per inviare alert
 * In produzione potrebbe integrare con servizi come Slack, Discord, email, ecc.
 */
export async function sendAlert(
  level: 'info' | 'warning' | 'error' | 'critical',
  message: string,
  details?: any
): Promise<void> {
  const alert = {
    level,
    message,
    details,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  };

  // Log in console (in produzione mandare a servizio esterno)
  console.error(`[ALERT] [${level.toUpperCase()}] ${message}`, details);

  // TODO: Integrare con servizio di alerting
  // - Email per errori critici
  // - Slack/Discord webhook per notifiche
  // - SMS per downtime critici
  // - Sentry per tracking errori

  if (process.env.NODE_ENV === 'production') {
    // Esempio: invia a webhook
    if (process.env.ALERT_WEBHOOK_URL) {
      try {
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      } catch (error) {
        console.error('Errore invio alert:', error);
      }
    }
  }
}

/**
 * Monitor performance di una funzione
 */
export async function monitorPerformance<T>(
  operationName: string,
  operation: () => Promise<T>,
  thresholdMs: number = 1000
): Promise<T> {
  const start = Date.now();

  try {
    const result = await operation();
    const duration = Date.now() - start;

    if (duration > thresholdMs) {
      await sendAlert(
        'warning',
        `Operazione lenta: ${operationName}`,
        { duration, threshold: thresholdMs }
      );
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    await sendAlert(
      'error',
      `Errore in operazione: ${operationName}`,
      {
        duration,
        error: error instanceof Error ? error.message : String(error)
      }
    );

    throw error;
  }
}

/**
 * Helper per graceful shutdown
 */
export async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n${signal} ricevuto, avvio shutdown graceful...`);

  await sendAlert('info', 'Applicazione in shutdown', { signal });

  try {
    // Chiudi connessioni database
    await db.$disconnect();
    console.log('✓ Database disconnesso');

    // Altre operazioni di cleanup...
    // - Chiudi code
    // - Completa richieste pendenti
    // - Salva stato

    console.log('✓ Shutdown completato con successo');
    process.exit(0);
  } catch (error) {
    console.error('✗ Errore durante shutdown:', error);
    process.exit(1);
  }
}

// Setup signal handlers per graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}
