import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { createAndSendInvoice } from '@/lib/fattureincloud';
import { sendBookingConfirmationToAdmin, sendBookingConfirmationToClient } from '@/lib/email';
import { createGoogleCalendarEvent } from '@/lib/google-calendar';
import { format } from 'date-fns';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    })
  : null;

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe non configurato' }, { status: 500 });
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`❌ Errore firma webhook: ${errorMessage}`);
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (!bookingId) {
      console.error('❌ Errore critico: bookingId non trovato nei metadata di Stripe');
      return NextResponse.json({ received: true }); // Rispondi 200 a Stripe per evitare retry
    }

    try {
      // 1. Recupera i dati completi della prenotazione per creare l'evento Calendar
      const bookingData = await db.booking.findUnique({
        where: { id: bookingId },
        include: {
          service: true,
          patient: true,
          staff: { select: { email: true, name: true } },
        },
      });

      if (!bookingData) throw new Error('Prenotazione non trovata.');

      // 2. Crea evento Google Calendar PRIMA di confermare il pagamento
      console.log(`📅 Creazione evento Google Calendar per booking ${bookingId}...`);
      let googleEventId: string | undefined = undefined;
      try {
        // Costruisci descrizione completa
        const descriptionParts = [
          `👤 DATI ANAGRAFICI`,
          `Nome: ${bookingData.patient.name}`,
          `Email: ${bookingData.patient.email}`,
          `Telefono: ${bookingData.patient.phone || 'N/D'}`,
          `Codice Fiscale: ${bookingData.patient.fiscalCode || 'N/D'}`,
          `Data di nascita: ${bookingData.patient.birthDate ? new Date(bookingData.patient.birthDate).toLocaleDateString('it-IT') : 'N/D'}`,
          `Luogo di nascita: ${bookingData.patient.luogoNascita || 'N/D'}`,
          `Professione: ${bookingData.patient.professione || 'N/D'}`,
          ``,
          `📍 INDIRIZZO`,
          `Via: ${bookingData.patient.indirizzo || 'N/D'}`,
          `Città: ${bookingData.patient.citta || 'N/D'}`,
          `Provincia: ${bookingData.patient.provincia || 'N/D'}`,
          `CAP: ${bookingData.patient.cap || 'N/D'}`,
          ``,
          `📄 DOCUMENTO`,
          `Numero: ${bookingData.patient.numeroDocumento || 'N/D'}`,
          `Scadenza: ${bookingData.patient.scadenzaDocumento ? new Date(bookingData.patient.scadenzaDocumento).toLocaleDateString('it-IT') : 'N/D'}`,
          ``,
          `📧 COMUNICAZIONI`,
          `Email comunicazioni: ${bookingData.patient.emailComunicazioni || bookingData.patient.email}`,
        ];

        // Aggiungi dati partner se presenti
        if (bookingData.partnerData) {
          try {
            const partner = JSON.parse(bookingData.partnerData as string);
            descriptionParts.push(
              ``,
              `👥 DATI PARTNER`,
              `Nome: ${partner.name || 'N/D'}`,
              `Email: ${partner.email || 'N/D'}`,
              `Telefono: ${partner.phone || 'N/D'}`,
              `Codice Fiscale: ${partner.fiscalCode || 'N/D'}`,
              `Data di nascita: ${partner.dataNascita ? new Date(partner.dataNascita).toLocaleDateString('it-IT') : 'N/D'}`,
              `Luogo di nascita: ${partner.luogoNascita || 'N/D'}`
            );
          } catch (e) {
            console.error('Errore parsing partnerData:', e);
          }
        }

        // Aggiungi note se presenti
        if (bookingData.notes) {
          descriptionParts.push(``, `📝 NOTE`, bookingData.notes);
        }

        // Titolo evento
        const timeRange = `${format(bookingData.startTime, 'HH:mm')} - ${format(bookingData.endTime, 'HH:mm')}`;
        const isOnlineVisit = bookingData.service.category === "Visita Online";
        const visitType = isOnlineVisit ? `${bookingData.service.name} - online` : bookingData.service.name;
        const eventTitle = `${visitType}, ${bookingData.patient.email}, ${bookingData.patient.name}, ${bookingData.patient.phone || 'N/D'}\n${timeRange}\n${bookingData.patient.indirizzo || 'N/D'}, ${bookingData.patient.citta || 'N/D'} ${bookingData.patient.provincia || ''} ${bookingData.patient.cap || ''}`;

        const calendarEvent = await createGoogleCalendarEvent(
          eventTitle,
          descriptionParts.join('\n'),
          bookingData.startTime,
          bookingData.endTime,
          bookingData.staff.email,
          bookingData.patient.email
        );
        googleEventId = calendarEvent.id || undefined;
        console.log(`✅ Evento Google Calendar creato: ${googleEventId}`);
      } catch (calendarError) {
        console.error(`❌ ERRORE CRITICO: Impossibile creare evento Calendar per booking ${bookingId}:`, calendarError);
        // Se la creazione del Calendar fallisce, NON confermiamo il pagamento
        throw new Error(`Creazione evento Calendar fallita: ${calendarError}`);
      }

      // 3. Conferma il pagamento nel DB e salva l'ID evento Calendar
      const paidBooking = await db.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'PAID',
          googleEventId: googleEventId,
        },
      });
      if (!paidBooking) throw new Error('Prenotazione da aggiornare non trovata.');
      console.log(`✅ Prenotazione ${bookingId} aggiornata a PAGATO con evento Calendar ${googleEventId}.`);

      // 4. Invia email di notifica con allegati al centro medico
      await sendBookingConfirmationToAdmin(bookingId);

      // 5. Invia email di conferma al cliente
      await sendBookingConfirmationToClient(bookingId);

      // 6. Crea e invia fattura
      try {
        const { invoiceId } = await createAndSendInvoice(bookingId);
        if (invoiceId) {
          await db.booking.update({
            where: { id: bookingId },
            data: { fatturaId: invoiceId.toString() },
          });
          console.log(`✅ ID Fattura ${invoiceId} salvato per la prenotazione ${bookingId}.`);
        } else {
          console.error(`⚠️ ATTENZIONE: createAndSendInvoice ha restituito invoiceId null per booking ${bookingId}`);
        }
      } catch (invoiceError) {
        console.error(`❌ ERRORE CRITICO: Impossibile creare fattura per booking ${bookingId}:`, invoiceError);
        // Log dettagliato dell'errore per debugging
        if (invoiceError instanceof Error) {
          console.error(`Messaggio errore: ${invoiceError.message}`);
          console.error(`Stack trace: ${invoiceError.stack}`);
        }
        // IMPORTANTE: anche se la fattura fallisce, continua con la pulizia dati
      }

    } catch (error) {
      console.error(`❌ Errore nel processo post-pagamento per la prenotazione ${bookingId}:`, error);
      // Non rilanciare l'errore e rispondi 200 a Stripe per evitare retry
      return NextResponse.json({ received: true });
    
    } finally {
        // 7. CANCELLAZIONE DATI SENSIBILI (SEMPRE E COMUNQUE)
        // Questo blocco viene eseguito sia in caso di successo che di errore (dopo il catch),
        // garantendo la pulizia dei dati sensibili.
        try {
            await db.booking.update({
                where: { id: bookingId },
                data: {
                    documentoFrente: null,
                    documentoRetro: null,
                    documentoFrentePartner: null,
                    documentoRetroPartner: null,
                },
            });
            console.log(`🧹 Dati sensibili dei documenti cancellati per la prenotazione ${bookingId}.`);
        } catch (cleanupError) {
            console.error(`❌ ERRORE CRITICO: Impossibile cancellare i dati dei documenti per la prenotazione ${bookingId}:`, cleanupError);
            // In un'app di produzione, qui andrebbe inviato un alert a un servizio di monitoring (es. Sentry)
        }
    }

  } else {
    console.warn(`🤷‍♀️ Evento non gestito: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
