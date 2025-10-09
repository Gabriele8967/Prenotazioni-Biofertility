/**
 * Script per recuperare le aliquote IVA disponibili su Fatture in Cloud
 * Usa l'API V2 per ottenere l'ID dell'aliquota "Escluso Art.10"
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

    // Prova diversi endpoint per le aliquote IVA
    const endpoints = [
      `${FIC_API_URL}/c/${COMPANY_ID}/info/vat_types`,
      `${FIC_API_URL}/c/${COMPANY_ID}/vat_types`,
      `${FIC_API_URL}/c/${COMPANY_ID}/settings/vat_types`,
      `${FIC_API_URL}/c/${COMPANY_ID}/aliquote`
    ];

    let response = null;
    let workingEndpoint = '';

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Provo endpoint: ${endpoint}`);
        response = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        workingEndpoint = endpoint;
        console.log(`✅ Endpoint funzionante: ${endpoint}`);
        break;
      } catch (error: any) {
        console.log(`❌ Endpoint fallito: ${endpoint} - ${error.response?.status || error.message}`);
      }
    }

    if (!response) {
      throw new Error('Nessun endpoint per le aliquote IVA funziona');
    }

    console.log(`✅ Aliquote IVA recuperate da: ${workingEndpoint}\n`);
    
    const vatTypes = response.data.data || response.data;

    if (!vatTypes || !Array.isArray(vatTypes)) {
      console.error('❌ Formato risposta non valido:', response.data);
      return;
    }

    console.log(`📋 Trovate ${vatTypes.length} aliquote IVA:\n`);
    
    // Cerca specificamente "Escluso Art.10"
    const esclusoArt10 = vatTypes.find((vat: any) => 
      vat.name && vat.name.includes('Escluso Art.10')
    );

    if (esclusoArt10) {
      console.log(`🎯 ALIQUOTA TROVATA!`);
      console.log(`   Nome: ${esclusoArt10.name}`);
      console.log(`   ID: ${esclusoArt10.id}`);
      console.log(`   Valore: ${esclusoArt10.value}%`);
      console.log(`   Descrizione: ${esclusoArt10.description || 'N/D'}`);
      console.log(`   Natura: ${esclusoArt10.nature || 'N/D'}`);
      
      console.log(`\n✅ CONFIGURAZIONE RICHIESTA:`);
      console.log(`Aggiungi al file .env:`);
      console.log(`FATTUREINCLOUD_EXEMPT_VAT_ID="${esclusoArt10.id}"`);
    } else {
      console.log(`⚠️  Aliquota "Escluso Art.10" non trovata!`);
      console.log(`\n📋 Aliquote disponibili:`);
      
      vatTypes.forEach((vat: any, index: number) => {
        console.log(`\n  ${index + 1}. ID: ${vat.id}`);
        console.log(`     Nome: ${vat.name || 'N/D'}`);
        console.log(`     Valore: ${vat.value}%`);
        console.log(`     Descrizione: ${vat.description || 'N/D'}`);
        console.log(`     Natura: ${vat.nature || 'N/D'}`);
      });

      console.log(`\n💡 Cerca un'aliquota con:`);
      console.log(`   - Valore: 0%`);
      console.log(`   - Natura: N4 - Esenti`);
      console.log(`   - Descrizione contenente "art.10" o "esente"`);
    }

    // Mostra anche tutte le aliquote per riferimento
    console.log(`\n\n📋 TUTTE LE ALIQUOTE DISPONIBILI:`);
    vatTypes.forEach((vat: any, index: number) => {
      const isExempt = vat.value === 0;
      const isArt10 = vat.name && vat.name.includes('Art.10');
      const isN4 = vat.nature && vat.nature.includes('N4');
      
      const marker = isExempt && (isArt10 || isN4) ? '🎯' : '  ';
      
      console.log(`${marker} ${index + 1}. ID: ${vat.id} | ${vat.value}% | ${vat.name || 'N/D'} | ${vat.nature || 'N/D'}`);
    });

  } catch (error: any) {
    console.error('❌ Errore durante il recupero aliquote IVA:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('\n💡 Possibili soluzioni:');
      console.error('1. Verifica che FATTUREINCLOUD_ACCESS_TOKEN sia corretto');
      console.error('2. Verifica che FATTUREINCLOUD_COMPANY_ID sia corretto');
      console.error('3. Il token potrebbe essere scaduto');
    }
    
    throw error;
  }
}

// Esegui lo script
getVatTypes().catch(error => {
  console.error('Errore fatale:', error);
  process.exit(1);
});
