import { db } from '../lib/db';
import { createAndSendInvoice } from '../lib/fattureincloud';

async function main() {
  // Cerca le prenotazioni di Rossana Pizzicoli e Francesco Battaglia
  const patients = await db.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Rossana', mode: 'insensitive' } },
        { name: { contains: 'Pizzicoli', mode: 'insensitive' } },
        { name: { contains: 'Francesco', mode: 'insensitive' } },
        { name: { contains: 'Battaglia', mode: 'insensitive' } },
      ],
      role: 'PATIENT'
    },
    select: {
      id: true,
      name: true,
      email: true,
      fiscalCode: true,
      bookingsAsPatient: {
        where: {
          paymentStatus: 'PAID',
          fatturaId: { not: null }
        },
        select: {
          id: true,
          fatturaId: true,
          startTime: true,
          service: {
            select: {
              name: true,
              price: true
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        }
      }
    }
  });

  console.log('\n📋 PAZIENTI TROVATI:\n');

  for (const patient of patients) {
    console.log(`\n👤 ${patient.name} (${patient.email})`);
    console.log(`   CF: ${patient.fiscalCode || '❌ MANCANTE'}`);
    console.log(`   Prenotazioni pagate: ${patient.bookingsAsPatient.length}`);

    if (patient.bookingsAsPatient.length > 0) {
      console.log('\n   Fatture esistenti:');
      for (const booking of patient.bookingsAsPatient) {
        console.log(`   - Booking ID: ${booking.id}`);
        console.log(`     Fattura ID: ${booking.fatturaId}`);
        console.log(`     Data: ${booking.startTime.toLocaleDateString('it-IT')}`);
        console.log(`     Servizio: ${booking.service.name} (€${booking.service.price})`);
      }
    }
  }

  // Chiedi conferma per rigenerare
  console.log('\n\n⚠️  ATTENZIONE: Vuoi rigenerare le fatture? (y/n)');
  console.log('   Questo creerà NUOVE fatture su Fatture in Cloud.');
  console.log('   Le vecchie fatture NON verranno eliminate automaticamente.\n');

  // Per ora solo mostra i dati, non rigenera
  console.log('ℹ️  Per rigenerare, decommentare il codice di rigenerazione nello script.\n');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
