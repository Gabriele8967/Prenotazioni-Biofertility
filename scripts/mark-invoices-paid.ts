import { db } from '../lib/db';

/**
 * Script per aggiornare tutte le prenotazioni con fattura a paymentStatus = 'PAID'
 * Questo script è necessario perché le fatture sono già state pagate dai pazienti,
 * ma il campo paymentStatus potrebbe non essere aggiornato correttamente.
 */
async function markInvoicesAsPaid() {
  try {
    console.log('🔍 Cercando prenotazioni con fattura non marcate come PAID...');

    // Trova tutte le prenotazioni che hanno una fattura ma non sono marcate come PAID
    const bookingsToUpdate = await db.booking.findMany({
      where: {
        fatturaId: {
          not: null
        },
        paymentStatus: {
          not: 'PAID'
        }
      },
      include: {
        patient: true,
        service: true
      }
    });

    console.log(`\n📊 Trovate ${bookingsToUpdate.length} prenotazioni da aggiornare\n`);

    if (bookingsToUpdate.length === 0) {
      console.log('✅ Tutte le fatture sono già marcate come PAID');
      return;
    }

    // Mostra i dettagli delle prenotazioni da aggiornare
    console.log('Dettagli prenotazioni da aggiornare:');
    bookingsToUpdate.forEach((booking, index) => {
      console.log(`\n${index + 1}. Booking ID: ${booking.id}`);
      console.log(`   Paziente: ${booking.patient.name}`);
      console.log(`   Servizio: ${booking.service.name}`);
      console.log(`   Fattura ID: ${booking.fatturaId}`);
      console.log(`   Stato pagamento attuale: ${booking.paymentStatus}`);
    });

    console.log('\n🔄 Aggiornamento in corso...\n');

    // Aggiorna tutte le prenotazioni
    const result = await db.booking.updateMany({
      where: {
        fatturaId: {
          not: null
        },
        paymentStatus: {
          not: 'PAID'
        }
      },
      data: {
        paymentStatus: 'PAID'
      }
    });

    console.log(`✅ ${result.count} prenotazioni aggiornate con successo a paymentStatus = 'PAID'\n`);

    // Verifica finale
    const remainingUnpaid = await db.booking.count({
      where: {
        fatturaId: {
          not: null
        },
        paymentStatus: {
          not: 'PAID'
        }
      }
    });

    if (remainingUnpaid === 0) {
      console.log('✅ Verifica completata: tutte le fatture sono ora marcate come PAID');
    } else {
      console.warn(`⚠️  Attenzione: ${remainingUnpaid} fatture non sono ancora marcate come PAID`);
    }

  } catch (error) {
    console.error('❌ Errore durante l\'aggiornamento delle fatture:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Esegui lo script
markInvoicesAsPaid()
  .then(() => {
    console.log('\n✨ Script completato con successo');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script fallito:', error);
    process.exit(1);
  });
