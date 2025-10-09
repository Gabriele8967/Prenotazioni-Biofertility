import { db } from '../lib/db';
import { createAndSendInvoice } from '../lib/fattureincloud';

async function main() {
  console.log('🔄 CREAZIONE NUOVA FATTURA PER FRANCESCO BATTAGLIA\n');

  const bookingId = 'cmghqbh6j0002w51esp9fspxs';

  // Verifica i dati della prenotazione
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      patient: true,
      service: true,
      staff: true
    }
  });

  if (!booking) {
    console.error('❌ Prenotazione non trovata');
    return;
  }

  console.log('📋 Dati prenotazione:');
  console.log(`   Paziente: ${booking.patient.name}`);
  console.log(`   Email: ${booking.patient.email}`);
  console.log(`   CF: ${booking.patient.fiscalCode}`);
  console.log(`   Servizio: ${booking.service.name}`);
  console.log(`   Prezzo: €${booking.service.price}`);
  console.log(`   Data: ${booking.startTime.toLocaleDateString('it-IT')}`);
  console.log(`   Operatore: ${booking.staff.name}`);
  console.log(`   Stato pagamento: ${booking.paymentStatus}`);
  console.log(`   Vecchia fattura ID: ${booking.fatturaId}\n`);

  if (booking.paymentStatus !== 'PAID') {
    console.error('❌ La prenotazione non è stata pagata. Skip.');
    return;
  }

  if (!booking.patient.fiscalCode) {
    console.error('❌ Codice fiscale mancante nel database. Skip.');
    return;
  }

  console.log('🚀 Creazione nuova fattura su Fatture in Cloud...\n');

  try {
    const { invoiceId } = await createAndSendInvoice(bookingId);

    if (invoiceId) {
      // Aggiorna il booking con il nuovo ID fattura
      await db.booking.update({
        where: { id: bookingId },
        data: { fatturaId: invoiceId.toString() }
      });

      console.log(`\n✅ SUCCESSO!`);
      console.log(`   Nuova fattura creata: ID ${invoiceId}`);
      console.log(`   CF incluso: ${booking.patient.fiscalCode}`);
      console.log(`   Database aggiornato con nuovo ID fattura\n`);
    } else {
      console.error('\n❌ Errore: invoiceId nullo restituito da createAndSendInvoice\n');
    }
  } catch (error: any) {
    console.error('\n❌ ERRORE durante creazione fattura:');
    console.error(error.response?.data || error.message);
    console.error('\nStack trace:', error.stack);
  }
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
