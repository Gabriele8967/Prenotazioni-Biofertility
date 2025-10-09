import axios from 'axios';
import { db } from '../lib/db';

/**
 * Script per correggere le fatture legacy (create con sistema precedente):
 * 1. Trova fatture a 0€ per i clienti specificati
 * 2. Recupera indirizzo da fatture precedenti del cliente
 * 3. Aggiorna con: indirizzo, importo corretto, stato pagato con bonifico
 */

const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
const FIC_API_URL = 'https://api-v2.fattureincloud.it';
const COMPANY_ID = process.env.FATTUREINCLOUD_COMPANY_ID;

// Clienti da correggere (come specificato dall'utente)
const CLIENTS_TO_FIX = [
  'debora conti',
  'maria adelaide cecere',
  'carmine caloiero',
  'gianni raggiunti',
  'fortunata netti',
  'annalisa marcoccia',
  'mina moussaid'
];

interface InvoiceToFix {
  id: number;
  number: string;
  entity: {
    id: number;
    name: string;
  };
  amount_net: number;
  amount_gross: number;
  items_list?: any[];
}

async function getBonificoPaymentAccountId(): Promise<number> {
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
    // Cerca un conto "Bonifico"
    let bonifico = accounts.find((acc: any) =>
      acc.name.toLowerCase().includes('bonifico')
    );

    if (!bonifico) {
      console.warn('⚠️  Conto Bonifico non trovato, uso primo disponibile');
      bonifico = accounts[0];
    }

    console.log(`✅ Conto pagamento Bonifico: ${bonifico.name} (ID: ${bonifico.id})\n`);
    return bonifico.id;
  } catch (error: any) {
    console.error('❌ Errore recupero conti:', error.response?.data || error.message);
    throw error;
  }
}

