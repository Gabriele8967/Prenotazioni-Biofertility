const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_i5PqfmEBnR2d@ep-polished-hill-agxsfgwn-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function main() {
  try {
    console.log('🔍 Cercando Simona Cariello...\n');

    // Cerca pazienti per nome
    const patients = await prisma.user.findMany({
      where: {
        role: 'PATIENT',
        OR: [
          { name: { contains: 'Simona', mode: 'insensitive' } },
          { name: { contains: 'Cariello', mode: 'insensitive' } },
          { email: { contains: 'cariello', mode: 'insensitive' } }
        ]
      },
      include: {
        bookingsAsPatient: {
          orderBy: { createdAt: 'desc' },
          include: {
            service: true
          }
        }
      }
    });

    if (patients.length === 0) {
      console.log('❌ Nessun paziente trovato con nome Simona Cariello\n');

      // Mostra ultimi 10 pazienti per debug
      console.log('=== ULTIMI 10 PAZIENTI CREATI ===\n');
      const recent = await prisma.user.findMany({
        where: { role: 'PATIENT' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          bookingsAsPatient: {
            select: { id: true, status: true, createdAt: true },
            take: 1
          }
        }
      });

      recent.forEach(p => {
        console.log(`${p.name} - ${p.email} - ${p.createdAt.toISOString()}`);
        if (p.bookingsAsPatient.length > 0) {
          console.log(`  └─ Ultima prenotazione: ID ${p.bookingsAsPatient[0].id} (${p.bookingsAsPatient[0].status})`);
        }
      });

      return;
    }

    console.log(`✅ Trovati ${patients.length} pazienti:\n`);

    patients.forEach((patient) => {
      console.log(`\n--- PAZIENTE ---`);
      console.log(`ID: ${patient.id}`);
      console.log(`Nome: ${patient.name}`);
      console.log(`Email: ${patient.email}`);
      console.log(`Telefono: ${patient.phone || 'N/A'}`);
      console.log(`CF: ${patient.fiscalCode || 'N/A'}`);
      console.log(`Creato: ${patient.createdAt}`);
      console.log(`Aggiornato: ${patient.updatedAt}`);

      console.log(`\n📅 PRENOTAZIONI (${patient.bookingsAsPatient.length}):`);
      patient.bookingsAsPatient.forEach((b, i) => {
        console.log(`\n  ${i + 1}. Prenotazione ID: ${b.id}`);
        console.log(`     Data: ${b.startTime}`);
        console.log(`     Servizio: ${b.service.name}`);
        console.log(`     Status: ${b.status}`);
        console.log(`     Payment Status: ${b.paymentStatus || 'N/A'}`);
        console.log(`     Stripe Session: ${b.stripeSessionId || 'N/A'}`);
        console.log(`     Fattura ID: ${b.fatturaId || 'N/A'}`);
        console.log(`     Creato: ${b.createdAt}`);
        console.log(`     Google Event: ${b.googleEventId || 'N/A'}`);
      });
      console.log('\n' + '='.repeat(60) + '\n');
    });

    // Mostra prenotazioni recenti
    console.log('\n=== PRENOTAZIONI RECENTI (ultimi 7 giorni) ===\n');
    const recentBookings = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true
          }
        },
        service: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Totale: ${recentBookings.length} prenotazioni\n`);
    recentBookings.forEach(b => {
      const fatturaInfo = b.fatturaId ? `Fattura ID: ${b.fatturaId}` : 'Nessuna fattura';
      console.log(`${b.createdAt.toISOString()} | ${b.patient.name} | ${b.service.name} | Status: ${b.status} | Payment: ${b.paymentStatus} | ${fatturaInfo}`);
    });

  } catch (error) {
    console.error('\n❌ ERRORE:', error);
    console.error('Stack:', error.stack);
  }
}

main()
  .catch((e) => {
    console.error('❌ Errore:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
