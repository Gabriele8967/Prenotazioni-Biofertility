import axios from 'axios';
import { db } from '../lib/db';

/**
 * Script per aggiornare le fatture esistenti per mostrare il metodo di pagamento
 * invece delle scadenze
 */

const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
const FIC_API_URL = 'https://api-v2.fattureincloud.it';
const COMPANY_ID = process.env.FATTUREINCLOUD_COMPANY_ID;

async function updateInvoiceToShowPaymentMethod(invoiceId: string, patientName: string) {
  try {
    console.log(`\n🔄 Aggiornamento fattura ${invoiceId} per ${patientName}...`);

    // Prima recuperiamo la fattura per vedere lo stato attuale
    const getResponse = await axios.get(
      `${FIC_API_URL}/c/${COMPANY_ID}/issued_documents/${invoiceId}`,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const currentInvoice = getResponse.data.data;
    console.log(`   show_payment_method attuale: ${currentInvoice.show_payment_method}`);
    console.log(`   payment_method attuale: ${currentInvoice.payment_method?.name || 'N/A'}`);

    // Aggiorna la fattura per mostrare il metodo di pagamento invece delle scadenze
    // show_payments: false nasconde la sezione scadenze
    const updateData = {
      data: {
        show_payments: false, // IMPORTANTE: nasconde "Scadenze" per fatture già pagate
        show_payment_method: true, // Mostra invece il metodo di pagamento
        payment_method: {
          name: 'Stripe',
          is_default: true
        },
        // Assicurati che ei_data sia impostato correttamente per fatture elettroniche
        ei_data: {
          payment_method: 'MP08' // MP08 = Carta di pagamento
        }
      }
    };

    await axios.put(
      `${FIC_API_URL}/c/${COMPANY_ID}/issued_documents/${invoiceId}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`   ✅ Fattura ${invoiceId} aggiornata per mostrare metodo di pagamento`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Errore aggiornamento fattura ${invoiceId}:`, error.response?.data || error.message);
    return false;
  }
}

async function updateAllInvoices() {
  try {
    console.log('🔍 Cercando prenotazioni con paymentStatus = PAID...\n');

    // Trova tutte le prenotazioni pagate con fattura
    const paidBookings = await db.booking.findMany({
      where: {
        paymentStatus: 'PAID',
        fatturaId: {
          not: null
        }
      },
      include: {
        patient: true,
        service: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Trovate ${paidBookings.length} prenotazioni pagate con fattura\n`);

    if (paidBookings.length === 0) {
      console.log('✅ Nessuna fattura da aggiornare');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const booking of paidBookings) {
      console.log(`\nPrenotazione: ${booking.patient.name}`);
      console.log(`Servizio: ${booking.service.name} - €${booking.service.price}`);
      console.log(`Fattura ID: ${booking.fatturaId}`);

      const success = await updateInvoiceToShowPaymentMethod(
        booking.fatturaId!,
        booking.patient.name
      );

      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Pausa di 500ms tra le chiamate per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ Fatture aggiornate con successo: ${successCount}`);
    if (failCount > 0) {
      console.log(`❌ Fatture con errori: ${failCount}`);
    }
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Errore durante l\'aggiornamento delle fatture:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Esegui lo script
updateAllInvoices()
  .then(() => {
    console.log('\n✨ Script completato');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script fallito:', error);
    process.exit(1);
  });
