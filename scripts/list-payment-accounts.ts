import axios from 'axios';
import { db } from '../lib/db'; // Import db to load environment variables

const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
const FIC_API_URL = 'https://api-v2.fattureincloud.it';
const COMPANY_ID = process.env.FATTUREINCLOUD_COMPANY_ID;

async function listPaymentAccounts() {
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

    console.log('\n📋 Conti di pagamento disponibili su Fatture in Cloud:\n');
    response.data.data.forEach((account: any, index: number) => {
      console.log(`${index + 1}. ID: ${account.id}`);
      console.log(`   Nome: ${account.name}`);
      console.log(`   Tipo: ${account.type || 'N/A'}`);
      console.log('');
    });

    console.log('\n💡 Suggerimenti:');
    console.log('- Per pagamenti con carta/Stripe, cerca un conto tipo "Carta di credito" o "Stripe"');
    console.log('- Configura il conto corretto in .env come FATTUREINCLOUD_PAYMENT_ACCOUNT_ID');

  } catch (error: any) {
    console.error('❌ Errore:', error.response?.data || error.message);
  }
}

listPaymentAccounts();
