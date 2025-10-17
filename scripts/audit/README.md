# 📊 Audit Stripe vs Fatture in Cloud

Script per confrontare pagamenti Stripe con fatture emesse e trovare incongruenze.

---

## 🎯 Cosa Fa

1. **Scarica pagamenti Stripe** (ultimi X mesi)
2. **Scarica fatture da Fatture in Cloud** (stesso periodo)
3. **Match automatico** per:
   - Metadata (Stripe ID salvato in fattura)
   - Importo + Data (±7 giorni per SEPA)
4. **Rileva incongruenze**:
   - Pagamenti Stripe senza fattura
   - Fatture senza pagamento Stripe
   - Importi non corrispondenti
   - SEPA in attesa (7-14 giorni)

---

## 📋 Prerequisiti

### 1. Credenziali Stripe

Serve la **Secret Key**:
- Dashboard Stripe → Developers → API keys
- Copia "Secret key" (inizia con `sk_live_...` o `sk_test_...`)

### 2. Credenziali Fatture in Cloud

Servono **2 valori**:

**a) API Key**:
1. Login su https://secure.fattureincloud.it/
2. Impostazioni → Fatture e Corrispettivi → API
3. Click "Genera nuova chiave API"
4. Copia la chiave

**b) Company UID**:
1. Stesso pannello API
2. Trovi "UID Azienda" o "Company ID"
3. È un numero tipo: `12345`

---

## ⚙️ Setup

### 1. Aggiungi credenziali a `.env.local`:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx

# Fatture in Cloud
FATTURE_IN_CLOUD_API_KEY=xxxxxxxxxxxxxxxxxxxxxx
FATTURE_IN_CLOUD_UID=12345
```

### 2. Verifica che `.env.local` sia in `.gitignore` (già fatto)

---

## 🚀 Utilizzo

### Comando Base (ultimi 3 mesi):

```bash
npx tsx scripts/audit/stripe-vs-fatture-audit.ts
```

### Con periodo personalizzato:

```bash
# Ultimi 6 mesi
npx tsx scripts/audit/stripe-vs-fatture-audit.ts --months=6

# Solo ultimo mese
npx tsx scripts/audit/stripe-vs-fatture-audit.ts --months=1
```

---

## 📊 Output

### Console:
```
🔍 Audit Stripe vs Fatture in Cloud
📅 Periodo: ultimi 3 mesi

📥 Recupero pagamenti Stripe...
✅ Trovati 47 pagamenti Stripe

📥 Recupero fatture da Fatture in Cloud...
✅ Trovate 45 fatture

🔍 Confronto 47 pagamenti con 45 fatture...
✅ Matched: 42 coppie
⚠️  Unmatched Stripe: 5
⚠️  Unmatched Fatture: 3

================================================================================
📊 REPORT INCONGRUENZE STRIPE vs FATTURE IN CLOUD
================================================================================

⚠️  Trovate 8 incongruenze

────────────────────────────────────────────────────────────────────────────────
📌 STRIPE_SENZA_FATTURA (5 casi)
────────────────────────────────────────────────────────────────────────────────

1. [MEDIA] 2025-10-10
   Pagamento SEPA del 10/10/2025 - Potrebbe essere in attesa di conferma (7-14 giorni)
   Stripe: pi_abc123xyz
   Importo Stripe: €150.00
   💡 Soluzione: Attendere conferma SEPA o verificare su Stripe se completato

2. [ALTA] 2025-10-08
   Pagamento card del 08/10/2025 senza fattura corrispondente
   Stripe: pi_def456uvw
   Importo Stripe: €85.50
   💡 Soluzione: Emettere fattura manualmente su Fatture in Cloud con riferimento pi_def456uvw
