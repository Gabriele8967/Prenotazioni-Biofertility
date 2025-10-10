import { db } from '@/lib/db';
import { createAndSendInvoice } from '@/lib/fattureincloud';

const BOOKING_ID = 'cmgkruefl0002sm694w2sl0px';

async function retryInvoice() {
  try {
    console.log(`🔄 Tentativo di creazione fattura per booking ${BOOKING_ID}...`);

    const { invoiceId } = await createAndSendInvoice(BOOKING_ID);

    if (invoiceId) {
      await db.booking.update({
        where: { id: BOOKING_ID },
        data: { fatturaId: invoiceId.toString() },
      });
      console.log(`✅ Fattura ${invoiceId} creata e salvata con successo!`);
    } else {
      console.log(`⚠️ Nessuna fattura creata (servizio gratuito?)`);
    }
  } catch (error) {
    console.error(`❌ Errore durante la creazione della fattura:`, error);
    if (error instanceof Error) {
      console.error(`Messaggio: ${error.message}`);
      console.error(`Stack: ${error.stack}`);
    }
  } finally {
    await db.$disconnect();
  }
}

retryInvoice();
