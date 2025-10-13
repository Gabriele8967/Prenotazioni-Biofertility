import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import { createAndSendInvoice } from '@/lib/fattureincloud';
import { sendBookingConfirmationToAdmin, sendBookingConfirmationToClient } from '@/lib/email';

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
      // 1. Conferma il pagamento nel DB
      const paidBooking = await db.booking.update({
        where: { id: bookingId },
        data: { paymentStatus: 'PAID' },
      });
      if (!paidBooking) throw new Error('Prenotazione da aggiornare non trovata.');
      console.log(`✅ Prenotazione ${bookingId} aggiornata a PAGATO.`);

      // 2. Invia email di notifica con allegati al centro medico
      await sendBookingConfirmationToAdmin(bookingId);

      // 3. Invia email di conferma al cliente
      await sendBookingConfirmationToClient(bookingId);

      // 4. Crea e invia fattura
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
        // 5. CANCELLAZIONE DATI SENSIBILI (SEMPRE E COMUNQUE)
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