...
```

### File CSV (`audit-report.csv`):
```csv
Data,Tipo,Gravità,Stripe ID,Fattura,Importo Stripe,Importo Fattura,Dettagli,Soluzione
2025-10-10,STRIPE_SENZA_FATTURA,MEDIA,pi_abc123,,150.00,,Pagamento SEPA...,Attendere conferma...
2025-10-08,STRIPE_SENZA_FATTURA,ALTA,pi_def456,,85.50,,Pagamento card...,Emettere fattura...
...
```

Apribile con Excel/Google Sheets per filtrare e ordinare.

---

## 🔍 Tipi di Incongruenze

### 1. STRIPE_SENZA_FATTURA

**Cause comuni**:
- Fattura non ancora emessa
- SEPA in attesa (7-14 giorni)
- Errore manuale

**Soluzioni**:
- **SEPA**: Aspettare fino a 14 giorni, controllare su Stripe se status = `succeeded`
- **Card/Altri**: Emettere fattura immediatamente con riferimento Stripe ID

### 2. FATTURA_SENZA_STRIPE

**Cause comuni**:
- Pagamento con bonifico diretto (non passato da Stripe)
- Pagamento contanti/POS
- Fattura annullata ma non cancellata
- Errore inserimento

**Soluzioni**:
- Verificare metodo pagamento alternativo
- Se errore, annullare fattura

### 3. IMPORTO_DIVERSO

**Cause comuni**:
- IVA applicata erroneamente
- Sconto non applicato
- Errore manuale trascrizione
- Fee Stripe non sottratte

**Soluzioni**:
- Correggere fattura (nota di credito + nuova fattura)
- Richiedere integrazione pagamento se mancante

### 4. SEPA_PENDING (gravità MEDIA)

**Normale per SEPA Direct Debit**:
- Autorizzazione immediata su Stripe
- Addebito effettivo: 3-7 giorni lavorativi
- Conferma finale: fino a 14 giorni

**Azione**:
- Se < 14 giorni: **aspettare**
- Se > 14 giorni: verificare su Stripe se fallito

---

## 📅 Quando Eseguirlo

### Consigliato:

- **Ogni fine mese** (chiusura contabile)
- **Prima di invio 730/dichiarazione**
- **Quando commercialista segnala discrepanze**

### Automazione (opzionale):

Aggiungi a GitHub Actions per esecuzione automatica:

```yaml
# .github/workflows/audit-stripe.yml
name: Audit Stripe Fatture
on:
  schedule:
    - cron: '0 9 1 * *'  # Primo giorno del mese alle 9:00
  workflow_dispatch:  # Esecuzione manuale

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx tsx scripts/audit/stripe-vs-fatture-audit.ts --months=1
        env:
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
          FATTURE_IN_CLOUD_API_KEY: ${{ secrets.FATTURE_API_KEY }}
          FATTURE_IN_CLOUD_UID: ${{ secrets.FATTURE_UID }}
      - uses: actions/upload-artifact@v3
        with:
          name: audit-report
          path: audit-report.csv
```

---

## 🛠️ Troubleshooting

### Errore: "STRIPE_SECRET_KEY mancante"
➡️ Aggiungi credenziale in `.env.local`

### Errore: "Credenziali Fatture in Cloud mancanti"
➡️ Aggiungi `FATTURE_IN_CLOUD_API_KEY` e `FATTURE_IN_CLOUD_UID`

### Errore: "Fetch fatture fallita (401)"
➡️ API Key Fatture in Cloud scaduta o errata, rigenerala

### Errore: "Fetch fatture fallita (403)"
➡️ API Key non ha permessi, verifica in Fatture in Cloud → Impostazioni API

### Troppi "STRIPE_SENZA_FATTURA"
➡️ Normale se molti SEPA recenti (ultimi 14 giorni). Ri-esegui tra qualche giorno.

### Troppi "FATTURA_SENZA_STRIPE"
➡️ Normale se accetti pagamenti offline (bonifico, contanti). Verifica caso per caso.

---

## 📚 Link Utili

- [Stripe API Docs](https://stripe.com/docs/api)
- [Fatture in Cloud API Docs](https://api-v2.fattureincloud.it/docs/)
- [SEPA Direct Debit Timeline](https://stripe.com/docs/payments/sepa-debit#timeline)

---

## 💡 Tips per Commercialista

1. **Esporta CSV** e apri in Excel
2. **Filtra per gravità** = ALTA (da risolvere subito)
3. **Ordina per data** (più recenti prima)
4. **Ignora SEPA < 14 giorni** (normale ritardo)
5. **Verifica importi diversi** come priorità massima

---

## ✅ Checklist Mensile

- [ ] Esegui script: `npx tsx scripts/audit/stripe-vs-fatture-audit.ts --months=1`
- [ ] Apri `audit-report.csv` in Excel
- [ ] Risolvi incongruenze gravità ALTA
- [ ] Ignora SEPA < 14 giorni
- [ ] Verifica FATTURA_SENZA_STRIPE (pagamenti offline)
- [ ] Invia CSV a commercialista se necessario

---

🎉 **Audit completo! I tuoi conti saranno sempre allineati.**
