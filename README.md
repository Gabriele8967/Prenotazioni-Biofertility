# Sistema di Prenotazione Centro Medico

Sistema completo di prenotazione visite mediche online con integrazione Google Calendar e gestione pagamenti.

## Caratteristiche Principali

- **Interfaccia Pazienti**: Sistema di prenotazione step-by-step intuitivo
- **Dashboard Admin**: Gestione completa di visite, operatori, e prenotazioni
- **Dashboard Staff**: Visualizzazione appuntamenti per operatori
- **Google Calendar**: Sincronizzazione automatica con il calendario del centro
- **Sistema Pagamenti**: Link personalizzabile per completare i pagamenti
- **Autenticazione**: Sistema sicuro con NextAuth.js
- **Database**: PostgreSQL con Prisma ORM
- **UI Moderna**: Tailwind CSS + shadcn/ui

## Stack Tecnologico

- **Framework**: Next.js 15 con App Router
- **Database**: PostgreSQL + Prisma ORM
- **Autenticazione**: NextAuth.js v5
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **Calendar**: Google Calendar API
- **Deployment**: Vercel

## Installazione e Setup

### 1. Prerequisiti

- Node.js 18+ installato
- PostgreSQL database (locale o remoto, es. Supabase, Neon)
- Account Google Cloud per Calendar API
- npm o yarn

### 2. Clona e Installa Dipendenze

```bash
cd "Gestione Prenotazioni"
npm install
```

### 3. Configurazione Database

Crea un database PostgreSQL. Puoi usare:
- **Locale**: PostgreSQL installato sul tuo computer
- **Cloud**: Supabase, Neon, Railway, etc.

### 4. Configura Google Calendar API

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuovo progetto
3. Abilita Google Calendar API
4. Crea credenziali OAuth 2.0
5. Aggiungi redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Scarica le credenziali (Client ID e Client Secret)
7. Crea o seleziona un Google Calendar e copia l'ID

### 5. Configura Variabili d'Ambiente

Copia `.env.example` in `.env`:

```bash
cp .env.example .env
```

Modifica `.env` con i tuoi valori:

```env
# Database PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/medical_booking"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="genera-con: openssl rand -base64 32"

# Google Calendar API
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALENDAR_ID="your-calendar-id@group.calendar.google.com"

# Payment Link
PAYMENT_LINK_URL="https://your-payment-provider.com/pay"

# Admin credentials (primo accesso)
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="admin123"
```

**IMPORTANTE**: Genera un NEXTAUTH_SECRET sicuro:
```bash
openssl rand -base64 32
```

### 6. Inizializza Database

```bash
# Sincronizza schema database
npm run db:push

# Crea utente admin iniziale
npm run db:seed
```

### 7. Avvia l'Applicazione

```bash
npm run dev
```

L'applicazione sarà disponibile su: `http://localhost:3000`

## Primo Accesso

1. Vai su `http://localhost:3000/admin/login`
2. Usa le credenziali definite in `.env`:
   - Email: valore di `ADMIN_EMAIL`
   - Password: valore di `ADMIN_PASSWORD`
3. **IMPORTANTE**: Cambia la password admin dopo il primo accesso!

## Utilizzo

### Come Amministratore

1. **Gestione Visite** (`/admin/services`):
   - Crea nuove visite con nome, descrizione, durata, prezzo
   - Aggiungi note importanti per i pazienti
   - Assegna operatori alle visite

2. **Gestione Staff** (`/admin/staff`):
   - Aggiungi operatori/medici
   - Gestisci credenziali di accesso

3. **Visualizza Prenotazioni** (`/admin/bookings`):
   - Monitora tutte le prenotazioni
   - Verifica stato pagamenti

4. **Impostazioni** (`/admin/settings`):
   - Configura link di pagamento personalizzato

### Come Staff

1. Login su `/staff/login`
2. Visualizza i tuoi appuntamenti in `/staff/dashboard`

### Come Paziente

1. Vai su `/prenotazioni`
2. Segui i 4 passaggi:
   - Scegli la visita
   - Seleziona l'operatore
   - Scegli data e orario disponibile
   - Inserisci i tuoi dati
3. Ricevi conferma e link per il pagamento

## Deployment su Vercel

### Setup Veloce

