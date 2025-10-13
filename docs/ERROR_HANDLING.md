# 🛡️ Sistema di Gestione Errori - Gestione Prenotazioni

## Panoramica

Il sistema implementa una gestione robusta degli errori su più livelli per garantire stabilità e affidabilità.

## 📋 Componenti Principali

### 1. **Error Handler Centralizzato** (`lib/error-handler.ts`)

Sistema centralizzato per logging, gestione e tracking errori.

#### Tipi di Errori

```typescript
enum ErrorType {
  VALIDATION = 'VALIDATION',        // Errori validazione input
  DATABASE = 'DATABASE',            // Errori database
  EXTERNAL_API = 'EXTERNAL_API',    // Errori API esterne
  AUTHENTICATION = 'AUTHENTICATION', // Errori autenticazione
  AUTHORIZATION = 'AUTHORIZATION',   // Errori autorizzazione
  NOT_FOUND = 'NOT_FOUND',          // Risorse non trovate
  RATE_LIMIT = 'RATE_LIMIT',        // Rate limiting
  FILE_UPLOAD = 'FILE_UPLOAD',      // Errori upload file
  PAYMENT = 'PAYMENT',              // Errori pagamento
  UNKNOWN = 'UNKNOWN'               // Errori sconosciuti
}
```

#### Utilizzo

```typescript
import { AppError, ErrorType, handleApiError } from '@/lib/error-handler';

// Lanciare un errore custom
throw new AppError(
  ErrorType.VALIDATION,
  'Email non valida',
  400,
  { email: 'test@example' }
);

// In una API route
export async function POST(request: NextRequest) {
  try {
    // ... logica
  } catch (error) {
    return handleApiError(
      error,
      'POST /api/endpoint',
      'Messaggio user-friendly'
    );
  }
}
```

### 2. **Error Boundaries React** (`components/ErrorBoundary.tsx`)

Catturano errori nella UI evitando crash dell'applicazione.

#### Utilizzo

```tsx
// Layout principale - cattura errori globali
<ErrorBoundary>
  <App />
</ErrorBoundary>

// Per sezioni specifiche
<SectionErrorBoundary sectionName="Calendario">
  <Calendar />
</SectionErrorBoundary>

// Custom fallback
<ErrorBoundary fallback={<CustomErrorUI />}>
  <Component />
</ErrorBoundary>
```

### 3. **API Client Robusto** (`lib/api-client.ts`)

Client HTTP con retry automatico, timeout e gestione errori.

#### Features

- ✅ Retry automatico con backoff esponenziale
- ✅ Timeout configurabile
- ✅ Gestione errori HTTP
- ✅ Cache integrata
- ✅ Request cancellation

#### Utilizzo

```typescript
import { api, useApi } from '@/lib/api-client';

// GET request
const data = await api.get('/api/services');

// POST con retry
const result = await api.post(
  '/api/bookings',
  { serviceId: '123' },
  {
    retries: 3,
    timeout: 30000,
    onRetry: (attempt, error) => {
      console.log(`Tentativo ${attempt} fallito:`, error);
    }
  }
);

// Hook React
function MyComponent() {
  const { data, loading, error, execute } = useApi();

  useEffect(() => {
    execute(() => api.get('/api/data'));
  }, []);

  if (loading) return <Loader />;
  if (error) return <Error message={error.message} />;
  return <div>{data}</div>;
}
```

### 4. **Validatori** (`lib/validators.ts`)

Sistema di validazione input utente con sanitizzazione.

#### Utilizzo

```typescript
import { Validator, validatePatientData, sanitize } from '@/lib/validators';

// Validazione fluent
const result = new Validator()
  .required(email, 'Email')
  .email(email)
  .required(phone, 'Telefono')
  .italianPhone(phone)
  .required(fiscalCode, 'Codice Fiscale')
  .fiscalCode(fiscalCode)
  .result();

if (!result.isValid) {
  console.error(result.errors);
}

// Lancia errore se non valido
new Validator()
  .required(data.name, 'Nome')
  .email(data.email)
  .throwIfInvalid();

// Schema predefinito
const validation = validatePatientData(patientData);

// Sanitizzazione
const cleanEmail = sanitize.email(email);
const cleanPhone = sanitize.phone(phone);
const cleanName = sanitize.name(name);
```

### 5. **Monitoring** (`lib/monitoring.ts`)

Sistema di monitoring, health check e alerting.

#### Health Check

