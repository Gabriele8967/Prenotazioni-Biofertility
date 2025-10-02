# 🔒 Documentazione Sicurezza - Sistema Prenotazioni Biofertility

## Panoramica

Questo documento descrive le misure di sicurezza implementate nel sistema di prenotazione del Centro Medico Biofertility, conformemente alle normative italiane ed europee per i sistemi sanitari.

---

## 🛡️ Misure di Sicurezza Implementate

### 1. **Rate Limiting (Anti-DDoS e Anti-Brute-Force)**

#### 1.1 Rate Limiting Login
- **Limite**: 5 tentativi ogni 15 minuti per email/IP
- **Penalità**: Tempo di ban raddoppiato dopo superamento limite
- **Implementazione**: `checkLoginRateLimit()` in `lib/security.ts`
- **Endpoint protetti**: `/api/login`, autenticazione NextAuth

#### 1.2 Rate Limiting Prenotazioni
- **Limite**: 3 prenotazioni per ora per IP
- **Scopo**: Prevenire spam e prenotazioni massive
- **Implementazione**: `checkBookingRateLimit()` in `lib/security.ts`
- **Endpoint protetti**: `/api/bookings` (POST)

#### 1.3 Rate Limiting API Generiche
- **Limite**: 100 richieste al minuto per IP
- **Scopo**: Protezione da abuso API
- **Implementazione**: `checkAPIRateLimit()` in `lib/security.ts`
- **Endpoint protetti**: `/api/services`, altre API pubbliche

**Funzionalità avanzate**:
- Cleanup automatico ogni 5 minuti per liberare memoria
- Blocco permanente per IP che superano ripetutamente i limiti
- Log di attività sospette

---

### 2. **Validazione e Sanitizzazione Input**

#### 2.1 Validazione Email (RFC 5322)
```typescript
isValidEmail(email: string): boolean
```
- Verifica formato email secondo standard RFC 5322
- Limita lunghezza a 254 caratteri
- Impedisce email malformate

#### 2.2 Validazione Telefono Italiano
```typescript
isValidItalianPhone(phone: string): boolean
```
- Accetta formati: `+39...`, `0039...`, numeri fissi e mobili italiani
- Range: 6-13 cifre
- Rimuove automaticamente spazi, trattini, parentesi

#### 2.3 Sanitizzazione Input (Anti-XSS)
```typescript
sanitizeInput(input: string): string
```
Rimuove:
- Tag HTML (`<`, `>`)
- `javascript:` protocol
- Event handlers (`onclick`, `onerror`, ecc.)
- `eval()` calls
- `<script>` tags
- Limita lunghezza a 1000 caratteri

**Campi sanitizzati**:
- Nome paziente
- Email
- Telefono
- Note prenotazione

---

### 3. **Protezione da SQL Injection**

✅ **Sistema naturalmente protetto grazie a Prisma ORM**

Prisma utilizza:
- **Prepared statements** automatici
- **Query parametrizzate** per tutte le operazioni
- **Type-safety** a livello TypeScript

Esempi di query sicure:
```typescript
// ✅ SICURO - Prisma usa prepared statements
await db.user.findUnique({
  where: { email: sanitizedEmail }
});

// ✅ SICURO - Query parametrizzata
await db.booking.create({
  data: { patientId, serviceId, startTime }
});
```

**Non viene mai usato**:
- ❌ Raw SQL non parametrizzato
- ❌ String concatenation in query
- ❌ `db.$executeRaw()` senza parametri

---

### 4. **Autenticazione e Password**

#### 4.1 Hashing Password
- **Algoritmo**: bcrypt (industry standard)
- **Rounds**: 10 (default bcryptjs)
- **Salt**: Generato automaticamente per ogni password

#### 4.2 Password Strength Checker
```typescript
checkPasswordStrength(password: string)
```

Verifica requisiti:
- ✅ Lunghezza minima 8 caratteri (consigliato 12+)
- ✅ Almeno una lettera minuscola
- ✅ Almeno una lettera maiuscola
- ✅ Almeno un numero
- ✅ Almeno un carattere speciale
- ❌ Blocca pattern comuni (`123`, `password`, `admin`, ecc.)

**Score**: 0-100 (minimo 70 per password forte)

