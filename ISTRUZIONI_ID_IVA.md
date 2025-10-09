# 🎯 Come Trovare l'ID dell'Aliquota IVA

Hai identificato l'aliquota corretta:
- **Nome:** Escluso Art.10
- **Valore:** 0%
- **Descrizione:** Esente IVA ai sensi dell'art.10 del D.P.R 633/1972
- **Natura:** N4 - Esenti

---

## 🔍 Step per Trovare l'ID

### Metodo 1: Dall'URL (più semplice)

1. **Clicca sull'aliquota "Escluso Art.10"** nella lista delle aliquote IVA

2. **Guarda l'URL nella barra degli indirizzi**
   
   L'URL sarà simile a:
   ```
   https://secure.fattureincloud.it/vat-types/XXXXX/edit
   ```
   oppure
   ```
   https://secure.fattureincloud.it/c/1467198/vat_types/XXXXX
   ```

3. **Il numero XXXXX è l'ID che ti serve!**
   
   Esempio:
   - URL: `https://secure.fattureincloud.it/vat-types/54321/edit`
   - ID: **54321** ✅

---

### Metodo 2: Dalla Pagina di Modifica

1. **Clicca su "Escluso Art.10"** per aprire la pagina di modifica

2. **Cerca l'ID** nella pagina:
   - Potrebbe essere mostrato come "ID: XXXXX"
   - O nell'URL come spiegato sopra

---

### Metodo 3: Ispeziona Elemento (per utenti avanzati)

1. **Fai clic destro** sull'aliquota "Escluso Art.10"

2. **Seleziona "Ispeziona elemento"** (o "Inspect")

3. **Cerca attributi HTML** tipo:
   ```html
   data-id="XXXXX"
   value="XXXXX"
   ```

---

## ⚙️ Configurazione nel File .env

Una volta trovato l'ID (esempio: 54321), aggiungi al tuo file `.env`:

```bash
# Fatture in Cloud - Aliquota IVA Esente
FATTUREINCLOUD_EXEMPT_VAT_ID="54321"  # ⬅️ Sostituisci con l'ID che hai trovato
```

### File .env Completo (esempio)

```bash
# Database
DATABASE_URL="postgresql://..."

# Fatture in Cloud
FATTUREINCLOUD_ACCESS_TOKEN="il-tuo-token"
FATTUREINCLOUD_COMPANY_ID="1467198"
FATTUREINCLOUD_PAYMENT_ACCOUNT_ID="1"
FATTUREINCLOUD_EXEMPT_VAT_ID="54321"  # ⬅️ QUESTO È IL NUOVO CAMPO!

# Altri servizi...
STRIPE_SECRET_KEY="..."
```

---

## 🧪 Test della Configurazione

### Step 1: Aggiungi la variabile
```bash
# Modifica il file .env
nano .env  # oppure usa il tuo editor preferito

# Aggiungi la riga:
FATTUREINCLOUD_EXEMPT_VAT_ID="L_ID_CHE_HAI_TROVATO"
```

### Step 2: Riavvia l'applicazione
```bash
# In sviluppo locale
# Premi Ctrl+C per fermare
# Poi riavvia con:
npm run dev

# In produzione (Vercel)
# Vai su Vercel Dashboard > Settings > Environment Variables
# Aggiungi FATTUREINCLOUD_EXEMPT_VAT_ID con il valore
# Poi redeploy
```

### Step 3: Testa con lo script
```bash
npx tsx scripts/fix-missing-invoice.ts battaglia.francesco1991@gmail.com
```

**Risultato atteso:**
```
✅ Fattura XXXXXX creata con successo!
```

### Step 4: Verifica su Fatture in Cloud
1. Vai all'elenco fatture
2. **L'importo DEVE apparire corretto** (es. €120)
3. **NON deve più apparire €0,00**

---

## ❓ Domande Frequenti

### Q: Non riesco a trovare l'ID
**A:** Prova a:
1. Cliccare sull'aliquota per aprirla
2. Guardare l'URL nella barra degli indirizzi
3. L'ID è il numero nell'URL

### Q: L'ID è 0 o nullo
**A:** L'ID 0 non è valido. Assicurati di:
1. Essere nell'account corretto di Fatture in Cloud
2. Avere i permessi per vedere le aliquote IVA
3. Cercare "Escluso Art.10" nella lista

### Q: Ci sono più aliquote "Escluso Art.10"
**A:** Usa quella con descrizione:
- "Esente IVA ai sensi dell'art.10 del D.P.R 633/1972"
- Natura: "N4 - Esenti"
- Valore: 0%

### Q: Dopo la configurazione, fattura ancora a €0,00
**A:** Controlla:
1. ✅ Hai salvato il file `.env`?
2. ✅ Hai riavviato l'applicazione?
3. ✅ L'ID è corretto (non 0 o "0")?
4. ✅ In produzione, hai fatto redeploy?

---

## 🎯 Prossimi Passi

1. [ ] Trova l'ID dell'aliquota "Escluso Art.10"
2. [ ] Aggiungi `FATTUREINCLOUD_EXEMPT_VAT_ID="ID"` al file `.env`
3. [ ] Riavvia l'applicazione (o redeploy in produzione)
4. [ ] Testa creando una fattura
5. [ ] Verifica su Fatture in Cloud che l'importo appaia corretto

---

## 📞 Hai Bisogno di Aiuto?

**Scrivimi l'ID che hai trovato** e verificherò che sia corretto!

Esempio di risposta:
```
Ho trovato l'ID: 54321
```

Oppure:
```
L'URL è: https://secure.fattureincloud.it/vat-types/54321/edit
Quindi l'ID è: 54321
```

---

**Buona configurazione! 🚀**
