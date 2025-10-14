# ✅ Passi Finali - Sistema Upload Supabase

## 🎯 Stato Attuale

✅ **Completato**:
- [x] Supabase progetto creato
- [x] Bucket `patient-documents` configurato
- [x] RLS policy impostata
- [x] Credenziali configurate in `.env.local`
- [x] API `/api/upload-url` funzionante (testata con successo!)
- [x] API `/api/delete-file` pronta
- [x] Frontend modificato per upload diretto
- [x] Limite file alzato da 2MB → 10MB

⚠️ **Da fare**:
1. Aggiungere variabili Vercel (produzione)
2. Test upload file reale tramite form
3. Committare e deployare
4. Configurare cleanup automatico (opzionale)

---

## 📝 Step 1: Aggiungi Variabili Vercel

### Manualmente via Dashboard (raccomandato):

1. Vai su: https://vercel.com/dashboard
2. Seleziona progetto: `gestione-prenotazioni` (o il tuo nome)
3. Settings → **Environment Variables**
4. Aggiungi queste 2 variabili:

**Variabile 1:**
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: `https://apokejmxwaaygbnsvffr.supabase.co`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development

**Variabile 2:**
- **Key**: `SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwb2tlam14d2FheWdibnN2ZmZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ0NDUzMiwiZXhwIjoyMDc2MDIwNTMyfQ.H1v4aOhX0x0pM9nHofUTR3Btg1rAjvYB8DGhmKprje4`
- **Environments**: ✅ Production, ✅ Preview, ✅ Development
- **Sensitive**: ✅ (maschera il valore)

5. Click **Save** per entrambe

---

## 🧪 Step 2: Test Upload File Reale

### Test in locale (http://localhost:3001):

1. **Apri browser**: http://localhost:3001/prenotazioni
2. **Compila form** fino allo step "Dati Paziente"
3. **Upload documento**:
   - Seleziona un'immagine di test (anche > 2MB, fino a 10MB!)
   - Controlla che appaia ✅ verde
4. **Apri Console Browser** (F12 → Console)
5. **Submit form** e verifica log:
   ```
   📤 Upload documenti a Supabase...
   📤 Inizio upload: documento-fronte.jpg (3.45 MB)
   ✅ Upload completato: temp/email@example.com/uuid-...jpg
   ```

6. **Verifica su Supabase**:
   - Dashboard → Storage → `patient-documents`
   - Dovresti vedere cartella `temp/` con file uploadato

### Se funziona ✅:
- Procedi con commit e deploy

### Se non funziona ❌:
- Controlla console browser per errori
- Verifica logs Next.js (terminale)
- Controlla Supabase Dashboard → Logs → Storage Logs

---

## 📦 Step 3: Commit e Deploy

### 3.1 Verifica cosa committare:

```bash
git status
```

File da committare:
- ✅ `lib/supabase.ts`
- ✅ `lib/uploadToSupabase.ts`
- ✅ `app/api/upload-url/route.ts`
- ✅ `app/api/delete-file/route.ts`
- ✅ `app/prenotazioni/page.tsx` (modificato)
- ✅ `package.json` / `package-lock.json` (dipendenza @supabase/supabase-js)
- ✅ `docs/SUPABASE_STORAGE_SETUP.md`
- ✅ `docs/PASSI_FINALI.md`

File da **NON committare** (già in .gitignore):
- ❌ `.env.local` (contiene secrets!)

### 3.2 Verifica .gitignore

```bash
# Controlla che .env.local sia ignorato
cat .gitignore | grep env
```

Dovrebbe mostrare:
```
.env*.local
.env
```

### 3.3 Commit

```bash
# Aggiungi file modificati
git add .

# Verifica che .env.local NON sia incluso
git status  # NON deve apparire .env.local!

# Commit
git commit -m "Implementa upload diretto Supabase Storage (file fino a 10MB)

- Rimuove conversione base64 (evita limite Vercel 4.5MB)
- Upload diretto a Supabase senza passare dal server
- Alza limite file da 2MB a 10MB
- Aggiunge API /api/upload-url e /api/delete-file
- Documenta setup completo in docs/SUPABASE_STORAGE_SETUP.md

🤖 Generated with Claude Code"
```

