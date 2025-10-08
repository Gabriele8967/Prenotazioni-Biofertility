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
 * Cerca un cliente per codice fiscale o email, altrimenti lo crea.
 * @returns L'ID del cliente in Fatture in Cloud.
 */
async function getOrCreateClient(companyId: number, patient: any): Promise<number> {
  const FIC_ACCESS_TOKEN = process.env.FATTUREINCLOUD_ACCESS_TOKEN;
  const FIC_API_URL = 'https://api-v2.fattureincloud.it';

  console.log(`[FATTURA_TRACE] 6. getOrCreateClient chiamata con email: ${patient.email}`);
  console.log(`[FATTURA_TRACE] 7. getOrCreateClient chiamata con nome: ${patient.name}`);

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
        return response.data.data[0].id;
      }
    } catch (error: any) {
      console.warn('Errore durante la ricerca cliente per email:', error.response?.data || error.message);
    }
  }

  // 2. Se non trovato, cerca per Codice Fiscale
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
        return response.data.data[0].id;
      }
    } catch (error: any) {
      console.warn('Errore durante la ricerca cliente per codice fiscale:', error.response?.data || error.message);
    }
  }

  // 3. Se ancora non trovato, crea un nuovo cliente
  const [firstName, ...lastNameParts] = patient.name.split(' ');
  const lastName = lastNameParts.join(' ');

  const createClientPayload = {
    data: {
      name: patient.name,
      first_name: firstName,
      last_name: lastName,
      email: patient.email,
      phone: patient.phone,
      tax_code: patient.fiscalCode,
      country: 'IT',
      address_street: patient.indirizzo,
      address_postal_code: patient.cap,
      address_city: patient.citta,
    },
  };

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
    return response.data.data.id;
  } catch (error: any) {
    console.error('Errore durante la creazione di un nuovo cliente:', error.response?.data || error.message);
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

    // Crea la fattura
    const invoiceData = {
      data: {
        type: 'invoice',
        entity: { id: clientId, name: patient.name }, // Collega al cliente esistente o appena creato
        date: new Date().toISOString().slice(0, 10), // Data odierna
        language: { code: 'it' },
        currency: { id: 'EUR', exchange_rate: '1.00000', symbol: '€' },
        show_totals: 'all',
        show_payments: true,
        show_notification_button: false,
        items_list: [
          {
            name: service.name,
            description: `Prestazione sanitaria esente IVA ai sensi dell'art. 10 DPR 633/72. Operatore: ${staff.name}. Imposta di bollo assolta in modo virtuale - autorizzazione dell'Ag. delle Entrate, Dir. Prov. II. di Roma Aut. n. 28/2025 del 29/5/2025 ai sensi art.15 del D.P.R. n° 642/72 e succ. modif. e integraz.`,
            qty: 1,
            net_price: service.price,
            not_taxable: true,
          },
        ],
        payments_list: [
            {
                amount: service.price,
                due_date: new Date().toISOString().slice(0, 10),
                status: 'paid',
                payment_account: { id: 1 }, // Placeholder: 1 = Conto Corrente (esempio). SOSTITUIRE CON ID REALE!
            }
        ],
        show_payment_method: true,
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