1. **Crea account su Vercel** (se non lo hai): https://vercel.com

2. **Database PostgreSQL in Cloud**:
   - Opzione consigliata: [Neon](https://neon.tech) (free tier disponibile)
   - O usa: Supabase, Railway, Render

3. **Deploy su Vercel**:

```bash
# Installa Vercel CLI
npm i -g vercel

# Deploy
vercel
```

4. **Configura Variabili d'Ambiente su Vercel**:
   - Vai su Vercel Dashboard → Settings → Environment Variables
   - Aggiungi tutte le variabili dal file `.env`:
     - `DATABASE_URL`
     - `NEXTAUTH_URL` (cambia con URL produzione)
     - `NEXTAUTH_SECRET`
     - `GOOGLE_CLIENT_ID`
     - `GOOGLE_CLIENT_SECRET`
     - `GOOGLE_CALENDAR_ID`
     - `PAYMENT_LINK_URL`
     - `ADMIN_EMAIL`
     - `ADMIN_PASSWORD`

5. **Aggiorna Google OAuth Redirect URI**:
   - Aggiungi su Google Cloud Console: `https://tuo-dominio.vercel.app/api/auth/callback/google`

6. **Rideploy**:
```bash
vercel --prod
```

### Deploy Automatico con GitHub

1. Pusha il codice su GitHub
2. Importa il progetto su Vercel
3. Configura le variabili d'ambiente
4. Vercel farà deploy automatico ad ogni push

## Struttura Progetto

```
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/              # NextAuth endpoints
│   │   ├── services/          # API servizi pubblici
│   │   ├── bookings/          # API prenotazioni
│   │   ├── available-slots/   # API slot disponibili
│   │   └── admin/             # API protette admin
│   ├── admin/                 # Dashboard admin
│   ├── staff/                 # Dashboard staff
│   ├── prenotazioni/          # Interfaccia prenotazione pazienti
│   └── page.tsx              # Homepage
├── components/ui/             # Componenti UI riutilizzabili
├── lib/
│   ├── db.ts                 # Client Prisma
│   ├── auth.ts               # Configurazione NextAuth
│   └── google-calendar.ts    # Integrazione Google Calendar
├── prisma/
│   ├── schema.prisma         # Schema database
│   └── seed.ts               # Script inizializzazione
└── types/                    # Type definitions TypeScript
```

## Comandi Utili

```bash
# Sviluppo
npm run dev

# Build produzione
npm run build

# Start produzione
npm run start

# Database
npm run db:push      # Sincronizza schema
npm run db:seed      # Popola dati iniziali
npm run db:studio    # Apri Prisma Studio (UI database)

# Lint
npm run lint
```

## Sicurezza

- Le password sono hashate con bcrypt
- Autenticazione JWT con NextAuth.js
- API protette con middleware
- Validazione input lato server
- HTTPS obbligatorio in produzione

## Troubleshooting

### Errore connessione database
- Verifica `DATABASE_URL` in `.env`
- Assicurati che PostgreSQL sia avviato
- Controlla firewall/network per connessioni cloud

### Google Calendar non funziona
- Verifica credenziali `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
- Controlla che Calendar API sia abilitata su Google Cloud
- Verifica redirect URI configurati

### Errori di autenticazione
- Rigenera `NEXTAUTH_SECRET`
- Verifica `NEXTAUTH_URL` corrisponda all'URL effettivo
- Cancella cookie del browser

## Personalizzazioni

### Orari di Lavoro

Modifica in `lib/google-calendar.ts`:

```typescript
const workStart = 9;   // Ora inizio
const workEnd = 19;    // Ora fine
```

### Intervalli Slot

Modifica il ciclo in `lib/google-calendar.ts` per cambiare intervalli (default 30 min):

```typescript
for (let minute of [0, 30]) {  // Cambia in [0, 15, 30, 45] per slot 15min
```

### Colori e Stili

Modifica `tailwind.config.ts` e `app/globals.css`

## Supporto

Per problemi o domande:
- Apri una issue su GitHub
- Consulta la documentazione Next.js: https://nextjs.org/docs
- Consulta la documentazione Prisma: https://www.prisma.io/docs

## Licenza

Questo progetto è sviluppato per uso privato del centro medico.

---

**Sviluppato con Next.js, React, Prisma, e PostgreSQL**
