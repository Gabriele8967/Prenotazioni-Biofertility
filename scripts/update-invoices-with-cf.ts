import axios from 'axios';
import { db } from '../lib/db';

const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
const FIC_API_URL = 'https://api-v2.fattureincloud.it';
const COMPANY_ID = parseInt(process.env.FATTUREINCLOUD_COMPANY_ID || '0', 10);

async function updateInvoiceWithFiscalCode(invoiceId: string, fiscalCode: string) {
  try {
    // 1. Recupera la fattura esistente
    const getResponse = await axios.get(
      `${FIC_API_URL}/c/${COMPANY_ID}/issued_documents/${invoiceId}`,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const invoice = getResponse.data.data;
    console.log(`   Fattura ${invoiceId} recuperata: ${invoice.entity.name}`);

    // 2. Aggiorna la fattura con il codice fiscale
    const updatePayload = {
      data: {
        ...invoice,
        entity: {
          ...invoice.entity,
          tax_code: fiscalCode
        }
      }
    };

    await axios.put(
      `${FIC_API_URL}/c/${COMPANY_ID}/issued_documents/${invoiceId}`,
      updatePayload,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`   ✅ Fattura ${invoiceId} aggiornata con CF: ${fiscalCode}`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Errore aggiornamento fattura ${invoiceId}:`, error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 AGGIORNAMENTO FATTURE CON CODICE FISCALE\n');

  // Trova le prenotazioni specifiche
  const bookings = await db.booking.findMany({
    where: {
      id: {
        in: [
          'cmghqbh6j0002w51esp9fspxs', // Francesco Battaglia
          'cmgjeqzov0002j6dlbvprdalh', // Rossana Pizzicoli - Prima visita
          'cmgjewn020001t0rwd02paa6k'  // Rossana Pizzicoli - Spermiogramma
        ]
      }
    },
    include: {
      patient: true,
      service: true
    }
  });

  console.log(`📋 Trovate ${bookings.length} prenotazioni da aggiornare\n`);

  for (const booking of bookings) {
    console.log(`\n👤 ${booking.patient.name}`);
    console.log(`   Email: ${booking.patient.email}`);
    console.log(`   CF: ${booking.patient.fiscalCode || '❌ MANCANTE'}`);
    console.log(`   Servizio: ${booking.service.name}`);
    console.log(`   Fattura ID: ${booking.fatturaId}`);

    if (!booking.patient.fiscalCode) {
      console.log('   ⚠️  SKIP: Codice fiscale mancante nel database');
      continue;
    }

    if (!booking.fatturaId) {
      console.log('   ⚠️  SKIP: Nessuna fattura associata');
      continue;
    }

    // Aggiorna la fattura
    await updateInvoiceWithFiscalCode(booking.fatturaId, booking.patient.fiscalCode);
  }

  console.log('\n\n✅ Processo completato!\n');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
