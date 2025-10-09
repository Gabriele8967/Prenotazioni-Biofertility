# 📋 Guida Configurazione Fatture in Cloud

## Problema Risolto

### ❌ Problema
Le fatture apparvano come **€0,00** nell'elenco di Fatture in Cloud, anche se l'importo era corretto quando aperte.

### ✅ Soluzione
Configurare correttamente l'**ID dell'aliquota IVA esente** da usare per le prestazioni sanitarie.

---

## 🔧 Configurazione Richiesta

### Step 1: Trova l'ID dell'Aliquota IVA Esente

1. **Accedi a Fatture in Cloud**
   - Vai su https://secure.fattureincloud.it

2. **Vai alle Aliquote IVA**
   - Menu: **Impostazioni** > **Aliquote IVA**

3. **Identifica l'aliquota corretta**
   Cerca una delle seguenti aliquote (tutte con valore 0%):
   
   - **"Escluso Art.10"** ✅ (consigliata per prestazioni sanitarie)
     - Descrizione: "Esente IVA ai sensi dell'art.10 del D.P.R 633/1972"
     - Natura: N4 - Esenti
   
   - **"Escluso Art.10 comma 1"**
     - Descrizione: "Esente IVA ai sensi dell'art. 10, comma 1, n. 18 del D.P.R. 633/1972"
     - Natura: N4 - Esenti

4. **Annota l'ID**
   - Clicca sull'aliquota per aprire i dettagli
   - L'ID è visibile nell'URL o nei dettagli
   - Esempio: se l'URL è `.../vat_types/123/edit`, l'ID è `123`

---

### Step 2: Configura le Variabili d'Ambiente

Aggiungi al tuo file `.env`:

```bash
# Fatture in Cloud - Configurazione Completa
FATTUREINCLOUD_ACCESS_TOKEN="il-tuo-token-api"
FATTUREINCLOUD_COMPANY_ID="1467198"  # ID della tua azienda
FATTUREINCLOUD_PAYMENT_ACCOUNT_ID="1"  # 1 = Conto Corrente (default)

# IMPORTANTE: ID dell'aliquota IVA esente (es. "Escluso Art.10")
FATTUREINCLOUD_EXEMPT_VAT_ID="123"  # ⚠️ SOSTITUISCI con l'ID corretto!
```

**⚠️ ATTENZIONE:** Senza `FATTUREINCLOUD_EXEMPT_VAT_ID` configurato correttamente:
- Le fatture appariranno come **€0,00** nell'elenco
- Verrà usato ID `0` come fallback (potrebbe causare errori)
- Riceverai un warning nei log

---

### Step 3: Verifica la Configurazione

#### Opzione A: Test con Script
```bash
# Crea una fattura di test
npx tsx scripts/test-invoice-vat.ts email-paziente@example.com
```

#### Opzione B: Verifica Manuale
1. Crea una nuova prenotazione di test
2. Completa il pagamento via Stripe
3. Controlla su Fatture in Cloud:
   - ✅ Nell'**elenco fatture** l'importo deve apparire corretto (es. €120)
   - ✅ Aprendo la fattura, l'importo deve corrispondere
   - ✅ La voce IVA deve mostrare "Esente art.10" o simile

---

## 📊 Aliquote IVA Disponibili su Fatture in Cloud

| Aliquota | Valore | Descrizione | Natura | Uso Consigliato |
|----------|--------|-------------|--------|------------------|
| **Escluso Art.10** | 0% | Esente IVA art.10 DPR 633/1972 | N4 - Esenti | ✅ **Prestazioni sanitarie** |
| Escluso Art.10 comma 1 | 0% | Esente IVA art.10 comma 1 n.18 | N4 - Esenti | Prestazioni sanitarie specifiche |
| Escluso Art.10 comma 9 | 0% | Esente IVA art.10 comma 9 | N4 - Esenti | Altre prestazioni esenti |
| Escluso Art.10 comma 20 | 0% | Esente IVA art.10 comma 20 | N4 - Esenti | Prestazioni particolari |
| N4 - Esenti | 0% | Operazioni esenti generiche | N4 - Esenti | Uso generico |

**💡 Suggerimento:** Usa **"Escluso Art.10"** per le prestazioni sanitarie standard.

