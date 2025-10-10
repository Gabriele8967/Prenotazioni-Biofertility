import axios from 'axios';
import { db } from './db';

/**
 * Recupera il company ID di Fatture in Cloud dalle variabili d'ambiente.
 * Se non configurato, usa il valore di default.
 */
function getCompanyId(): number {
  const companyId = process.env.FATTUREINCLOUD_COMPANY_ID;
  if (!companyId) {
    console.warn('FATTUREINCLOUD_COMPANY_ID non configurato, usando company ID di default');
    return 0; // Sarà necessario configurarlo nelle variabili d'ambiente
  }
  return parseInt(companyId, 10);
}

/**
 * Deduce il codice paese (country code) dal CAP o prefisso telefonico.
 * Default: IT (Italia)
 */
function deduceCountryCode(cap?: string | null, phone?: string | null): string {
  let country = 'IT'; // Default Italia
  
  // Verifica dal prefisso telefonico (più affidabile)
  const phoneNum = phone?.trim() || '';
  if (phoneNum.startsWith('+49')) {
    return 'DE'; // Germania
  } else if (phoneNum.startsWith('+39')) {
    return 'IT'; // Italia
  } else if (phoneNum.startsWith('+33')) {
    return 'FR'; // Francia
  } else if (phoneNum.startsWith('+34')) {
    return 'ES'; // Spagna
  } else if (phoneNum.startsWith('+41')) {
    return 'CH'; // Svizzera
  } else if (phoneNum.startsWith('+43')) {
    return 'AT'; // Austria
  } else if (phoneNum.startsWith('+44')) {
    return 'GB'; // Regno Unito
  } else if (phoneNum.startsWith('+32')) {
    return 'BE'; // Belgio
  } else if (phoneNum.startsWith('+31')) {
    return 'NL'; // Paesi Bassi
  }
  
  // Se non trovato dal telefono, prova dal CAP
  const zipCode = cap?.trim() || '';
  if (zipCode) {
    // CAP tedesco (5 cifre, diverso range da quello italiano)
    if (/^\d{5}$/.test(zipCode)) {
      const zipNum = parseInt(zipCode);
      // Range tipici CAP tedeschi vs italiani
      if (zipNum < 10000) {
        country = 'DE';
      }
    }
  }
  
  return country;
}

/**
 * Recupera l'ID del conto di pagamento appropriato per Stripe/carta.
 * Cerca automaticamente un conto con "stripe", "carta" o "card" nel nome.
 * Se configurato FATTUREINCLOUD_PAYMENT_ACCOUNT_ID, usa quello.
 * Altrimenti cerca dinamicamente o usa il primo disponibile.
 */