async function findInvoicesForClients(): Promise<InvoiceToFix[]> {
  try {
    console.log('🔍 Cercando fatture per i clienti specificati...\n');

    const matchingInvoices: InvoiceToFix[] = [];
    let page = 1;
    let hasMore = true;
    let totalFetched = 0;

    // Cerca in tutte le pagine
    while (hasMore) {
      const response = await axios.get(
        `${FIC_API_URL}/c/${COMPANY_ID}/issued_documents?type=invoice&per_page=100&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const invoices = response.data.data;
      totalFetched += invoices.length;

      if (invoices.length === 0) {
        hasMore = false;
        break;
      }

      for (const invoice of invoices) {
        const clientName = invoice.entity?.name?.toLowerCase() || '';

        // Verifica se è uno dei clienti da correggere
        const matchesClient = CLIENTS_TO_FIX.some(client =>
          clientName.includes(client.toLowerCase())
        );

        if (matchesClient) {
          matchingInvoices.push(invoice);
          console.log(`📄 ${invoice.entity.name} - Fattura ${invoice.number} (ID: ${invoice.id})`);
          console.log(`   Importo elenco: €${invoice.amount_gross || 0}`);
          console.log(`   Stato: ${invoice.is_marked ? 'Pagata' : 'Non pagata'}`);

          // Verifica problemi
          const problems = [];
          if (invoice.amount_gross === 0 || invoice.amount_net === 0) {
            problems.push('importo a 0€');
          }
          if (!invoice.entity?.address_street) {
            problems.push('indirizzo mancante');
          }
          if (!invoice.is_marked) {
            problems.push('non pagata');
          }

          if (problems.length > 0) {
            console.log(`   ⚠️  Problemi: ${problems.join(', ')}`);
          }
          console.log('');
        }
      }

      page++;
      await new Promise(resolve => setTimeout(resolve, 500)); // Pausa tra le pagine
    }

    console.log(`📊 Totale fatture esaminate: ${totalFetched}\n`);
    return matchingInvoices;
  } catch (error: any) {
    console.error('❌ Errore ricerca fatture:', error.response?.data || error.message);
    throw error;
  }
}

async function getInvoiceDetails(invoiceId: number): Promise<any> {
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
    return response.data.data;
  } catch (error: any) {
    console.error(`❌ Errore recupero dettagli fattura ${invoiceId}:`, error.response?.data || error.message);
    throw error;
  }
}

async function findPreviousAddressForClient(clientId: number, clientName: string): Promise<any> {
  try {
    console.log(`   🔍 Cercando indirizzo da fatture precedenti di ${clientName}...`);

    // Cerca tutte le fatture del cliente con query corretta
    const response = await axios.get(
      `${FIC_API_URL}/c/${COMPANY_ID}/issued_documents?type=invoice`,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const allInvoices = response.data.data;
    // Filtra manualmente per il client ID
    const invoices = allInvoices.filter((inv: any) => inv.entity?.id === clientId);

    // Cerca una fattura con indirizzo completo
    for (const invoice of invoices) {
      const details = await getInvoiceDetails(invoice.id);

      if (details.entity?.address_street && details.entity?.address_city) {
        console.log(`   ✅ Indirizzo trovato da fattura ${invoice.number}`);
        return {
          address_street: details.entity.address_street,
          address_postal_code: details.entity.address_postal_code,
          address_city: details.entity.address_city,
          country: details.entity.country || 'Italia'
        };
      }
    }

    console.log(`   ⚠️  Nessun indirizzo trovato nelle fatture precedenti`);
    return null;
  } catch (error: any) {
    console.error(`   ❌ Errore ricerca indirizzo:`, error.response?.data || error.message);
    return null;
  }
}

async function fixInvoice(invoice: InvoiceToFix, bonificoPaymentAccountId: number) {
  try {
    console.log(`\n🔧 Correzione fattura ${invoice.number} (ID: ${invoice.id}) - ${invoice.entity.name}`);

    // 1. Recupera dettagli completi della fattura
    const details = await getInvoiceDetails(invoice.id);
    console.log(`   Importo reale: €${details.amount_gross}`);
    console.log(`   Indirizzo attuale: ${details.entity?.address_street || 'MANCANTE'}`);

    // Se l'importo è effettivamente 0, skip
    if (details.amount_gross === 0) {
      console.log(`   ⚠️  Fattura effettivamente a 0€, skip`);
      return false;
    }

    // 2. Recupera indirizzo da fatture precedenti se mancante
    let address = null;
    if (!details.entity?.address_street || !details.entity?.address_city) {
      address = await findPreviousAddressForClient(details.entity.id, details.entity.name);

      if (!address) {
        console.log(`   ❌ Impossibile procedere senza indirizzo`);
        return false;
      }
    }

    // 3. Prepara update
    const today = new Date().toISOString().slice(0, 10);
    const updateData: any = {
      data: {
        // Aggiorna indirizzo se necessario
        ...(address && {
          entity: {
            id: details.entity.id,
            name: details.entity.name,
            address_street: address.address_street,
            address_postal_code: address.address_postal_code,
            address_city: address.address_city,
            country: address.country
          }
        }),
        // Marca come pagato con bonifico
        // IMPORTANTE: usa amount_gross che include tutto (include stamp_duty se presente)
        payments_list: [
          {
            amount: details.amount_gross,
            due_date: today,
            paid_date: today,
            status: 'paid',
            payment_account: { id: bonificoPaymentAccountId }
          }
        ],
        // Mostra metodo pagamento, nascondi scadenze
        show_payments: false,
        show_payment_method: true,
        payment_method: {
          name: 'Bonifico Bancario',
          is_default: true
        },
        ei_data: {
          payment_method: 'MP05' // MP05 = Bonifico
        }
      }
    };

    // 4. Applica correzione
    await axios.put(
      `${FIC_API_URL}/c/${COMPANY_ID}/issued_documents/${invoice.id}`,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`   ✅ Fattura corretta con successo`);
    if (address) {
      console.log(`   📍 Indirizzo aggiunto: ${address.address_city}`);
    }
    console.log(`   💰 Marcata come pagata con Bonifico`);

    return true;
  } catch (error: any) {
    console.error(`   ❌ Errore correzione:`, error.response?.data || error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Avvio correzione fatture legacy\n');
    console.log('📋 Clienti da correggere:', CLIENTS_TO_FIX.join(', '), '\n');

    // 1. Recupera conto Bonifico
    const bonificoAccountId = await getBonificoPaymentAccountId();

    // 2. Trova fatture dei clienti specificati
    const invoicesToFix = await findInvoicesForClients();

    console.log(`\n📊 Totale fatture da correggere: ${invoicesToFix.length}\n`);

    if (invoicesToFix.length === 0) {
      console.log('✅ Nessuna fattura da correggere');
      return;
    }

    // 3. Correggi ogni fattura
    let successCount = 0;
    let failCount = 0;

    for (const invoice of invoicesToFix) {
      const success = await fixInvoice(invoice, bonificoAccountId);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }

      // Pausa per evitare rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Fatture corrette: ${successCount}`);
    if (failCount > 0) {
      console.log(`❌ Fatture con errori: ${failCount}`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Errore generale:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

main()
  .then(() => {
    console.log('\n✨ Script completato');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script fallito:', error);
    process.exit(1);
  });
