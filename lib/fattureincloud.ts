import {
  Configuration,
  ClientsApi,
  IssuedDocumentsApi,
  CreateClientRequest,
  CreateIssuedDocumentRequest,
} from '@fattureincloud/fattureincloud-ts-sdk';
import { db } from './db';

// Inizializza la configurazione dell'API
const apiConfig = new Configuration({ accessToken: process.env.FATTUREINCLOUD_ACCESS_TOKEN });

const clientsApi = new ClientsApi(apiConfig);
const issuedDocumentsApi = new IssuedDocumentsApi(apiConfig);

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
  // 1. Cerca per Codice Fiscale (più univoco)
  if (patient.fiscalCode) {
    const clientSearch = await clientsApi.listClients(companyId, patient.fiscalCode);
    if (clientSearch.data && clientSearch.data.data && clientSearch.data.data.length > 0) {
      return clientSearch.data.data[0].id!;
    }
  }

  // 2. Se non trovato, cerca per Email
  const clientSearchByEmail = await clientsApi.listClients(companyId, patient.email);
  if (clientSearchByEmail.data && clientSearchByEmail.data.data && clientSearchByEmail.data.data.length > 0) {
    return clientSearchByEmail.data.data[0].id!;
  }

  // 3. Se ancora non trovato, crea un nuovo cliente
  const [firstName, ...lastNameParts] = patient.name.split(' ');
  const lastName = lastNameParts.join(' ');

  const createClientRequest: CreateClientRequest = {
    data: {
      name: patient.name,
      first_name: firstName,
      last_name: lastName,
      email: patient.email,
      phone: patient.phone,
      tax_code: patient.fiscalCode,
      country: 'IT',
    },
  };

  const newClient = await clientsApi.createClient(companyId, createClientRequest);
  return newClient.data!.data!.id!;
}

/**
 * Crea e invia una fattura tramite Fatture in Cloud.
 */
export async function createAndSendInvoice(bookingId: string): Promise<{invoiceId: number}> {
  try {
    const companyId = getCompanyId();

    // Recupera i dettagli completi della prenotazione
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { service: true, patient: true },
    });

    if (!booking) {
      throw new Error(`Prenotazione con ID ${bookingId} non trovata.`);
    }

    const { patient, service } = booking;

    const clientId = await getOrCreateClient(companyId, patient);

    // Crea la fattura
    const createInvoiceRequest: CreateIssuedDocumentRequest = {
      data: {
        type: 'invoice',
        entity: { id: clientId },
        date: new Date().toISOString().slice(0, 10), // Data odierna
        items_list: [
          {
            product_id: parseInt(service.id.substring(0, 8), 16),
            name: service.name,
            description: 'Prestazione sanitaria esente IVA ai sensi dell\'art. 10 DPR 633/72',
            qty: 1,
            net_price: service.price,
            not_taxable: true,
          },
        ],
        payments_list: [
            {
                amount: service.price,
                due_date: new Date().toISOString().slice(0, 10),
                status: 'paid'
            }
        ]
      },
    };

    const createdInvoice = await issuedDocumentsApi.createIssuedDocument(companyId, { data: createInvoiceRequest.data });
    const invoiceId = createdInvoice.data!.data!.id!;

    console.log(`Fattura ${invoiceId} creata per la prenotazione ${bookingId}.`);

    return { invoiceId };

  } catch (error) {
    console.error("Errore durante la creazione della fattura su Fatture in Cloud:", error);
    // Non rilanciare l'errore per non bloccare il webhook di Stripe, ma loggalo.
    return { invoiceId: 0 };
  }
}