async function getPaymentAccountId(): Promise<number> {
  const configuredId = process.env.FATTUREINCLOUD_PAYMENT_ACCOUNT_ID;
  if (configuredId) {
    return parseInt(configuredId, 10);
  }

  // Recupera la lista dei conti e cerca uno appropriato per Stripe
  const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
  const companyId = getCompanyId();

  try {
    const response = await axios.get(
      `https://api-v2.fattureincloud.it/c/${companyId}/settings/payment_accounts`,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const accounts = response.data.data;
    if (accounts && accounts.length > 0) {
      // Cerca un conto appropriato per pagamenti con carta/Stripe
      let selectedAccount = accounts.find((acc: any) =>
        acc.name.toLowerCase().includes('stripe') ||
        acc.name.toLowerCase().includes('carta') ||
        acc.name.toLowerCase().includes('card')
      );

      // Se non trovato, usa il primo disponibile
      if (!selectedAccount) {
        selectedAccount = accounts[0];
        console.warn(`⚠️  Nessun conto Stripe/Carta trovato, usando: ${selectedAccount.name} (ID: ${selectedAccount.id})`);
      } else {
        console.log(`✅ Conto pagamento per Stripe: ${selectedAccount.name} (ID: ${selectedAccount.id})`);
      }

      return selectedAccount.id;
    }
  } catch (error) {
    console.error('❌ Errore recupero conti di pagamento, usando default:', error);
  }

  console.warn('FATTUREINCLOUD_PAYMENT_ACCOUNT_ID non configurato, usando ID di default (1)');
  return 1; // Fallback
}

/**
 * Recupera l'ID dell'aliquota IVA esente da usare per le prestazioni sanitarie.
 * IMPORTANTE: Questo ID deve essere configurato su Fatture in Cloud come aliquota al 0%
 * per prestazioni sanitarie esenti (art.10 DPR 633/72)
 */
function getExemptVatId(): number {
  const exemptVatId = process.env.FATTUREINCLOUD_EXEMPT_VAT_ID;
  if (!exemptVatId) {
    console.warn('⚠️  FATTUREINCLOUD_EXEMPT_VAT_ID non configurato!');
    console.warn('   Per trovare l\'ID corretto:');
    console.warn('   1. Vai su Fatture in Cloud > Impostazioni > Aliquote IVA');
    console.warn('   2. Cerca l\'aliquota 0% per prestazioni sanitarie esenti');
    console.warn('   3. Annota l\'ID e configuralo in .env come FATTUREINCLOUD_EXEMPT_VAT_ID');
    console.warn('   Usando temporaneamente ID 0 (potrebbe causare errori)');
    return 0;
  }
  return parseInt(exemptVatId, 10);
}

/**
 * Calcola se la marca da bollo è necessaria e restituisce l'importo.
 * Secondo art. 15 DPR 642/72: marca da bollo €2,00 per fatture esenti IVA oltre €77,47
 */
export function calculateStampDuty(price: number): number {
  const STAMP_DUTY_THRESHOLD = 77.47;
  const STAMP_DUTY_AMOUNT = 2.00;

  return price > STAMP_DUTY_THRESHOLD ? STAMP_DUTY_AMOUNT : 0;
}

/**
 * Calcola il totale da pagare inclusa la marca da bollo se applicabile
 */
export function calculateTotalWithStampDuty(price: number): number {
  return price + calculateStampDuty(price);
}

/**
 * Cerca un cliente per codice fiscale o email, altrimenti lo crea.
 * @returns L'ID del cliente in Fatture in Cloud.
 */
async function getOrCreateClient(companyId: number, patient: any): Promise<number> {
  const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
  const FIC_API_URL = 'https://api-v2.fattureincloud.it';

  console.log(`[FATTURA_TRACE] 6. getOrCreateClient chiamata con email: ${patient.email}`);
  console.log(`[FATTURA_TRACE] 7. getOrCreateClient chiamata con nome: ${patient.name}`);
  console.log(`[FATTURA_TRACE] 8. getOrCreateClient chiamata con CF: ${patient.fiscalCode}`);

  // 1. Cerca per Email (più univoco in questo contesto)
  if (patient.email) {
    try {
      const response = await axios.get(
        `${FIC_API_URL}/c/${companyId}/entities/clients?q=email = '${patient.email}'`,
        {
          headers: {
            'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data && response.data.data && response.data.data.length > 0) {
        const existingClient = response.data.data[0];
        const clientId = existingClient.id;
        console.log(`[FATTURA_TRACE] 9. Cliente trovato per EMAIL su FiC: ID ${clientId}`);
        
        // Aggiorna i dati del cliente se necessario
        const needsUpdate = (
          existingClient.name !== patient.name ||
          existingClient.phone !== patient.phone ||
          existingClient.address_street !== patient.indirizzo ||
          existingClient.address_postal_code !== patient.cap ||
          existingClient.address_city !== patient.citta ||
          existingClient.address_province !== patient.provincia
        );

        if (needsUpdate) {
          console.log(`[FATTURA_TRACE] 9.1. Aggiornamento dati cliente trovato per email...`);

          try {
            await axios.put(
              `${FIC_API_URL}/c/${companyId}/entities/clients/${clientId}`,
              {
                data: {
                  email: patient.email,
                  name: patient.name,
                  phone: patient.phone,
                  address_street: patient.indirizzo,
                  address_postal_code: patient.cap,
                  address_city: patient.citta,
                  address_province: patient.provincia,
                }
              },
              {
                headers: {
                  'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log(`[FATTURA_TRACE] 9.2. Cliente aggiornato con successo su FiC`);
          } catch (updateError: any) {
            console.error('Errore durante aggiornamento cliente:', updateError.response?.data || updateError.message);
          }
        }
        
        return clientId;
      } else {
        console.log(`[FATTURA_TRACE] 9. Nessun cliente trovato per EMAIL ${patient.email} su FiC`);
      }
    } catch (error: any) {
      console.warn('Errore durante la ricerca cliente per email:', error.response?.data || error.message);
    }
  }

  // 2. Se non trovato per email, cerca per Codice Fiscale
  // MA se lo troviamo, aggiorniamo l'email per evitare discrepanze
  if (patient.fiscalCode) {
    try {
      const response = await axios.get(
        `${FIC_API_URL}/c/${companyId}/entities/clients?q=tax_code = '${patient.fiscalCode}'`,
        {
          headers: {
            'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data && response.data.data && response.data.data.length > 0) {
        const existingClient = response.data.data[0];
        const clientId = existingClient.id;
        
        console.log(`[FATTURA_TRACE] 10. Cliente trovato per CF su FiC: ID ${clientId}, Email esistente: ${existingClient.email}`);
        
        // IMPORTANTE: Aggiorniamo sempre i dati del cliente per assicurarci che siano aggiornati
        const needsUpdate = (
          existingClient.email !== patient.email ||
          existingClient.name !== patient.name ||
          existingClient.phone !== patient.phone ||
          existingClient.address_street !== patient.indirizzo ||
          existingClient.address_postal_code !== patient.cap ||
          existingClient.address_city !== patient.citta ||
          existingClient.address_province !== patient.provincia
        );

        if (needsUpdate) {
          console.log(`[FATTURA_TRACE] 11. Aggiornamento dati cliente su Fatture in Cloud...`);

          try {
            await axios.put(
              `${FIC_API_URL}/c/${companyId}/entities/clients/${clientId}`,
              {
                data: {
                  email: patient.email,
                  name: patient.name,
                  phone: patient.phone,
                  address_street: patient.indirizzo,
                  address_postal_code: patient.cap,
                  address_city: patient.citta,
                  address_province: patient.provincia,
                }
              },
              {
                headers: {
                  'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            console.log(`[FATTURA_TRACE] 12. Cliente aggiornato con successo su FiC`);
          } catch (updateError: any) {
            console.error('Errore durante aggiornamento cliente:', updateError.response?.data || updateError.message);
          }
        }
        
        return clientId;
      } else {
        console.log(`[FATTURA_TRACE] 10. Nessun cliente trovato per CF ${patient.fiscalCode} su FiC`);
      }
    } catch (error: any) {
      console.warn('Errore durante la ricerca cliente per codice fiscale:', error.response?.data || error.message);
    }
  }

  // 3. Se ancora non trovato, crea un nuovo cliente
  const [firstName, ...lastNameParts] = patient.name.split(' ');
  const lastName = lastNameParts.join(' ');

  // Deduce il paese dal CAP o dal prefisso telefonico
  const country = deduceCountryCode(patient.cap, patient.phone);
  console.log(`[FATTURA_TRACE] 13. Paese dedotto per cliente: ${country} (CAP: ${patient.cap}, Tel: ${patient.phone})`);

  // IMPORTANTE: Fatture in Cloud accetta solo 'Italia' come country, 
  // quindi per clienti esteri usiamo comunque 'Italia' come paese fiscale
  // ma mettiamo l'indirizzo estero completo
  const createClientPayload: any = {
    data: {
      name: patient.name,
      first_name: firstName,
      last_name: lastName,
      email: patient.email,
      phone: patient.phone,
      tax_code: patient.fiscalCode,
      address_street: patient.indirizzo,
      address_postal_code: patient.cap,
      address_city: patient.citta,
      address_province: patient.provincia,
    },
  };

  // Aggiungi country solo se è Italia (IT)
  // Per pazienti esteri, l'indirizzo estero è già nell'address_street/city/postal_code
  if (country === 'IT') {
    createClientPayload.data.country = 'Italia';
  }

  console.log(`[FATTURA_TRACE] 14. Payload creazione cliente:`, JSON.stringify(createClientPayload, null, 2));
  
  try {
    const response = await axios.post(
      `${FIC_API_URL}/c/${companyId}/entities/clients`,
      createClientPayload,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`[FATTURA_TRACE] 15. Cliente creato con ID: ${response.data.data.id}`);
    return response.data.data.id;
  } catch (error: any) {
    console.error('Errore durante la creazione di un nuovo cliente:', error.response?.data || error.message);
    if (error.response?.data?.error?.validation_result) {
      console.error('Dettagli validazione:', JSON.stringify(error.response.data.error.validation_result, null, 2));
    }
    throw new Error('Impossibile creare il cliente in Fatture in Cloud.');
  }
}

/**
 * Crea e invia una fattura tramite Fatture in Cloud.
 */
export async function createAndSendInvoice(bookingId: string): Promise<{invoiceId: number | null}> {
  const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
  const FIC_API_URL = 'https://api-v2.fattureincloud.it';

  try {
    const companyId = getCompanyId();

    // Recupera i dettagli completi della prenotazione
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, patient: true, staff: true },
    });

    if (!booking) {
      throw new Error(`Prenotazione con ID ${bookingId} non trovata.`);
    }

    const { patient, service, staff } = booking;

    console.log(`[FATTURA_TRACE] 1. Booking ID: ${bookingId}`);
    console.log(`[FATTURA_TRACE] 2. Patient ID dal booking: ${booking.patientId}`);
    console.log(`[FATTURA_TRACE] 3. Patient object completo:`, JSON.stringify(patient, null, 2));
    console.log(`[FATTURA_TRACE] 4. Email del paziente: ${patient.email}`);
    console.log(`[FATTURA_TRACE] 5. Nome del paziente: ${patient.name}`);

    // Se il servizio è gratuito, non generare fattura
    if (service.price === 0) {
      console.log(`Skipping invoice generation for booking ${bookingId}: Service price is 0.`);
      return { invoiceId: null };
    }

    const clientId = await getOrCreateClient(companyId, patient);
    const paymentAccountId = await getPaymentAccountId();
    const exemptVatId = getExemptVatId();

    // Calcola la marca da bollo
    const stampDuty = calculateStampDuty(service.price);
    const totalWithStampDuty = calculateTotalWithStampDuty(service.price);

    console.log(`[FATTURA_TRACE] 15. Prezzo servizio: €${service.price}`);
    console.log(`[FATTURA_TRACE] 16. Marca da bollo: €${stampDuty}`);
    console.log(`[FATTURA_TRACE] 17. Totale con marca da bollo: €${totalWithStampDuty}`);

    // Crea la fattura
    const patientCountry = deduceCountryCode(patient.cap, patient.phone);
    console.log(`[FATTURA_TRACE] 18. Paese paziente per fattura: ${patientCountry}`);

    const entityData: any = {
      id: clientId,
      name: patient.name,
      tax_code: patient.fiscalCode || '',
      // Includi l'indirizzo del paziente nella fattura
      address_street: patient.indirizzo || '',
      address_postal_code: patient.cap || '',
      address_city: patient.citta || '',
      address_province: patient.provincia || '', // OBBLIGATORIO per fatturazione elettronica
    };

    // Aggiungi country solo se è Italia
    if (patientCountry === 'IT') {
      entityData.country = 'Italia';
    }

    const invoiceData: any = {
      data: {
        type: 'invoice',
        entity: entityData,
        date: new Date().toISOString().slice(0, 10), // Data odierna
        language: { code: 'it' },
        currency: { id: 'EUR', exchange_rate: '1.00000', symbol: '€' },
        show_totals: 'all',
        show_payments: true,
        show_notification_button: false,
        // Fattura elettronica: true = stato "da inviare", false = stato "emessa"
        e_invoice: true,
        // Marca da bollo (obbligatoria per fatture esenti IVA oltre €77,47)
        stamp_duty: stampDuty,
        items_list: [
          {
            name: service.name,
            description: `Prestazione sanitaria esente IVA ai sensi dell'art. 10 DPR 633/72. Operatore: ${staff.name}.${stampDuty > 0 ? ' Imposta di bollo assolta in modo virtuale - autorizzazione dell\'Ag. delle Entrate, Dir. Prov. II. di Roma Aut. n. 28/2025 del 29/5/2025 ai sensi art.15 del D.P.R. n° 642/72 e succ. modif. e integraz.' : ''}`,
            qty: 1,
            net_price: service.price,
            // IMPORTANTE: usa l'ID IVA esente configurato (aliquota 0% per prestazioni sanitarie)
            // Questo risolve il problema dell'importo €0,00 nell'elenco fatture
            vat: {
              id: exemptVatId, // ID dell'aliquota IVA esente (da configurare in .env)
              value: 0,
              description: 'Esente art.10'
            }
          },
        ],
        payments_list: [
            {
                // Per fatture elettroniche, il pagamento = solo servizio (la marca da bollo è separata)
                amount: service.price, // Solo il servizio, bollo in stamp_duty
                due_date: new Date().toISOString().slice(0, 10),
                paid_date: new Date().toISOString().slice(0, 10), // FONDAMENTALE: rende la fattura "saldata"
                status: 'paid', // Fattura marcata come PAGATA (paziente paga con Stripe immediatamente)
                payment_account: { id: paymentAccountId }, // ID del conto di pagamento (es. "Credit card / debit card")
            }
        ],
        // Payment method obbligatorio per fatture elettroniche (sistema Tessera Sanitaria)
        ei_data: {
          payment_method: 'MP08', // MP08 = Pagamento con carta di credito/debito (standard XML FatturaPA)
        },
        show_payment_method: true, // Mostra metodo di pagamento nella fattura
      },
    };

    console.log('Payload sent to Fatture in Cloud:', JSON.stringify(invoiceData, null, 2));

    const response = await axios.post(
      `${FIC_API_URL}/c/${companyId}/issued_documents`,
      invoiceData,
      {
        headers: {
          'Authorization': `Bearer ${FIC_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const invoiceId = response.data.data.id;

    console.log(`Fattura ${invoiceId} creata per la prenotazione ${bookingId}.`);

    return { invoiceId };

  } catch (error: any) {
    console.error("Errore durante la creazione della fattura su Fatture in Cloud:", error.response?.data || error.message);
    if (error.response?.data?.error?.validation_result?.fields) {
      console.error("Fatture in Cloud Validation Errors:", error.response.data.error.validation_result.fields);
    }
    throw error; // Rilancia l'errore per essere gestito a monte
  }
}
