import axios from 'axios';

const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
const FIC_API_URL = 'https://api-v2.fattureincloud.it';
const COMPANY_ID = parseInt(process.env.FATTUREINCLOUD_COMPANY_ID || '0', 10);

const invoiceIds = [
  '474652842', // Rossana - Prima visita
  '474652853', // Rossana - Spermiogramma
  '474652868', // Francesco - Consulto
];

async function checkInvoice(invoiceId: string) {
  try {
    const response = await axios.get(
      `${FIC_API_URL}/c/${COMPANY_ID}/issued_documents/${invoiceId}`,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const invoice = response.data.data;
    
    console.log(`\n📄 Fattura ${invoiceId}`);
    console.log(`   Cliente: ${invoice.entity.name}`);
    console.log(`   CF: ${invoice.entity.tax_code || 'N/D'}`);
    console.log(`   Servizio: €${invoice.amount_net}`);
    console.log(`   Marca da bollo: €${invoice.stamp_duty || 0}`);
    console.log(`   Totale lordo: €${invoice.amount_gross}`);
    console.log(`   Totale da pagare: €${invoice.amount_due}`);
    console.log(`   Totale con bollo: €${(invoice.amount_gross || 0) + (invoice.stamp_duty || 0)}`);
    console.log(`   Stato: ${invoice.ei_status || invoice.status || 'N/D'}`);
    console.log(`   E-invoice: ${invoice.e_invoice ? 'Sì' : 'No'}`);
    
    return true;
  } catch (error: any) {
    console.error(`❌ Errore fattura ${invoiceId}:`, error.response?.data || error.message);
    return false;
  }
}

async function main() {
  console.log('🔍 VERIFICA TOTALI FATTURE\n');
  
  for (const id of invoiceIds) {
    await checkInvoice(id);
  }
}

main().catch(console.error);