---

## 🔍 Risoluzione Problemi

### Problema: Fattura ancora a €0,00

**Possibili cause:**

1. **ID IVA non configurato**
   ```bash
   # Verifica nel file .env
   cat .env | grep FATTUREINCLOUD_EXEMPT_VAT_ID
   ```
   **Soluzione:** Aggiungi la variabile con l'ID corretto

2. **ID IVA errato**
   - Vai su Fatture in Cloud > Impostazioni > Aliquote IVA
   - Verifica che l'ID corrisponda all'aliquota "Escluso Art.10"
   
3. **Variabile non caricata**
   ```bash
   # Riavvia l'applicazione dopo aver modificato .env
   # In sviluppo: Ctrl+C e poi npm run dev
   # In produzione: Redeploy su Vercel/altro hosting
   ```

### Problema: Errore API "validation_result"

**Errore:**
```
The data.items_list.0.vat.id field is required
```

**Soluzione:**
- L'ID IVA è obbligatorio
- Verifica che `FATTUREINCLOUD_EXEMPT_VAT_ID` sia configurato
- Verifica che il valore non sia `0` o vuoto

### Problema: "Il totale dei pagamenti non corrisponde"

**Causa:** L'aliquota IVA sta aggiungendo IVA invece di 0%

**Soluzione:**
- Assicurati di usare un'aliquota con **valore 0%**
- Controlla che sia di tipo "N4 - Esenti"
- Non usare aliquote al 22% o altre percentuali

---

## 📝 Modifiche al Codice

### Cosa è stato modificato

1. **`lib/fattureincloud.ts`**
   - ✅ Aggiunta funzione `getExemptVatId()` per recuperare l'ID IVA
   - ✅ Cambiato da `not_taxable: true` a `vat: { id, value: 0 }`
   - ✅ Aggiunto warning se `FATTUREINCLOUD_EXEMPT_VAT_ID` non configurato

2. **`.env.example`**
   - ✅ Documentate tutte le variabili Fatture in Cloud
   - ✅ Istruzioni per trovare l'ID IVA corretto

3. **Google Calendar** (`app/api/bookings/route.ts`)
   - ✅ Il titolo evento include già "Nome - Tipo Visita"
   - ✅ La descrizione include tutti i dati del form

---

## ✅ Checklist Post-Configurazione

- [ ] `FATTUREINCLOUD_ACCESS_TOKEN` configurato
- [ ] `FATTUREINCLOUD_COMPANY_ID` configurato
- [ ] `FATTUREINCLOUD_PAYMENT_ACCOUNT_ID` configurato (default: 1)
- [ ] `FATTUREINCLOUD_EXEMPT_VAT_ID` configurato con ID corretto ⚠️
- [ ] Test fattura eseguito e verificato
- [ ] Importo appare corretto nell'elenco Fatture in Cloud
- [ ] Aliquota IVA mostra "Esente art.10" nella fattura
- [ ] Applicazione riavviata/redeployata dopo modifiche .env

---

## 📞 Supporto

Se riscontri ancora problemi:

1. **Controlla i log:**
   ```bash
   # Cerca warning su FATTUREINCLOUD_EXEMPT_VAT_ID
   grep "FATTUREINCLOUD_EXEMPT_VAT_ID" logs/*.log
   ```

2. **Verifica la risposta API:**
   - I log mostrano il payload inviato a Fatture in Cloud
   - Cerca `[FATTURA_TRACE]` per vedere i dettagli

3. **Contatta supporto Fatture in Cloud:**
   - Se non riesci a trovare l'ID dell'aliquota
   - Per problemi specifici dell'API

---

## 🎯 Riepilogo

**Prima della correzione:**
- ❌ Fatture con importo €0,00 nell'elenco
- ❌ Usava `not_taxable: true` (non supportato correttamente)

**Dopo la correzione:**
- ✅ Fatture con importo corretto nell'elenco
- ✅ Usa `vat: { id: X, value: 0 }` con ID aliquota configurabile
- ✅ Supporto pazienti esteri (IT, DE, FR, ES, ecc.)
- ✅ Warning chiari se configurazione mancante

---

**Ultimo aggiornamento:** 2025-10-08  
**Versione:** 2.0