#### 4.3 Sessioni
- **Strategia**: JWT (JSON Web Tokens)
- **Provider**: NextAuth.js v5
- **Storage**: Cookie HTTP-only
- **Timeout**: Gestito automaticamente da NextAuth

---

### 5. **Security Headers HTTP**

Configurati in `next.config.ts`:

#### 5.1 Strict-Transport-Security (HSTS)
```
max-age=63072000; includeSubDomains; preload
```
- Forza HTTPS per 2 anni
- Include tutti i sottodomini
- Preload list Google

#### 5.2 Content-Security-Policy (CSP)
```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://accounts.google.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
connect-src 'self' https://accounts.google.com https://www.googleapis.com;
frame-src 'self' https://accounts.google.com;
object-src 'none';
base-uri 'self';
form-action 'self';
upgrade-insecure-requests;
```

**Protezioni**:
- Blocca script da domini non autorizzati
- Previene clickjacking
- Forza upgrade a HTTPS

#### 5.3 Altri Headers
- `X-Content-Type-Options: nosniff` - Previene MIME sniffing
- `X-Frame-Options: SAMEORIGIN` - Previene clickjacking
- `X-XSS-Protection: 1; mode=block` - Blocca XSS reflected
- `Referrer-Policy: origin-when-cross-origin` - Limita info nei referrer
- `Permissions-Policy` - Disabilita API sensibili (camera, mic, geolocation)

#### 5.4 Altri Headers di Sicurezza
- `X-DNS-Prefetch-Control: on` - Ottimizza performance
- `poweredByHeader: false` - Nasconde versione Next.js

---

### 6. **Firma Digitale e Audit**

#### 6.1 Firma Digitale Consensi (CAD D.Lgs. 82/2005)
```typescript
// Generazione firma SHA-256
const consentSignature = crypto
  .createHash("sha256")
  .update(`${email}${timestamp}${privacy}${medical}${informed}${terms}`)
  .digest("hex");
```

**Campi tracciati**:
- Email paziente
- Timestamp consenso (ISO 8601)
- Privacy GDPR
- Consenso dati sanitari (Art. 9 GDPR)
- Consenso informato (L. 219/2017)
- Termini e condizioni

**Storage**:
- Hash SHA-256 (64 caratteri esadecimali)
- Salvato in `User.consentSignature`
- Timestamp salvati in campi dedicati

#### 6.2 Tracking IP e Audit
Ogni operazione critica traccia:
- IP address (`x-forwarded-for`, `x-real-ip`, `cf-connecting-ip`)
- Timestamp
- User agent (future implementation)

**Campi database**:
- `User.ipAddress` - Ultimo IP di accesso
- `User.lastLogin` - Ultimo login
- `AuditLog` - Log completo operazioni (future full implementation)

---

### 7. **Logging Attività Sospette**

```typescript
logSuspiciousActivity({
  ip: string,
  endpoint: string,
  reason: string,
  timestamp: Date
})
```

**Eventi loggati**:
- ❌ Rate limit superato
- ❌ Email non valida
- ❌ Telefono non valido
- ❌ Login fallito
- ❌ Password errata
- ❌ Tentativi brute-force

**Output**:
- Console log (sviluppo)
- Ready per integrazione con Sentry/DataDog (produzione)

---

### 8. **IP Blocking**

```typescript
blockIP(ip: string, durationMs = 24h)
isIPBlocked(ip: string): boolean
```

**Funzionalità**:
- Blocco temporaneo IP (default 24h)
- Auto-cleanup dopo scadenza
- Integrazione con rate limiting

**Uso**:
- Blocco manuale IP malevoli
- Blocco automatico dopo attacchi rilevati

---

## 🏥 Conformità Normativa Italiana

### GDPR (Regolamento UE 2016/679)

#### Art. 9 - Trattamento Dati Sanitari
✅ **Consenso esplicito** implementato con:
- Checkbox obbligatorio separato
- Testo chiaro e comprensibile
- Timestamp registrato (`medicalConsentAt`)
- Firma digitale SHA-256

#### Diritti dell'Interessato (Art. 15-22)
✅ Implementati:
- Accesso ai dati (dashboard paziente)
- Rettifica (aggiornamento profilo)
- Cancellazione (soft delete con audit)
- Portabilità (export JSON future)

