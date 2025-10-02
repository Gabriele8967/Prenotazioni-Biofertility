# 🚀 Guida Deployment Produzione

## Sistema di Prenotazione Centro Medico

Questa guida ti accompagna step-by-step nel deployment del sistema in produzione su **Vercel** con database **PostgreSQL**.

---

## 📋 Prerequisiti

- [ ] Account [Vercel](https://vercel.com) (gratuito)
- [ ] Account [Neon](https://neon.tech) o [Supabase](https://supabase.com) per PostgreSQL (gratuito)
- [ ] Account [Google Cloud](https://console.cloud.google.com/) per Calendar API
- [ ] Git installato e repository creato
- [ ] Codice del progetto pronto

---

## 🗄️ STEP 1: Setup Database PostgreSQL

### Opzione A: Neon (Consigliata)

1. **Crea account** su https://neon.tech
2. **Crea nuovo progetto**:
   - Nome: `medical-booking`
   - Region: Scegli più vicina (es. Frankfurt per EU)
3. **Copia Connection String**:
   ```
   
   ```
4. **Salva** per dopo ✅

### Opzione B: Supabase

1. **Crea account** su https://supabase.com
2. **New Project**:
   - Nome: `medical-booking`
   - Database Password: Genera password sicura
   - Region: Scegli più vicina
3. **Settings > Database > Connection String**
    postgresql://postgres:Zarbonda99BC@1@db.defgscpzubnoahejbulp.supabase.co:5432/postgres
4. **Copia** la stringa "URI" ✅

### Opzione C: PostgreSQL Locale (Solo test)

```bash
# Installa PostgreSQL
# Ubuntu/Debian
sudo apt install postgresql

# Crea database
sudo -u postgres createdb medical_booking
sudo -u postgres createuser medical_user -P

# Connection string
postgresql://medical_user:password@localhost:5432/medical_booking
```

---

## 🔐 STEP 2: Google Calendar API

1. **Vai su** [Google Cloud Console](https://console.cloud.google.com/)

2. **Crea Progetto**:
   - Nuovo Progetto → Nome: "Centro Medico Booking"

3. **Abilita API**:
   - API & Services → Library
   - Cerca "Google Calendar API"
   - Click "Enable"

4. **Crea Credenziali OAuth 2.0**:
   - API & Services → Credentials
   - Create Credentials → OAuth client ID
   - Application type: Web application
   - Name: "Medical Booking System"

5. **Configura Redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   https://tuo-dominio.vercel.app/api/auth/callback/google
   ```

6. **Salva**:
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `xxxxxx`

7. **Ottieni Calendar ID**:
   - Vai su [Google Calendar](https://calendar.google.com)
   - Settings → Impostazioni del calendario
   - Copia "ID calendario" (simile a: `xxxxx@group.calendar.google.com`)

---

## 🔑 STEP 3: Genera NEXTAUTH_SECRET

```bash
# Su Linux/Mac
openssl rand -base64 32

# Su Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Output esempio:
# XxY8zP3mN9kQ5rT2wV7bC4dF6gH1jK0l
```

**Salva questo valore!** ✅

---

## 📦 STEP 4: Deploy su Vercel

### 4.1 Prepara Repository Git

```bash
cd "/percorso/al/progetto/Gestione Prenotazioni"

# Inizializza git (se non fatto)
git init

# Aggiungi file
git add .

# Commit
git commit -m "Initial commit - Medical Booking System"

# Pusha su GitHub
gh repo create medical-booking --public --source=. --remote=origin --push
# OPPURE
# git remote add origin https://github.com/tuo-username/medical-booking.git
# git branch -M main
# git push -u origin main
```

### 4.2 Importa su Vercel

1. **Vai su** [vercel.com/new](https://vercel.com/new)

2. **Import Git Repository**:
   - Connetti GitHub
   - Seleziona repository `medical-booking`

3. **Configura Progetto**:
   - Framework Preset: **Next.js** (auto-detect)
   - Root Directory: `./`
   - Build Command: `npm run vercel-build`
   - Output Directory: `.next` (default)

4. **NON fare deploy ancora!** → Click "Environment Variables" prima

### 4.3 Configura Environment Variables

Aggiungi le seguenti variabili in Vercel:

#### Variabili Obbligatorie:

| Nome | Valore | Tipo |
|------|--------|------|
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Production |
| `NEXTAUTH_URL` | `https://tuo-app.vercel.app` | Production |
| `NEXTAUTH_SECRET` | Output di `openssl rand -base64 32` | Production |
| `ADMIN_EMAIL` | `admin@tuodominio.com` | Production |
| `ADMIN_PASSWORD` | Password sicura admin | Production |

#### Variabili Google Calendar:

| Nome | Valore | Tipo |
|------|--------|------|
| `GOOGLE_CLIENT_ID` | Dal Google Cloud Console | Production |
| `GOOGLE_CLIENT_SECRET` | Dal Google Cloud Console | Production |
| `GOOGLE_CALENDAR_ID` | ID del tuo Google Calendar | Production |

#### Variabile Pagamenti:

| Nome | Valore | Tipo |
|------|--------|------|
| `PAYMENT_LINK_URL` | URL del tuo payment provider | Production |

**Importante**: Lascia vuote le variabili Google se non hai configurato Calendar API (il sistema funzionerà comunque).

### 4.4 Deploy!

1. Click **"Deploy"**
2. Attendi build (3-5 minuti)
3. ✅ Deployment completato!

---

## 🔄 STEP 5: Inizializza Database

### Dopo il primo deployment:

1. **Vercel Dashboard** → Tuo progetto → **Deployments**
2. Click sui 3 puntini → **"Redeploy"**
3. ✅ Check "Use existing Build Cache"
4. Click **"Redeploy"**

Questo eseguirà le migrazioni Prisma automaticamente.

### Alternativa - Manuale da terminale:

```bash
# Imposta DATABASE_URL locale
export DATABASE_URL="la-tua-connection-string-produzione"

# Esegui migrazione
npx prisma migrate deploy

# Seed database (crea admin)
npm run db:seed
```

---

## ✅ STEP 6: Verifica Deployment

### 6.1 Testa il Sito

Vai su: `https://tuo-app.vercel.app`

- [ ] Homepage carica
- [ ] `/prenotazioni` funziona
- [ ] `/admin/login` funziona

### 6.2 Login Admin

1. Vai su `https://tuo-app.vercel.app/admin/login`
2. Credenziali:
   - Email: Valore di `ADMIN_EMAIL`
   - Password: Valore di `ADMIN_PASSWORD`
3. ✅ Accesso riuscito

### 6.3 Crea Primo Staff

1. Dashboard Admin → **Gestione Staff**
2. **+ Nuovo Staff**
3. Compila form e salva

### 6.4 Crea Primo Servizio

1. Dashboard Admin → **Gestione Visite**
2. **+ Nuova Visita**
3. Assegna staff creato
4. Salva

### 6.5 Testa Prenotazione

1. Vai su `/prenotazioni`
2. Segui wizard 4 step
3. ✅ Prenotazione creata

---

## 🔧 STEP 7: Configurazioni Post-Deploy

### 7.1 Custom Domain (Opzionale)

1. **Vercel Dashboard** → Settings → Domains
2. Aggiungi: `prenotazioni.tuodominio.com`
3. Configura DNS come indicato
4. **Aggiorna** `NEXTAUTH_URL` con nuovo dominio

### 7.2 Aggiorna Google OAuth Redirect

Aggiungi nuovo redirect URI:
```
https://tuodominio.com/api/auth/callback/google
```

### 7.3 Monitoring

1. **Vercel Dashboard** → Analytics (attiva)
2. **Vercel Dashboard** → Logs (per debug)

---

## 📊 Monitoraggio Produzione

### Logs in Real-Time

```bash
# Installa Vercel CLI
npm i -g vercel

# Login
vercel login

# Link progetto
vercel link

# Tail logs
vercel logs --follow
```

### Database Monitoring

```bash
# Prisma Studio (GUI database)
npm run db:studio

# O da Neon/Supabase dashboard
```

---

## 🐛 Troubleshooting

### Errore: "Database connection failed"

**Causa**: DATABASE_URL errato o database non raggiungibile

**Fix**:
1. Verifica `DATABASE_URL` in Vercel Environment Variables
2. Assicurati includa `?sslmode=require` per Neon/Supabase
3. Testa connessione locale:
   ```bash
   npx prisma db pull
   ```

### Errore: "NextAuth configuration error"

**Causa**: `NEXTAUTH_URL` o `NEXTAUTH_SECRET` mancanti/errati

**Fix**:
1. Verifica variabili in Vercel
2. `NEXTAUTH_URL` deve essere HTTPS in produzione
3. Rigenera `NEXTAUTH_SECRET` se necessario

### Errore: "Google Calendar API"

**Causa**: Credenziali mancanti o redirect URI non configurato

**Fix**:
1. Verifica `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
2. Aggiungi redirect URI produzione su Google Cloud Console
3. Controlla che API sia abilitata

### Build Fails

**Causa**: Errori TypeScript o dipendenze mancanti

**Fix**:
1. Testa build locale: `npm run build`
2. Controlla errori nei logs Vercel
3. Verifica `node_modules` siano committati in `.gitignore`

---

## 🔄 Aggiornamenti Futuri

### Deploy Nuove Modifiche

```bash
# Fai modifiche al codice
git add .
git commit -m "Descrizione modifiche"
git push origin main
```

✅ Vercel farà **deploy automatico** ad ogni push!

### Rollback Versione Precedente

1. Vercel Dashboard → Deployments
2. Trova deployment funzionante
3. Click 3 puntini → **"Promote to Production"**

---

## 📈 Ottimizzazioni Produzione

### Performance

- ✅ Compressione abilitata (gzip/brotli)
- ✅ Security headers configurati
- ✅ Next.js ottimizzazioni attive
- ✅ Database indexes configurati

### Sicurezza

- ✅ HTTPS forzato
- ✅ Password hashate (bcrypt)
- ✅ CORS configurato
- ✅ SQL injection protetto (Prisma)
- ✅ XSS protection headers

### SEO (Opzionale)

Aggiungi in `app/layout.tsx`:
```typescript
export const metadata: Metadata = {
  title: "Centro Medico - Prenotazione Visite Online",
  description: "Prenota la tua visita medica online facilmente",
  keywords: "centro medico, prenotazione, visite mediche",
};
```

---

## 📞 Supporto

### Risorse Utili

- [Documentazione Vercel](https://vercel.com/docs)
- [Documentazione Prisma](https://www.prisma.io/docs/)
- [Documentazione Next.js](https://nextjs.org/docs)
- [Neon Docs](https://neon.tech/docs)

### Community

- [Next.js Discord](https://nextjs.org/discord)
- [Vercel Community](https://github.com/vercel/vercel/discussions)

---

## ✅ Checklist Finale

Prima di andare live con utenti reali:

- [ ] Database PostgreSQL configurato e funzionante
- [ ] Migrations eseguite correttamente
- [ ] Admin user creato e testato
- [ ] Google Calendar API configurata (opzionale)
- [ ] Link pagamento configurato
- [ ] SSL/HTTPS attivo (Vercel lo fa automaticamente)
- [ ] Test completo del flusso prenotazione
- [ ] Backup strategy pianificata
- [ ] Monitoring attivo
- [ ] Domini personalizzati configurati (se necessario)
- [ ] **Cambiata password admin default!** ⚠️

---

## 🎉 Congratulazioni!

Il tuo sistema di prenotazione è **ONLINE e FUNZIONANTE**! 🚀

**URL Produzione**: `https://tuo-app.vercel.app`

Buon lavoro! 💪
