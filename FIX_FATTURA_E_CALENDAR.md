# Fix: Fattura Mancante e Dati Calendar Incompleti

## Problemi Identificati

### 1. Fattura non generata nonostante pagamento Stripe ❌
**Paziente:** Francesco Battaglia (battaglia.francesco1991@gmail.com)

**Causa:** Nel webhook Stripe (`app/api/webhooks/stripe/route.ts`), la creazione della fattura era in un blocco try-catch che non rilanciava l'errore. Se la chiamata a `createAndSendInvoice()` falliva, l'errore veniva loggato ma il sistema rispondeva comunque OK a Stripe, lasciando la prenotazione senza fattura.

**Conseguenze:**
- Pagamento Stripe confermato ✅
- Email inviate al cliente e admin ✅
- Fattura su Fatture in Cloud **NON generata** ❌

### 2. Dati mancanti nel Google Calendar ❌

**Causa:** Nel file `app/api/bookings/route.ts` (righe 111-114), l'evento Google Calendar veniva creato con solo:
- Nome paziente + nome servizio (titolo)
- Nome, email e telefono (descrizione)

**Dati mancanti:**
- Codice fiscale
- Data e luogo di nascita
- Professione
- Indirizzo completo (via, città, CAP)
- Numero documento e scadenza
- Email comunicazioni
- Dati partner (se presenti)
- Note aggiuntive

## Correzioni Implementate

### 1. ✅ Migliorato logging errori fattura
**File:** `app/api/webhooks/stripe/route.ts`

Modifiche:
- Aggiunto try-catch specifico per la creazione della fattura
- Log dettagliato degli errori (messaggio + stack trace)
- Avviso esplicito quando `invoiceId` è null
- Processo continua con pulizia dati anche se fattura fallisce

```typescript
try {
  const { invoiceId } = await createAndSendInvoice(bookingId);
  if (invoiceId) {
    // Salva ID fattura...
  } else {
    console.error(`⚠️ ATTENZIONE: createAndSendInvoice ha restituito invoiceId null`);
  }
} catch (invoiceError) {
  console.error(`❌ ERRORE CRITICO: Impossibile creare fattura`);
  // Log dettagliato...
}
```

### 2. ✅ Descrizione completa nel Google Calendar
**File:** `app/api/bookings/route.ts`

La descrizione degli eventi Google Calendar ora include:

#### 👤 DATI ANAGRAFICI
- Nome completo
- Email
- Telefono
- Codice Fiscale
- Data di nascita
- Luogo di nascita
- Professione

#### 📍 INDIRIZZO
- Via
- Città
- CAP

#### 📄 DOCUMENTO
- Numero documento
- Scadenza documento

#### 📧 COMUNICAZIONI
- Email per comunicazioni

#### 👥 DATI PARTNER (se presenti)
- Nome, email, telefono
- Codice fiscale
- Data e luogo di nascita

#### 📝 NOTE (se presenti)
- Note aggiuntive del paziente

## Script di Riparazione

### Script 1: Rigenerare Fattura Mancante

**File:** `scripts/fix-missing-invoice.ts`

**Uso:**
```bash
npx tsx scripts/fix-missing-invoice.ts battaglia.francesco1991@gmail.com
```

**Cosa fa:**
1. Cerca tutte le prenotazioni PAID senza `fatturaId` per l'email specificata
2. Per ogni prenotazione trovata:
   - Mostra dettagli completi (ID, servizio, data, importo)
   - Chiama `createAndSendInvoice()` per generare la fattura
   - Salva l'ID fattura nel database
   - Gestisce errori e fornisce log dettagliati
3. Se non trova prenotazioni senza fattura, mostra tutte le prenotazioni del paziente per debug

### Script 2: Aggiornare Eventi Google Calendar

**File:** `scripts/update-calendar-event.ts`

**Uso:**
```bash
npx tsx scripts/update-calendar-event.ts battaglia.francesco1991@gmail.com
```

**Cosa fa:**
1. Cerca tutte le prenotazioni con `googleEventId` per l'email specificata
2. Per ogni prenotazione:
   - Recupera tutti i dati del paziente dal database
   - Costruisce descrizione completa (come sopra)
   - Chiama `updateCalendarEvent()` per aggiornare l'evento
   - Mantiene titolo e orari originali
   - Gestisce errori e fornisce log dettagliati

## Passi per Risolvere il Problema di Francesco Battaglia

### 1. Rigenerare la Fattura
```bash
npx tsx scripts/fix-missing-invoice.ts battaglia.francesco1991@gmail.com
```

Questo script:
- Trova la prenotazione pagata senza fattura
- Genera la fattura su Fatture in Cloud
- Salva l'ID fattura nel database

### 2. Aggiornare l'Evento Calendar
```bash
npx tsx scripts/update-calendar-event.ts battaglia.francesco1991@gmail.com
```

Questo script:
- Trova l'evento Google Calendar collegato alla prenotazione
- Aggiorna la descrizione con tutti i dati del form

### 3. Verificare

**Su Fatture in Cloud:**
- Verifica che sia stata creata la fattura per il paziente Francesco Battaglia
- Controlla che contenga tutti i dati anagrafici corretti

**Su Google Calendar:**
- Apri l'evento della prenotazione
- Verifica che la descrizione contenga tutti i dati: codice fiscale, indirizzo, data nascita, ecc.

## Prevenzione Problemi Futuri

### ✅ Fatture
- Errori nella creazione fattura ora loggati in dettaglio
- Alert esplicito quando `invoiceId` è null
- Stack trace completo per debugging rapido

### ✅ Google Calendar
- Tutti i nuovi eventi includeranno automaticamente tutti i dati del form
- Descrizione strutturata con sezioni chiare
- Dati partner inclusi se presenti
- Note incluse se presenti

## Note Tecniche

### Gestione Errori Fattura
Il webhook Stripe deve sempre rispondere 200 OK, altrimenti Stripe fa retry infiniti. Per questo:
- Gli errori fattura sono catturati e loggati
- Il processo continua (pulizia dati sensibili)
- La prenotazione resta valida
- La fattura può essere rigenerata manualmente con lo script

### Aggiornamento Calendar
- Lo script preserva titolo e orari originali
- Aggiorna solo la descrizione
- Non invia notifiche agli utenti (`sendUpdates: 'none'`)
- Gestisce gracefully eventuali errori di parsing dati partner

## Verifica Script

Prima di eseguire su produzione, testare in ambiente di sviluppo:

```bash
# 1. Verifica connessione database
npx tsx scripts/fix-missing-invoice.ts test@example.com

# 2. Verifica autenticazione Google Calendar
npx tsx scripts/update-calendar-event.ts test@example.com
```

## Monitoraggio

Dopo aver eseguito gli script, monitorare i log per:
- ✅ Conferma creazione fattura con ID
- ✅ Conferma aggiornamento evento Calendar
- ❌ Eventuali errori API (Fatture in Cloud o Google)
- ❌ Problemi di autenticazione

## Contatti per Supporto

Per problemi con:
- **Fatture in Cloud:** Verificare token API e company ID in `.env`
- **Google Calendar:** Verificare OAuth tokens dello staff member
- **Database:** Verificare connessione e dati paziente

---

**Data correzione:** 2025-10-08
**Paziente interessato:** Francesco Battaglia (battaglia.francesco1991@gmail.com)