```typescript
// GET /api/health
{
  "status": "healthy",
  "timestamp": "2025-10-13T12:00:00Z",
  "checks": {
    "database": { "status": "up", "responseTime": 45 },
    "api": { "status": "up" },
    "environment": { "status": "up" }
  },
  "uptime": 3600000,
  "metrics": {
    "memory": {
      "used": 125829120,
      "total": 268435456,
      "percentage": 46.9
    }
  }
}
```

#### Monitoring Performance

```typescript
import { monitorPerformance, sendAlert } from '@/lib/monitoring';

// Monitor performance
const result = await monitorPerformance(
  'createBooking',
  async () => await createBooking(data),
  1000 // warning se > 1 secondo
);

// Invia alert
await sendAlert(
  'error',
  'Database non risponde',
  { endpoint: '/api/bookings' }
);
```

## 🚨 Best Practices

### 1. Sempre usare try-catch nelle API routes

```typescript
export async function POST(request: NextRequest) {
  try {
    // Logica
  } catch (error) {
    return handleApiError(error, 'POST /api/route', 'Messaggio utente');
  }
}
```

### 2. Validare sempre l'input

```typescript
// Prima di usare i dati
const validation = validatePatientData(data);
if (!validation.isValid) {
  throw new AppError(
    ErrorType.VALIDATION,
    validation.errors.join('; '),
    400
  );
}
```

### 3. Usare Error Boundaries

```tsx
// Wrappa componenti che potrebbero crashare
<SectionErrorBoundary sectionName="ListaPrenotazioni">
  <BookingsList />
</SectionErrorBoundary>
```

### 4. Log strutturato

```typescript
import { logger } from '@/lib/error-handler';

logger.logInfo('Operazione completata', 'createBooking');
logger.logWarning('Cache miss', 'getServices');
logger.log(error, 'processPayment');
```

### 5. Gestire timeout e retry

```typescript
// API esterne con retry
const result = await retryWithBackoff(
  () => callExternalAPI(),
  3,  // max 3 tentativi
  1000,  // delay iniziale 1s
  'ExternalAPI'
);
```

## 📊 Monitoring in Produzione

### Health Check Endpoint

```bash
# Verifica salute applicazione
curl https://app.example.com/api/health

# Response codes
# 200 - healthy/degraded
# 503 - unhealthy
```

### Integrazioni Consigliate

1. **Sentry** - Error tracking e performance monitoring
2. **LogRocket** - Session replay e debugging
3. **UptimeRobot** - Monitoring uptime
4. **Slack/Discord** - Alert notifications

### Configurazione Alert

Variabili ambiente:

```env
# Alert webhook (Slack, Discord, etc.)
ALERT_WEBHOOK_URL=https://hooks.slack.com/...

# Sentry (opzionale)
SENTRY_DSN=https://...
```

## 🔧 Troubleshooting

### Errori Comuni

#### 1. Database Timeout

```typescript
// Problema
Error: Database timeout

// Soluzione
- Verifica connessione DATABASE_URL
- Aumenta pool size Prisma
- Controlla query lente
```

#### 2. Rate Limit

```typescript
// Problema
429 - Too Many Requests

// Soluzione
- Implementa exponential backoff
- Usa caching per ridurre richieste
- Verifica limiti API esterne
```

#### 3. Memory Leak

```typescript
// Prevenzione
- Usa Error Boundaries per prevenire memory leak
- Cleanup in useEffect
- Cancella richieste in-flight
```

## 📈 Metriche da Monitorare

### Performance

- Response time medio API
- Database query time
- Memory usage
- CPU usage

### Affidabilità

- Error rate (errori / richieste totali)
- Success rate
- Uptime percentage
- Failed requests by endpoint

### Qualità

- Validation errors
- Client-side errors
- API errors by type
- User-reported issues

## 🎯 Checklist Deploy

Prima del deploy in produzione:

- [ ] Tutte le API routes hanno error handling
- [ ] Error Boundaries configurati
- [ ] Health check funzionante
- [ ] Logging configurato correttamente
- [ ] Alert configurati
- [ ] Variabili ambiente verificate
- [ ] Rate limiting attivo
- [ ] Validazione input su tutti gli endpoint
- [ ] Tests error cases
- [ ] Monitoring attivo

## 📞 Supporto

Per problemi o domande:

- **Email**: supporto@biofertility.it
- **Tel**: 06-8415269
- **Docs**: Vedi `/docs` directory

---

**Ultimo aggiornamento**: 2025-10-13
**Versione**: 2.0.0
