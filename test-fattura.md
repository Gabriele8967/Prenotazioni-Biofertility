# Test Integrazione Fatture in Cloud

## 1. Verifica Account Fatture in Cloud

1. Accedi a https://secure.fattureincloud.it
2. Verifica che l'azienda sia configurata:
   - Nome azienda
   - Partita IVA
   - Dati fiscali completi
3. Verifica impostazioni IVA:
   - Controlla che l'IVA esente (Art. 15) sia configurata con ID 20000
   - Se diverso, aggiorna il codice in `lib/fattureincloud.ts` linea 117

## 2. Crea Prodotti/Servizi (Opzionale ma Consigliato)

1. Su Fatture in Cloud vai in **Prodotti → Nuovo Prodotto**
2. Crea un prodotto per ogni servizio:
   - Nome: "Prima Visita di Coppia"
   - Prezzo: 150€
   - IVA: Esente Art. 15
   - Codice: PRIMA_VISITA
3. Annota gli ID prodotti creati
4. Aggiorna il database:
   ```sql
   UPDATE services SET ficProductId = 'ID_PRODOTTO_FIC' WHERE name = 'Prima Visita di Coppia';
   ```
5. Modifica `lib/fattureincloud.ts` per usare il campo `service.ficProductId`

## 3. Test Locale (Simulazione)

```bash
# Avvia il server
npm run dev

# In un altro terminale, simula il webhook di pagamento completato
curl -X POST http://localhost:3000/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type": "checkout.session.completed", "data": {"object": {"metadata": {"bookingId": "ID_BOOKING_ESISTENTE"}}}}'
```

**Nota**: Questo test NON funzionerà perché richiede la firma del webhook Stripe.

## 4. Test con Stripe in Modalità Test

1. Usa le chiavi di **TEST** di Stripe (pk_test_... / sk_test_...)
2. Configura il webhook su Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
3. Copia il webhook secret generato e aggiornalo in `.env`
4. Completa una prenotazione di test

## 5. Verifica Risultati

Dopo il pagamento, controlla:

### Su Fatture in Cloud:
- [ ] Fattura creata automaticamente
- [ ] Cliente creato/aggiornato con dati corretti
- [ ] **Indirizzo del paziente incluso nella fattura**
- [ ] Importo e descrizione corretti
- [ ] Stato "Pagata"
- [ ] Email inviata al cliente

### Nel Database:
```sql
SELECT id, paymentStatus, fatturaId, stripeSessionId
FROM bookings
WHERE id = 'ID_BOOKING';
```
- [ ] `paymentStatus` = "PAID"
- [ ] `fatturaId` contiene l'ID della fattura
- [ ] `stripeSessionId` contiene l'ID della sessione

### Nelle Email:
- [ ] Cliente riceve email di conferma
- [ ] Cliente riceve email con fattura (da Fatture in Cloud)
- [ ] Admin riceve email con modulo privacy e documenti

## 6. Configurazione Produzione

### Vercel Environment Variables:
```
FATTUREINCLOUD_ACCESS_TOKEN=a/eyJ0eXAiOiJKV1QiLCJhbGc...
FATTUREINCLOUD_COMPANY_ID=12345
FATTUREINCLOUD_PAYMENT_ACCOUNT_ID=1
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (dalla dashboard Stripe)
GMAIL_USER=centrimanna2@gmail.com
GMAIL_APP_PASSWORD=wffs ptmj adsv gdka
ADMIN_EMAIL=centrimanna2@gmail.com
```

### Webhook Stripe:
1. Vai su https://dashboard.stripe.com/webhooks
2. Crea endpoint: `https://tuo-dominio.vercel.app/api/webhooks/stripe`
3. Seleziona evento: `checkout.session.completed`
4. Copia il webhook secret e aggiornalo su Vercel

## Troubleshooting

### Fattura non creata
- Verifica token Fatture in Cloud valido
- Controlla logs: `console.error` nella console Vercel
- Verifica che l'azienda sia configurata

### Email fattura non arrivata
- Verifica email cliente corretta
- Controlla spam
- Verifica che Fatture in Cloud abbia permessi email

### Errore "Company ID not found"
- Accedi a Fatture in Cloud
- Vai in Impostazioni → Azienda
- Verifica che almeno un'azienda sia attiva

### Errore IVA
- Su Fatture in Cloud vai in Impostazioni → IVA
- Verifica l'ID dell'IVA esente (dovrebbe essere 20000)
- Se diverso, aggiorna il codice
