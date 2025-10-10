import axios from 'axios';

const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
const COMPANY_ID = process.env.FATTUREINCLOUD_COMPANY_ID;

async function getPaymentAccounts() {
  try {
    const response = await axios.get(
      `https://api-v2.fattureincloud.it/c/${COMPANY_ID}/settings/payment_accounts`,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Conti di pagamento disponibili:');
    console.log(JSON.stringify(response.data.data, null, 2));

    if (response.data.data && response.data.data.length > 0) {
      console.log('\n📋 Lista conti:');
      response.data.data.forEach((account: any) => {
        console.log(`  - ID: ${account.id} | Nome: ${account.name} | Tipo: ${account.type}`);
      });
    }
  } catch (error: any) {
    console.error('❌ Errore:', error.response?.data || error.message);
  }
}

getPaymentAccounts();