### 3.4 Push e Deploy

```bash
# Push su GitHub
git push origin main

# Vercel fa auto-deploy da GitHub
# Oppure deploy manuale:
npx vercel --prod
```

### 3.5 Verifica Deploy

1. Aspetta che deploy finisca (2-3 minuti)
2. Vai su URL produzione (es. `https://tuo-dominio.vercel.app`)
3. Testa upload file > 2MB
4. Verifica su Supabase che file arrivino

---

## 🔄 Step 4: Cleanup Automatico File (Opzionale)

### Opzione A: Vercel Cron Job (raccomandato)

Crea file `vercel.json` nella root:

```json
{
  "crons": [{
    "path": "/api/delete-file",
    "schedule": "0 2 * * *"
  }]
}
```

Poi deploy:
```bash
git add vercel.json
git commit -m "Aggiungi cron job cleanup file vecchi"
git push
```

Questo eliminerà file > 24 ore ogni notte alle 2:00.

### Opzione B: GitHub Actions

Crea `.github/workflows/cleanup-files.yml`:

```yaml
name: Cleanup Old Files
on:
  schedule:
    - cron: '0 2 * * *'  # Ogni notte alle 2:00
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X POST https://tuo-dominio.vercel.app/api/delete-file \
            -H "Content-Type: application/json" \
            -d '{"maxAgeHours": 24}'
```

### Opzione C: Manuale (quando serve)

```bash
curl -X POST https://tuo-dominio.vercel.app/api/delete-file \
  -H "Content-Type: application/json" \
  -d '{"maxAgeHours": 24}'
```

---

## 📊 Monitoring Post-Deploy

### Verifica errori Sentry
- Dashboard Sentry: https://biofertility.sentry.io/
- Filtra per "upload" o "supabase"

### Verifica Storage Supabase
- Dashboard → Storage → `patient-documents`
- Controlla crescita storage (max 1GB gratuito)
- Bandwidth utilizzato (max 2GB/mese gratuito)

### Verifica Logs Vercel
```bash
npx vercel logs --prod
```

---

## ✅ Checklist Finale

Prima di considerare completato:

- [ ] Variabili Vercel aggiunte (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
- [ ] Test locale upload file > 2MB funzionante
- [ ] File appare su Supabase Dashboard → Storage
- [ ] Commit fatto (senza .env.local!)
- [ ] Deploy su Vercel completato
- [ ] Test produzione upload file > 2MB funzionante
- [ ] Cleanup automatico configurato (cron job)
- [ ] Documentazione letta (docs/SUPABASE_STORAGE_SETUP.md)

---

## 🆘 Troubleshooting

### Errore: "Mancano le credenziali Supabase"
- Controlla che variabili Vercel siano salvate
- Redeploy dopo aver aggiunto variabili

### Errore: "Errore generazione URL upload" (403)
- Verifica RLS policy su bucket
- Controlla service_role key corretta

### File non appare su Supabase
- Controlla policy RLS (deve consentire INSERT)
- Verifica bucket name: `patient-documents`
- Controlla logs Supabase Storage

### Upload lento/timeout
- File troppo grande? (max 10MB)
- Connessione internet lenta?
- Prova file più piccolo per test

---

## 🎉 Congratulazioni!

Sistema completo! Ora puoi:
- ✅ Accettare file fino a **10MB** (prima 2MB)
- ✅ Nessun limite Vercel (upload NON passa dal server)
- ✅ Database leggero (salva solo path, non blob)
- ✅ Eliminazione automatica file temporanei
- ✅ Gratis (piano Supabase free sufficiente)

**Prossimo passo**: Testa in produzione con pazienti reali! 🚀
