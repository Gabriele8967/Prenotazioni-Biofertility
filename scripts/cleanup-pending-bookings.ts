/**
 * Script per la pulizia automatica delle prenotazioni PENDING vecchie
 *
 * Questo script elimina le prenotazioni che:
 * - Hanno status PENDING
 * - Sono state create più di 2 ore fa
 * - Non hanno un pagamento completato
 *
 * Può essere eseguito manualmente o schedulato con un cron job
 *
 * Uso: npx tsx scripts/cleanup-pending-bookings.ts [--dry-run]
 */

import { db } from '../lib/db';

const DRY_RUN = process.argv.includes('--dry-run');
const MAX_AGE_HOURS = 2; // Elimina booking PENDING più vecchi di 2 ore

async function cleanupPendingBookings() {
  console.log('🧹 Avvio pulizia prenotazioni PENDING...\n');

  if (DRY_RUN) {
    console.log('⚠️  MODALITÀ DRY-RUN: nessuna modifica verrà effettuata\n');
  }

  const cutoffTime = new Date();
  cutoffTime.setHours(cutoffTime.getHours() - MAX_AGE_HOURS);

  console.log(`📅 Cerco prenotazioni PENDING create prima del: ${cutoffTime.toLocaleString('it-IT')}`);

  try {
    // Trova tutti i booking PENDING vecchi
    const oldPendingBookings = await db.booking.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        createdAt: {
          lt: cutoffTime,
        },
      },
      include: {
        patient: {
          select: {
            name: true,
            email: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
    });

    if (oldPendingBookings.length === 0) {
      console.log('\n✅ Nessuna prenotazione PENDING da eliminare\n');
      return;
    }

    console.log(`\n🔍 Trovate ${oldPendingBookings.length} prenotazioni PENDING da eliminare:\n`);

    for (const booking of oldPendingBookings) {
      const age = Math.round((Date.now() - booking.createdAt.getTime()) / (1000 * 60 * 60));
      console.log(`  • ID: ${booking.id}`);
      console.log(`    Paziente: ${booking.patient.name} (${booking.patient.email})`);
      console.log(`    Servizio: ${booking.service.name}`);
      console.log(`    Data appuntamento: ${booking.startTime.toLocaleString('it-IT')}`);
      console.log(`    Creata: ${booking.createdAt.toLocaleString('it-IT')} (${age}h fa)`);
      console.log(`    Stripe Session: ${booking.stripeSessionId || 'N/D'}`);
      console.log('');
    }

    if (!DRY_RUN) {
      console.log('🗑️  Eliminazione in corso...\n');

      const deleteResult = await db.booking.deleteMany({
        where: {
          id: {
            in: oldPendingBookings.map(b => b.id),
          },
        },
      });

      console.log(`✅ ${deleteResult.count} prenotazioni PENDING eliminate con successo\n`);
    } else {
      console.log('⚠️  DRY-RUN: le prenotazioni sopra NON sono state eliminate\n');
      console.log('💡 Rimuovi --dry-run per effettuare la pulizia\n');
    }

    // Statistiche finali
    const totalPending = await db.booking.count({
      where: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
      },
    });

    const totalPaid = await db.booking.count({
      where: {
        paymentStatus: 'PAID',
      },
    });

    console.log('📊 STATISTICHE DATABASE:');
    console.log(`   Booking PENDING rimasti: ${totalPending}`);
    console.log(`   Booking PAID totali: ${totalPaid}`);
    console.log('');

  } catch (error) {
    console.error('❌ Errore durante la pulizia:', error);
    process.exit(1);
  }
}

// Esegui lo script
cleanupPendingBookings()
  .then(() => {
    console.log('✅ Pulizia completata\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Errore fatale:', error);
    process.exit(1);
  });