### L. 219/2017 - Consenso Informato
✅ **Documento completo** disponibile:
- `/app/consenso-informato/page.tsx`
- Checkbox obbligatorio nel form prenotazione
- Timestamp registrato (`informedConsentAt`)

### CAD D.Lgs. 82/2005 - Firma Digitale
✅ **Firma digitale valida**:
- SHA-256 hash
- Timestamp ISO 8601
- Dati immutabili
- Tracciabilità completa

---

## 🔐 Best Practices Implementate

### 1. Defense in Depth
- ✅ Multipli livelli di sicurezza
- ✅ Rate limiting + validazione input + sanitizzazione
- ✅ Autenticazione + autorizzazione + audit

### 2. Least Privilege
- ✅ Ruoli separati (ADMIN, STAFF, PATIENT)
- ✅ Middleware per protezione route
- ✅ API endpoint per ruolo specifico

### 3. Secure by Default
- ✅ HTTPS obbligatorio (HSTS)
- ✅ Cookie HTTP-only
- ✅ CSRF protection (NextAuth)
- ✅ Headers sicurezza configurati

### 4. Fail Securely
- ✅ Errori generici verso client ("Credenziali non valide")
- ✅ Log dettagliati server-side
- ✅ Rate limiting con blocco progressivo

### 5. Don't Trust User Input
- ✅ Validazione rigorosa tutti i campi
- ✅ Sanitizzazione anti-XSS
- ✅ Type checking TypeScript
- ✅ Prisma ORM (prepared statements)

---

## 📊 Monitoraggio e Alerting

### Attuale
- ✅ Console logging attività sospette
- ✅ Errori loggati con `console.error()`

### Raccomandato per Produzione
- 🔜 Sentry per error tracking
- 🔜 DataDog/New Relic per performance monitoring
- 🔜 CloudFlare per DDoS protection
- 🔜 Alert email per tentativi brute-force

---

## 🚀 Deployment Sicuro

### Vercel (Attuale)
- ✅ HTTPS automatico
- ✅ DDoS protection base
- ✅ Edge network globale
- ✅ Backup automatico

### Environment Variables
**Mai committare** in Git:
- ❌ `DATABASE_URL`
- ❌ `NEXTAUTH_SECRET`
- ❌ `GOOGLE_CLIENT_ID`
- ❌ `GOOGLE_CLIENT_SECRET`
- ❌ `GOOGLE_PRIVATE_KEY`

✅ Configurate in Vercel dashboard

---

## 🧪 Testing Sicurezza

### Checklist Pre-Produzione
- [ ] Test penetration SQL injection
- [ ] Test XSS su tutti i form
- [ ] Test brute-force login
- [ ] Test rate limiting API
- [ ] Verifica headers sicurezza (securityheaders.com)
- [ ] Scan vulnerabilità (npm audit)
- [ ] Verifica GDPR compliance

### Tools Raccomandati
- OWASP ZAP (penetration testing)
- Burp Suite (security scanning)
- npm audit (dependency vulnerabilities)
- Snyk (continuous monitoring)

---

## 📞 Security Contact

Per segnalazioni di vulnerabilità:
- **Email**: security@biofertility.it (esempio)
- **PEC**: centrobio fertility@pec.it
- **Telefono**: 068415269

**Responsible Disclosure Policy**:
Garantiamo risposta entro 48h per vulnerabilità critiche.

---

## 📝 Changelog Sicurezza

### v1.0 (2025-10-02)
- ✅ Implementato rate limiting completo
- ✅ Aggiunta validazione input rigorosa
- ✅ Configurati security headers
- ✅ Implementata firma digitale consensi
- ✅ Aggiunto IP tracking
- ✅ Protezione SQL injection (Prisma)
- ✅ Password strength checker
- ✅ Logging attività sospette

---

## 🔗 Riferimenti Normativi

1. **GDPR** - Regolamento UE 2016/679
2. **Codice Privacy** - D.Lgs. 196/2003 (aggiornato)
3. **Consenso Informato** - L. 219/2017
4. **Firma Digitale** - CAD D.Lgs. 82/2005
5. **Codice Deontologia Medica** - Art. 33-38
6. **Linee Guida Garante Privacy** - Provvedimento 16/07/2009

---

**Ultimo aggiornamento**: 2025-10-02
**Versione documento**: 1.0
**Responsabile sicurezza**: Centro Medico Biofertility
