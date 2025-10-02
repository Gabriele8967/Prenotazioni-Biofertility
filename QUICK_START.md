# Guida Rapida - Avvio Immediato

## Setup Locale in 5 Minuti

### 1. Installa Dipendenze
```bash
npm install
```

### 2. Configura Database (Opzione Veloce: Neon)

1. Vai su https://neon.tech
2. Crea account gratuito
3. Crea nuovo progetto
4. Copia la connection string

### 3. Setup Google Calendar (Semplificato)

**NOTA**: Per test rapidi, puoi saltare Google Calendar. Il sistema funzionerà ma senza sincronizzazione calendar.

Per setup completo:
1. https://console.cloud.google.com/
2. Nuovo Progetto → Abilita "Google Calendar API"
3. Credenziali → OAuth 2.0 → Crea
4. Redirect URI: `http://localhost:3000/api/auth/callback/google`

### 4. Crea File .env

```bash
cp .env.example .env
```

Modifica `.env` (minimo richiesto):

```env
DATABASE_URL="postgresql://user:pass@host/db"  # Da Neon
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"   # Esegui il comando
ADMIN_EMAIL="admin@test.com"
ADMIN_PASSWORD="admin123"

# Opzionali (per Google Calendar)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALENDAR_ID=""
PAYMENT_LINK_URL="https://example.com/pay"
```

### 5. Inizializza Database

```bash
npm run db:push
npm run db:seed
```

### 6. Avvia!

```bash
npm run dev
```

Apri: http://localhost:3000

## Credenziali Primo Accesso

- **Admin**: http://localhost:3000/admin/login
  - Email: `admin@test.com` (o quello che hai messo in .env)
  - Password: `admin123`

## Prossimi Passi

1. Login come admin
2. Vai in "Gestione Staff" → Crea un operatore
3. Vai in "Gestione Visite" → Crea una visita e assegna l'operatore
4. Testa la prenotazione su http://localhost:3000/prenotazioni

## Deploy su Vercel (3 comandi)

```bash
npm i -g vercel
vercel
vercel --prod
```

Poi configura le variabili d'ambiente su Vercel Dashboard.

## Problemi Comuni

**Errore Database?**
- Controlla `DATABASE_URL` in `.env`
- Verifica che il database sia raggiungibile

**Errore NEXTAUTH_SECRET?**
- Genera con: `openssl rand -base64 32`
- Incollalo in `.env`

**Slot non si caricano?**
- Se non hai configurato Google Calendar, gli slot non appariranno
- Configura Google Calendar per avere slot disponibili

## Supporto Veloce

Hai problemi? Controlla:
1. Console browser (F12) per errori frontend
2. Console terminale per errori backend
3. README.md per guida completa
