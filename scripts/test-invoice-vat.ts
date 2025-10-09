/**
 * Script per testare la creazione fattura con IVA esente corretta
 * per verificare che l'importo appaia correttamente nell'elenco
 */

import { db } from '../lib/db';
import { createAndSendInvoice } from '../lib/fattureincloud';

async function testInvoiceVat() {
  try {
    const patientEmail = 'battaglia.francesco1991@gmail.com';
    
    console.log(`🔍 Ricerca prenotazione per ${patientEmail}...`);
    
    const booking = await db.booking.findFirst({
      where: {
        patient: {
          email: patientEmail
        },
        paymentStatus: 'PAID'
      },
      include: {
        patient: true,
        service: true,
        staff: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!booking) {
      console.log(`❌ Nessuna prenotazione trovata per ${patientEmail}`);
      return;
    }

    console.log(`\n📄 Prenotazione trovata:`);
    console.log(`   ID: ${booking.id}`);
    console.log(`   Servizio: ${booking.service.name} - €${booking.service.price}`);
    console.log(`   Fattura esistente: ${booking.fatturaId || 'NESSUNA'}`);

    if (booking.fatturaId) {
      console.log(`\n⚠️  Esiste già una fattura con ID: ${booking.fatturaId}`);
      console.log(`   Vuoi comunque creare una nuova fattura? (Ctrl+C per annullare, Enter per continuare)`);
      
      // Attendi input utente (commenta se vuoi esecuzione automatica)
      // await new Promise(resolve => process.stdin.once('data', resolve));
    }

    console.log(`\n🔄 Creazione fattura di test...`);
    
    const { invoiceId } = await createAndSendInvoice(booking.id);
    
    if (invoiceId) {
      console.log(`\n✅ Fattura ${invoiceId} creata con successo!`);
      console.log(`\n📋 VERIFICA SU FATTURE IN CLOUD:`);
      console.log(`   1. Accedi a Fatture in Cloud`);
      console.log(`   2. Vai all'elenco fatture`);
      console.log(`   3. Cerca la fattura ID: ${invoiceId}`);
      console.log(`   4. Verifica che l'importo appaia come €${booking.service.price} (non €0,00)`);
      console.log(`\n   Se l'importo appare correttamente, la correzione funziona! 🎉`);
    } else {
      console.log(`\n⚠️  createAndSendInvoice ha restituito invoiceId null`);
    }

  } catch (error: any) {
    console.error('\n❌ Errore durante il test:', error.message);
    if (error.response?.data) {
      console.error('Dettagli API:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Esegui il test
testInvoiceVat().catch(error => {
  console.error('Errore fatale:', error);
  process.exit(1);
});
