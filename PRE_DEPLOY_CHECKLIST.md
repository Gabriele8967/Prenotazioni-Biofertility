# ✅ Checklist Pre-Deployment

## Prima di fare il deploy in produzione, verifica:

### 🔐 Sicurezza

- [ ] `NEXTAUTH_SECRET` generato con `openssl rand -base64 32` (NON usare valore esempio)
- [ ] Password admin cambiata (NON usare "admin123" in produzione)
- [ ] `.env` aggiunto a `.gitignore` (NON committare secrets)
- [ ] Variabili ambiente configurate su Vercel
- [ ] HTTPS forzato (automatico su Vercel)

### 🗄️ Database

- [ ] PostgreSQL configurato (Neon/Supabase)
- [ ] Connection string testata
- [ ] Schema Prisma impostato su `provider = "postgresql"`
- [ ] Migrations pronte (`prisma/migrations/`)
- [ ] Plan backup configurato

### 🔌 Integrazioni

- [ ] Google Calendar API configurata (opzionale)
- [ ] OAuth redirect URIs aggiornati con dominio produzione
- [ ] Link pagamento configurato (URL reale provider)
- [ ] Email service configurato (opzionale)

### ⚙️ Configurazione

- [ ] `NEXTAUTH_URL` impostato su dominio produzione
- [ ] Tutte le env variables necessarie presenti su Vercel
- [ ] `vercel.json` configurato
- [ ] `next.config.ts` ottimizzato

### 🧪 Test

- [ ] Build locale funziona: `npm run build`
- [ ] Nessun errore TypeScript
- [ ] Test login admin funzionante
- [ ] Test creazione servizio/staff
- [ ] Test prenotazione completa
- [ ] API testate e funzionanti

### 📝 Documentazione

- [ ] README.md aggiornato
- [ ] DEPLOYMENT.md letto e compreso
- [ ] Credenziali admin documentate (sicure)
- [ ] Procedura rollback documentata

### 🚀 Vercel

- [ ] Repository Git creato e pushato
- [ ] Progetto importato su Vercel
- [ ] Build command: `npm run vercel-build`
- [ ] Framework: Next.js
- [ ] Region scelta (es. fra1 per Europa)

### 📊 Post-Deploy

- [ ] Primo deploy riuscito
- [ ] Database migrations eseguite
- [ ] Admin user creato (seed)
- [ ] Test login produzione
- [ ] Monitoring attivato
- [ ] Logs verificati

---

## ⚠️ IMPORTANTE - Non dimenticare:

1. **Cambia password admin** subito dopo primo login!
2. **Testa tutto** prima di dare accesso a utenti reali
3. **Configura backup** database regolari
4. **Monitora logs** i primi giorni

---

## 🆘 Se qualcosa va storto:

1. Controlla logs Vercel: `vercel logs`
2. Verifica env variables
3. Testa connessione database
4. Rollback a deployment precedente se necessario

---

**Ultimo check**: Hai letto `DEPLOYMENT.md`? ✅

**Pronto per il deploy?** Vai! 🚀
