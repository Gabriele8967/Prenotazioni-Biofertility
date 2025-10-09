import axios from 'axios';
import { db } from '../lib/db';

/**
 * Script per aggiornare lo stato delle fatture su Fatture in Cloud a "pagato"
 * per le prenotazioni che hanno paymentStatus = 'PAID' nel database
 */

const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
const FIC_API_URL = 'https://api-v2.fattureincloud.it';
const COMPANY_ID = process.env.FATTUREINCLOUD_COMPANY_ID;

let defaultPaymentAccountId: number | null = null;

async function getDefaultPaymentAccount(): Promise<number> {
  if (defaultPaymentAccountId) return defaultPaymentAccountId;

  try {
    const response = await axios.get(
      `${FIC_API_URL}/c/${COMPANY_ID}/settings/payment_accounts`,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const accounts = response.data.data;
    if (accounts && accounts.length > 0) {
      console.log('\n📋 Conti di pagamento disponibili:');
      accounts.forEach((acc: any, idx: number) => {
        console.log(`   ${idx + 1}. ${acc.name} (ID: ${acc.id})`);
      });

      // Cerca un conto appropriato per pagamenti con carta/Stripe
      let selectedAccount = accounts.find((acc: any) =>
        acc.name.toLowerCase().includes('stripe') ||
        acc.name.toLowerCase().includes('carta') ||
        acc.name.toLowerCase().includes('card')
      );

      // Se non trovato, usa il primo disponibile
      if (!selectedAccount) {
        selectedAccount = accounts[0];
      }

      defaultPaymentAccountId = selectedAccount.id;
      console.log(`\n✅ Conto di pagamento selezionato: ${selectedAccount.name} (ID: ${defaultPaymentAccountId})\n`);
      return defaultPaymentAccountId;
    }

    throw new Error('Nessun conto di pagamento disponibile');
  } catch (error: any) {
    console.error('❌ Errore nel recupero dei conti di pagamento:', error.response?.data || error.message);
    throw error;
  }
}

async function updateInvoiceAsPaid(invoiceId: string, servicePrice: number, patientName: string) {
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
    console.log(`   Stato pagamenti attuale:`, currentInvoice.payments_list);

    // Aggiorna la fattura con il pagamento marcato come "paid"
    // IMPORTANTE: per Fatture in Cloud, una fattura è considerata saldata solo se ha paid_date
    const today = new Date().toISOString().slice(0, 10);
    const paymentAccountId = await getDefaultPaymentAccount();

    const updateData = {
      data: {
        payments_list: [
          {
            amount: servicePrice,
            due_date: today,
            paid_date: today, // FONDAMENTALE: questa data rende la fattura "saldata"
            status: 'paid',
            payment_account: { id: paymentAccountId }
          }
        ]
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

    console.log(`   ✅ Fattura ${invoiceId} aggiornata come PAGATA`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Errore aggiornamento fattura ${invoiceId}:`, error.response?.data || error.message);
    return false;
  }
}

async function updateAllPaidInvoices() {
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

      const success = await updateInvoiceAsPaid(
        booking.fatturaId!,
        booking.service.price,
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
updateAllPaidInvoices()
  .then(() => {
    console.log('\n✨ Script completato');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script fallito:', error);
    process.exit(1);
  });
