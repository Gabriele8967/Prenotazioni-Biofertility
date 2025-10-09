/**
 * Script per recuperare le aliquote IVA disponibili su Fatture in Cloud
 */

import axios from 'axios';

async function getVatTypes() {
  const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
  const COMPANY_ID = process.env.FATTUREINCLOUD_COMPANY_ID || '1467198';
  const FIC_API_URL = 'https://api-v2.fattureincloud.it';

  console.log('Token presente:', FIC_ACCESS_TOKEN ? 'Sì' : 'No');
  console.log('Company ID:', COMPANY_ID);

  if (!FIC_ACCESS_TOKEN) {
    console.error('❌ FATTUREINCLOUD_ACCESS_TOKEN non trovato nel file .env');
    console.error('Assicurati che il file .env contenga:');
    console.error('FATTUREINCLOUD_ACCESS_TOKEN="il-tuo-token"');
    process.exit(1);
  }

  try {
    console.log(`🔍 Recupero aliquote IVA per company ID: ${COMPANY_ID}...\n`);

    const response = await axios.get(
      `${FIC_API_URL}/c/${COMPANY_ID}/info/vat_types`,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`✅ Aliquote IVA disponibili:\n`);
    
    const vatTypes = response.data.data;
    
    // Filtra per trovare quelle esenti o a 0%
    console.log(`📋 TUTTE LE ALIQUOTE:`);
    vatTypes.forEach((vat: any) => {
      console.log(`\n  ID: ${vat.id}`);
      console.log(`  Valore: ${vat.value}%`);
      console.log(`  Descrizione: ${vat.description || 'N/D'}`);
      console.log(`  Note: ${vat.notes || 'N/D'}`);
      console.log(`  Default: ${vat.is_default ? 'Sì' : 'No'}`);
    });

    console.log(`\n\n🔍 ALIQUOTE ESENTI (valore = 0):`);
    const exemptVats = vatTypes.filter((vat: any) => vat.value === 0);
    
    if (exemptVats.length === 0) {
      console.log(`  ⚠️  Nessuna aliquota esente trovata!`);
      console.log(`  💡 Potrebbe essere necessario crearla manualmente su Fatture in Cloud`);
    } else {
      exemptVats.forEach((vat: any) => {
        console.log(`\n  ✅ ID: ${vat.id} - ${vat.description || 'Esente'}`);
        console.log(`     Note: ${vat.notes || 'N/D'}`);
      });
      
      console.log(`\n\n💡 Usa uno di questi ID per le prestazioni sanitarie esenti IVA`);
      console.log(`   Suggerimento: cerca quello con "art.10" o simile nelle note/descrizione`);
    }

  } catch (error: any) {
    console.error('❌ Errore durante il recupero aliquote IVA:', error.response?.data || error.message);
    throw error;
  }
}

getVatTypes().catch(error => {
  console.error('Errore fatale:', error);
  process.exit(1);
});
