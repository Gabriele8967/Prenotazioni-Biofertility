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
    console.log('🔍 Cercando pazienti con nomi simili a "Simona" o "Cariello"...\n');

    // Cerca con variazioni più ampie
    const possibleNames = [
      'simona', 'simon', 'cariello', 'cariell', 'cariel',
      'Simona', 'Simon', 'Cariello', 'Cariell', 'Cariel'
    ];

    for (const searchTerm of possibleNames) {
      const results = await prisma.user.findMany({
        where: {
          role: 'PATIENT',
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: {
          bookingsAsPatient: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              service: true
            }
          }
        },
        take: 5
      });

      if (results.length > 0) {
        console.log(`\n✅ Trovati ${results.length} pazienti con "${searchTerm}":\n`);
        results.forEach(p => {
          console.log(`  - ${p.name} | ${p.email} | CF: ${p.fiscalCode || 'N/A'}`);
          console.log(`    Tel: ${p.phone || 'N/A'} | Creato: ${p.createdAt.toISOString()}`);
          if (p.bookingsAsPatient.length > 0) {
            const b = p.bookingsAsPatient[0];
            console.log(`    └─ Ultima prenotazione: ${b.service.name} | ${b.status} | ${b.paymentStatus}`);
          }
        });
      }
    }

    // Cerca anche tutte le prenotazioni degli ultimi 2 giorni
    console.log('\n\n=== TUTTE LE PRENOTAZIONI DEGLI ULTIMI 2 GIORNI ===\n');

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const recent = await prisma.booking.findMany({
      where: {
        createdAt: {
          gte: twoDaysAgo
        }
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
            phone: true,
            fiscalCode: true
          }
        },
        service: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Totale prenotazioni: ${recent.length}\n`);

    recent.forEach((b, i) => {
      console.log(`${i + 1}. ${b.createdAt.toISOString()}`);
      console.log(`   Paziente: ${b.patient.name}`);
      console.log(`   Email: ${b.patient.email}`);
      console.log(`   Telefono: ${b.patient.phone || 'N/A'}`);
      console.log(`   CF: ${b.patient.fiscalCode || 'N/A'}`);
      console.log(`   Servizio: ${b.service.name}`);
      console.log(`   Status: ${b.status} | Payment: ${b.paymentStatus}`);
      console.log(`   Fattura ID: ${b.fatturaId || 'N/A'}`);
      console.log(`   Google Event: ${b.googleEventId || 'N/A'}`);
      console.log('');
    });

    // Cerca prenotazioni con status PENDING che potrebbero aver dato errore
    console.log('\n=== PRENOTAZIONI PENDING (possibili errori) ===\n');

    const pending = await prisma.booking.findMany({
      where: {
        status: 'PENDING',
        createdAt: {
          gte: twoDaysAgo
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

    console.log(`Totale PENDING: ${pending.length}\n`);

    pending.forEach(b => {
      console.log(`- ${b.patient.name} (${b.patient.email})`);
      console.log(`  Servizio: ${b.service.name}`);
      console.log(`  Creato: ${b.createdAt.toISOString()}`);
      console.log(`  Payment Status: ${b.paymentStatus}`);
      console.log(`  Ha fattura: ${b.fatturaId ? 'SI' : 'NO'}`);
      console.log(`  Ha Google Event: ${b.googleEventId ? 'SI' : 'NO'}`);
      console.log('');
    });

  } catch (error) {
    console.error('\n❌ ERRORE:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ Errore finale:', e);
  });
