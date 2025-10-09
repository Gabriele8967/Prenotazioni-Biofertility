import { db } from '../lib/db';
import { createAndSendInvoice } from '../lib/fattureincloud';

const bookingIds = [
  'cmgjeqzov0002j6dlbvprdalh', // Rossana - Prima visita (fattura 474600196)
  'cmgjewn020001t0rwd02paa6k', // Rossana - Spermiogramma (fattura 474601615)
  'cmghqbh6j0002w51esp9fspxs', // Francesco - Consulto (fattura 474649622)
];

async function regenerateInvoice(bookingId: string, oldInvoiceId: string) {
  try {
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        patient: true,
        service: true,
        staff: true
      }
    });

    if (!booking) {
      console.error(`   ❌ Prenotazione ${bookingId} non trovata`);
      return false;
    }

    console.log(`\n👤 ${booking.patient.name}`);
    console.log(`   Email: ${booking.patient.email}`);
    console.log(`   CF: ${booking.patient.fiscalCode}`);
    console.log(`   Servizio: ${booking.service.name} (€${booking.service.price})`);
    console.log(`   Vecchia fattura: ${oldInvoiceId}`);
    console.log(`   🔄 Creazione nuova fattura...`);

    const { invoiceId } = await createAndSendInvoice(bookingId);

    if (invoiceId) {
      await db.booking.update({
        where: { id: bookingId },
        data: { fatturaId: invoiceId.toString() }
      });

      console.log(`   ✅ Nuova fattura creata: ${invoiceId}`);
      console.log(`   ⚠️  IMPORTANTE: Elimina manualmente la vecchia fattura ${oldInvoiceId} da Fatture in Cloud`);
      return true;
    }

    return false;
  } catch (error: any) {
    console.error(`   ❌ Errore:`, error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 RIGENERAZIONE FATTURE CON STATO CORRETTO\n');
  console.log('⚠️  ATTENZIONE: Questo script creerà NUOVE fatture.');
  console.log('   Dovrai eliminare manualmente le vecchie da Fatture in Cloud.\n');

  const invoices = [
    { bookingId: bookingIds[0], oldId: '474600196' },
    { bookingId: bookingIds[1], oldId: '474601615' },
    { bookingId: bookingIds[2], oldId: '474649622' },
  ];

  let successCount = 0;

  for (const { bookingId, oldId } of invoices) {
    const success = await regenerateInvoice(bookingId, oldId);
    if (success) successCount++;
  }

  console.log('\n\n📊 RIEPILOGO:');
  console.log(`   ✅ Fatture rigenerate: ${successCount}/${invoices.length}`);
  console.log('\n⚠️  PROSSIMI PASSI:');
  console.log('   1. Vai su Fatture in Cloud');
  console.log('   2. Cerca ed elimina le vecchie fatture:');
  console.log('      - 474600196');
  console.log('      - 474601615');
  console.log('      - 474649622');
  console.log('   3. Le nuove fatture avranno lo stato "da inviare" corretto\n');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
