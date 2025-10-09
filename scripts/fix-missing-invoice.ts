/**
 * Script per rigenerare fatture mancanti per prenotazioni pagate
 * 
 * Uso: npx tsx scripts/fix-missing-invoice.ts <email-paziente>
 */

import { db } from '../lib/db';
import { createAndSendInvoice } from '../lib/fattureincloud';

async function fixMissingInvoice(patientEmail: string) {
  try {
    console.log(`🔍 Ricerca prenotazioni pagate per ${patientEmail}...`);
    
    // Trova tutte le prenotazioni pagate senza fattura per questo paziente
    const bookingsWithoutInvoice = await db.booking.findMany({
      where: {
        patient: {
          email: patientEmail
        },
        paymentStatus: 'PAID',
        fatturaId: null
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

    if (bookingsWithoutInvoice.length === 0) {
      console.log(`✅ Nessuna prenotazione pagata senza fattura trovata per ${patientEmail}`);
      console.log(`ℹ️  Verifica se esiste già una fattura su Fatture in Cloud.`);
      
      // Mostra tutte le prenotazioni per debug
      const allBookings = await db.booking.findMany({
        where: {
          patient: {
            email: patientEmail
          }
        },
        include: {
          patient: true,
          service: true
        }
      });
      
      console.log(`\n📋 Tutte le prenotazioni per ${patientEmail}:`);
      allBookings.forEach(booking => {
        console.log(`  - ID: ${booking.id}`);
        console.log(`    Servizio: ${booking.service.name}`);
        console.log(`    Data: ${booking.startTime.toISOString()}`);
        console.log(`    Stato pagamento: ${booking.paymentStatus}`);
        console.log(`    Fattura ID: ${booking.fatturaId || 'NESSUNA'}`);
        console.log(`    Stripe Session: ${booking.stripeSessionId || 'NESSUNA'}`);
        console.log('');
      });
      
      return;
    }

    console.log(`\n📋 Trovate ${bookingsWithoutInvoice.length} prenotazione/i senza fattura:\n`);

    for (const booking of bookingsWithoutInvoice) {
      console.log(`📄 Prenotazione ID: ${booking.id}`);
      console.log(`   Paziente: ${booking.patient.name} (${booking.patient.email})`);
      console.log(`   Servizio: ${booking.service.name} - €${booking.service.price}`);
      console.log(`   Data: ${booking.startTime.toLocaleDateString('it-IT')} ${booking.startTime.toLocaleTimeString('it-IT')}`);
      console.log(`   Stato pagamento: ${booking.paymentStatus}`);
      console.log(`   Stripe Session: ${booking.stripeSessionId || 'N/D'}`);
      
      // Se il servizio è gratuito, salta
      if (booking.service.price === 0) {
        console.log(`   ⚠️  Servizio gratuito, fattura non necessaria.\n`);
        continue;
      }
      
      console.log(`   🔄 Generazione fattura in corso...`);
      
      try {
        const { invoiceId } = await createAndSendInvoice(booking.id);
        
        if (invoiceId) {
          // Aggiorna il booking con l'ID della fattura
          await db.booking.update({
            where: { id: booking.id },
            data: { fatturaId: invoiceId.toString() }
          });
          
          console.log(`   ✅ Fattura ${invoiceId} creata e salvata con successo!\n`);
        } else {
          console.log(`   ⚠️  createAndSendInvoice ha restituito invoiceId null\n`);
        }
      } catch (error: any) {
        console.error(`   ❌ Errore durante la creazione della fattura:`, error.message);
        if (error.response?.data) {
          console.error(`   Dettagli errore API:`, JSON.stringify(error.response.data, null, 2));
        }
        console.log('');
      }
    }

    console.log(`✅ Processo completato!`);

  } catch (error) {
    console.error('❌ Errore durante l\'esecuzione dello script:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Esegui lo script
const patientEmail = process.argv[2];

if (!patientEmail) {
  console.error('❌ Uso: npx tsx scripts/fix-missing-invoice.ts <email-paziente>');
  console.error('   Esempio: npx tsx scripts/fix-missing-invoice.ts battaglia.francesco1991@gmail.com');
  process.exit(1);
}

fixMissingInvoice(patientEmail).catch(error => {
  console.error('Errore fatale:', error);
  process.exit(1);
});
