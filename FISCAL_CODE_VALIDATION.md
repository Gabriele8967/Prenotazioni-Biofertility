# Sistema di Validazione Codice Fiscale

## Panoramica

È stato implementato un sistema intelligente di validazione del codice fiscale che previene errori di inserimento e garantisce la coerenza con i dati anagrafici.

## Funzionalità

### 1. Validazione Formale
- ✅ Verifica lunghezza (16 caratteri)
- ✅ Verifica formato (lettere e numeri nelle posizioni corrette)
- ✅ Calcolo e verifica del carattere di controllo
- ✅ Validazione del codice mese
- ✅ Validazione del giorno di nascita

### 2. Controllo di Coerenza
- ✅ Confronto anno di nascita (CF vs data inserita)
- ✅ Confronto mese di nascita
- ✅ Confronto giorno di nascita
- ✅ Verifica sesso (opzionale)
- ✅ Messaggi di errore dettagliati e suggerimenti

### 3. Feedback in Tempo Reale
- ✅ Componente React `<FiscalCodeInput>` con validazione live
- ✅ Indicatori visivi (✓ verde = valido, ✗ rosso = errore)
- ✅ Messaggi di errore contestuali
- ✅ Formattazione automatica (maiuscolo, rimozione spazi)

## File Coinvolti

### Backend
- **`lib/fiscal-code-validator.ts`**: Libreria di validazione principale
  - `validateFiscalCode()`: Validazione formale
  - `checkFiscalCodeCoherence()`: Controllo coerenza con dati anagrafici
  - `extractFiscalCodeInfo()`: Estrae informazioni dal CF
  - `formatFiscalCode()`: Formattazione automatica

- **`app/api/bookings/route.ts`**: Validazione lato server
  - Blocca prenotazioni con CF non valido
  - Verifica coerenza prima di salvare nel DB

### Frontend
- **`components/FiscalCodeInput.tsx`**: Componente UI con validazione live
  - Feedback visivo in tempo reale
  - Messaggi di errore chiari
  - Integrazione con data di nascita

- **`app/prenotazioni/page.tsx`**: Form di prenotazione
  - Sostituito input standard con `<FiscalCodeInput>`
  - Validazione sia per paziente che per partner

## Esempi di Utilizzo

### Caso 1: Codice Fiscale Valido
```
Input: RSSMRA80A01H501U
Data nascita: 01/01/1980
✅ Valido e coerente
```

### Caso 2: Errore Formale
```
Input: RSSMRA80A01H501X
❌ Errore: Carattere di controllo non valido (atteso: U, trovato: X)
```

### Caso 3: Incoerenza con Dati
```
Input: RSSMRA80A01H501U (indica 1 gennaio 1980)
Data nascita: 15/06/1985
❌ Errore: Il codice fiscale non corrisponde ai dati anagrafici inseriti
- Anno: CF indica 1980, ma hai inserito 1985
- Mese: CF indica Gennaio, ma hai inserito Giugno
- Giorno: CF indica 1, ma hai inserito 15
```

## Test

Eseguire i test di validazione:
```bash
npx tsx scripts/test-fiscal-code-validation.ts
```

## Benefici

1. **Previene errori di fatturazione**: CF errati causano problemi con fatturazione elettronica
2. **Migliora UX**: Feedback immediato invece di errore a fine processo
3. **Riduce supporto**: Gli utenti correggono autonomamente gli errori
4. **Conformità GDPR**: Dati anagrafici corretti e verificati

## Prossimi Sviluppi Possibili

- [ ] Integrazione con API Agenzia delle Entrate per verifica CF
- [ ] Calcolo automatico CF da dati anagrafici
- [ ] Suggerimento CF corretto in caso di errore
- [ ] Verifica esistenza codice catastale comune
