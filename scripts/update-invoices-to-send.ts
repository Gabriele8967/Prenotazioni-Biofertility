import axios from 'axios';

const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
const FIC_API_URL = 'https://api-v2.fattureincloud.it';
const COMPANY_ID = parseInt(process.env.FATTUREINCLOUD_COMPANY_ID || '0', 10);

// Verifica che le variabili siano caricate
if (!FIC_ACCESS_TOKEN || !COMPANY_ID) {
  console.error('❌ Variabili d\'ambiente mancanti:');
  console.error(`   FATTUREINCLOUD_ACCESS_TOKEN: ${FIC_ACCESS_TOKEN ? 'OK' : 'MANCANTE'}`);
  console.error(`   FATTUREINCLOUD_COMPANY_ID: ${COMPANY_ID || 'MANCANTE'}`);
  process.exit(1);
}

// IDs delle fatture da aggiornare
const invoiceIds = [
  '474600196', // Rossana - Prima visita
  '474601615', // Rossana - Spermiogramma
  '474649622', // Francesco - Consulto online
];

async function updateInvoiceToSend(invoiceId: string) {
  try {
    console.log(`\n🔄 Aggiornamento fattura ${invoiceId}...`);

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
    console.log(`   Cliente: ${invoice.entity.name}`);
    console.log(`   Importo: €${invoice.amount_net}`);
    console.log(`   Stato attuale: ${invoice.ei_status || 'non impostato'}`);

    // 2. Aggiorna la fattura con e_invoice: true
    const updatePayload = {
      data: {
        ...invoice,
        e_invoice: true, // Imposta come fattura elettronica "da inviare"
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

    console.log(`   ✅ Fattura ${invoiceId} aggiornata a stato "da inviare"`);
    return true;
  } catch (error: any) {
    console.error(`   ❌ Errore aggiornamento fattura ${invoiceId}:`, error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('🔄 AGGIORNAMENTO FATTURE A STATO "DA INVIARE"\n');
  console.log(`📋 Fatture da aggiornare: ${invoiceIds.length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const invoiceId of invoiceIds) {
    const success = await updateInvoiceToSend(invoiceId);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n\n📊 RIEPILOGO:');
  console.log(`   ✅ Aggiornate con successo: ${successCount}`);
  console.log(`   ❌ Errori: ${failCount}`);
  console.log('\n✅ Processo completato!\n');
}

main().catch(error => {
  console.error('❌ Errore fatale:', error);
  process.exit(1);
});
