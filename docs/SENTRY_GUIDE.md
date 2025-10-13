# 🔍 Guida Sentry - Monitoraggio Errori

## 📋 Cosa è Sentry

Sentry è un sistema di **monitoraggio errori in tempo reale** che:
- ✅ Cattura automaticamente tutti gli errori JavaScript e del server
- ✅ Registra video replay delle sessioni con errori
- ✅ Traccia le performance dell'applicazione
- ✅ Invia notifiche quando ci sono problemi
- ✅ Maschera automaticamente dati sensibili (GDPR compliant)

## 🚀 Accesso al Dashboard

**URL**: https://biofertility.sentry.io/

1. Accedi con le tue credenziali Sentry
2. Seleziona il progetto **javascript-nextjs**
3. Vedrai tutti gli errori in tempo reale

## 📊 Come Interpretare gli Errori

### 1. **Dashboard Principale**

Quando apri Sentry vedrai:

```
╔══════════════════════════════════════════════╗
║  ISSUES                                      ║
║  ────────────────────────────────────────    ║
║  ❌ TypeError: Cannot read property...       ║
║     Occorrenze: 15                           ║
║     Utenti coinvolti: 3                      ║
║     Ultima occorrenza: 2 min fa              ║
║  ────────────────────────────────────────    ║
║  ❌ Errore nella prenotazione...             ║
║     Occorrenze: 5                            ║
║     Utenti coinvolti: 2                      ║
║     Ultima occorrenza: 10 min fa             ║
╚══════════════════════════════════════════════╝
```

### 2. **Dettaglio Errore**

Cliccando su un errore vedi:

- **Stack Trace**: Dove è avvenuto l'errore nel codice
- **Breadcrumbs**: Cosa ha fatto l'utente prima dell'errore
- **Replay Video**: Video della sessione dell'utente (se disponibile)
- **Tags**: Tipo di errore, browser, OS, etc.
- **Extra**: Informazioni aggiuntive (dati sanitizzati)

### 3. **Replay Video** 🎥

Per errori critici, Sentry registra un **video replay** della sessione:
- Vedi esattamente cosa ha cliccato l'utente
- Tutti i dati sensibili sono mascherati automaticamente
- Puoi rivedere gli ultimi 60 secondi prima dell'errore

## 🔍 Filtri Utili

### Filtra per Tipo di Errore

```
errorType:VALIDATION     # Errori di validazione input
errorType:DATABASE       # Errori database
errorType:PAYMENT        # Errori pagamento Stripe
```

### Filtra per Ambiente

```
environment:production   # Solo errori in produzione
environment:development  # Solo errori in sviluppo
```

### Filtra per Gravità

```
level:error             # Errori normali
level:fatal             # Errori critici che crashano l'app
```

## ⚙️ Configurazione Alert

### Ricevi Notifiche Email

1. Vai su **Settings** → **Alerts**
2. Crea una nuova regola:
   - **Nome**: "Errori critici prenotazione"
   - **Condizione**: `level:fatal AND context:POST /api/bookings`
   - **Azione**: Invia email a `tuo@email.com`

### Integrazione Slack (Opzionale)

1. Vai su **Settings** → **Integrations**
2. Cerca **Slack** e clicca **Add to Slack**
3. Scegli il canale (es. `#tech-alerts`)
4. Configura quando inviare notifiche

## 📈 Metriche Performance

### Transazioni Lente

Sentry traccia anche le **performance**:

```
Endpoint                     Durata Media    P95
────────────────────────────────────────────────
POST /api/bookings          450ms           2.1s ⚠️
GET /api/available-slots    120ms           300ms ✅
POST /api/checkout          890ms           3.5s ⚠️
```

Se un endpoint è **troppo lento**, Sentry ti avvisa.

## 🛡️ Privacy e GDPR

### Dati Mascherati Automaticamente

Sentry **NON vede mai**:
- ✅ Codici fiscali
- ✅ Numeri di telefono
- ✅ Email (mascherate)
- ✅ Password
- ✅ Indirizzi completi
- ✅ Documenti di identità
- ✅ Cookie di sessione

### Replay Video Sicuri

I video replay mascherano:
- ✅ Tutti i campi di input (mostrati come `***`)
- ✅ Immagini e media
- ✅ Testo sensibile

## 🔧 Troubleshooting

### Errore: "Quota Exceeded"

Se ricevi questo messaggio:
1. **Causa**: Hai superato il piano gratuito di Sentry (10k errori/mese)
2. **Soluzione**:
   - Riduci `tracesSampleRate` da `0.1` a `0.05` (5%)
   - Aggiungi più errori a `ignoreErrors` in `sentry.*.config.ts`
   - Aggiorna al piano a pagamento

### Errore Non Appare su Sentry

Verifica:
1. L'errore è in `ignoreErrors`? (errori di rete sono ignorati)
2. `NODE_ENV=production`? (solo produzione invia a Sentry)
3. DSN configurato correttamente?

### Troppi Errori "Network Failed"

Questi sono errori di connessione dell'utente, non bug. Sono già filtrati automaticamente.

## 📞 Casi d'Uso Comuni

### Caso 1: Paziente Non Riesce a Prenotare

1. Vai su Sentry Dashboard
2. Filtra: `context:"POST /api/bookings"`
3. Ordina per **Most Recent**
4. Guarda il **Replay Video** dell'ultima prenotazione fallita
5. Leggi lo **Stack Trace** per capire dove fallisce

### Caso 2: Pagamenti Stripe Falliscono

1. Filtra: `errorType:PAYMENT`
2. Clicca sul primo errore
3. Guarda **Extra** per dettagli Stripe
4. Verifica se è un problema nostro o di Stripe

### Caso 3: Sito Lento

1. Vai su **Performance** tab
2. Ordina per **P95 Duration**
3. Identifica gli endpoint lenti
4. Ottimizza query database o API calls

## 🎯 Best Practices

### ✅ DA FARE

- Controlla Sentry **1 volta al giorno**
- Risolvi errori **Fatal** immediatamente
- Analizza errori **ricorrenti** (>10 occorrenze)
- Usa **Replay Video** per capire il problema

### ❌ NON FARE

- Non ignorare errori per "risparmiare quota"
- Non condividere link Sentry pubblicamente (contengono dati utenti)
- Non cancellare errori senza risolverli (serve lo storico)

## 📚 Risorse

- **Docs Ufficiali**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Dashboard**: https://biofertility.sentry.io/
- **Supporto Sentry**: support@sentry.io

---

**Ultimo aggiornamento**: 2025-10-13
**Configurato da**: Claude Code Wizard 🤖
