/**
 * Script per testare diversi ID IVA comuni per aliquote esenti
 */

import axios from 'axios';

async function testVatIds() {
  const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN || "a/eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZWYiOiJwMmJ5RHc2Y3Zhd2dDOGJ6blRvZkZUeXllQUhVakhFQSJ9.ws-EBZcFmV4vCIx3JbwIVaze79rvKSG6eojZlkygtM8";
  const COMPANY_ID = process.env.FATTUREINCLOUD_COMPANY_ID || '1467198';
  const FIC_API_URL = 'https://api-v2.fattureincloud.it';

  // ID comuni per aliquote esenti (da testare)
  const commonExemptIds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  console.log('🧪 Test ID IVA comuni per aliquote esenti...\n');

  for (const vatId of commonExemptIds) {
    try {
      console.log(`🔍 Test ID: ${vatId}...`);
      
      // Crea una fattura di test con questo ID IVA
      const testInvoice = {
        data: {
          type: 'invoice',
          entity: {
            id: 102117355, // ID cliente esistente
            name: 'Test Cliente'
          },
          date: new Date().toISOString().slice(0, 10),
          language: { code: 'it' },
          currency: { id: 'EUR', exchange_rate: '1.00000', symbol: '€' },
          show_totals: 'all',
          show_payments: true,
          show_notification_button: false,
          items_list: [
            {
              name: 'Test Prestazione Sanitaria',
              description: 'Test per trovare ID IVA esente',
              qty: 1,
              net_price: 1.00, // Importo minimo per test
              vat: {
                id: vatId,
                value: 0,
                description: 'Esente art.10'
              }
            }
          ],
          payments_list: [
            {
              amount: 1.00,
              due_date: new Date().toISOString().slice(0, 10),
              status: 'paid',
              payment_account: { id: 1 }
            }
          ],
          show_payment_method: true
        }
      };

      const response = await axios.post(
        `${FIC_API_URL}/c/${COMPANY_ID}/issued_documents`,
        testInvoice,
        {
          headers: {
            'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ ID ${vatId} FUNZIONA! Fattura creata: ${response.data.data.id}`);
      console.log(`   🎯 USA QUESTO ID: FATTUREINCLOUD_EXEMPT_VAT_ID="${vatId}"`);
      
      // Cancella la fattura di test
      try {
        await axios.delete(
          `${FIC_API_URL}/c/${COMPANY_ID}/issued_documents/${response.data.data.id}`,
          {
            headers: {
              'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`   🗑️  Fattura di test cancellata`);
      } catch (deleteError) {
        console.log(`   ⚠️  Fattura di test non cancellata (non critico)`);
      }
      
      break; // Trovato un ID funzionante, esci dal loop
      
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      console.log(`❌ ID ${vatId} non funziona: ${errorMsg}`);
    }
  }
}

testVatIds().catch(error => {
  console.error('Errore fatale:', error);
  process.exit(1);
});
