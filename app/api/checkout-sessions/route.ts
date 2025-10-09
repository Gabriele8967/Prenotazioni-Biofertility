import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';
import { calculateStampDuty } from '@/lib/fattureincloud';

// Inizializza Stripe con la chiave segreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'ID prenotazione mancante' }, { status: 400 });
    }

    // Recupera i dettagli della prenotazione dal database
    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: true,
        patient: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 });
    }

    // Calcola la marca da bollo (obbligatoria per fatture esenti IVA oltre €77,47)
    const stampDuty = calculateStampDuty(booking.service.price);

    // Assicurati che il prezzo sia in centesimi
    const serviceAmountInCents = Math.round(booking.service.price * 100);
    const stampDutyInCents = Math.round(stampDuty * 100);

    console.log(`💰 [CHECKOUT] Servizio: €${booking.service.price} | Marca da bollo: €${stampDuty} | Totale: €${booking.service.price + stampDuty}`);

    // Costruisci l'URL di base per i redirect
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Prepara i line items per Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: booking.service.name,
            description: `Prestazione sanitaria - Prenotazione per il ${new Date(booking.startTime).toLocaleString('it-IT')}`,
          },
          unit_amount: serviceAmountInCents,
        },
        quantity: 1,
      },
    ];

    // Aggiungi la marca da bollo come line item separato (solo se applicabile)
    if (stampDuty > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Marca da Bollo',
            description: 'Imposta di bollo ai sensi art. 15 DPR 642/72 per prestazioni esenti IVA',
          },
          unit_amount: stampDutyInCents,
        },
        quantity: 1,
      });
    }

    // Crea la sessione di checkout di Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${baseUrl}/prenotazioni?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/prenotazioni?payment_cancelled=true`,
      customer_email: booking.patient.email,
      // Metadata è fondamentale per collegare il pagamento alla prenotazione nel webhook
      metadata: {
        bookingId: booking.id,
        patientId: booking.patient.id,
        serviceId: booking.service.id,
        // Includiamo dati per la fatturazione
        patientName: booking.patient.name,
        patientFiscalCode: booking.patient.fiscalCode || '',
        patientPhone: booking.patient.phone || '',
      },
    });

    // Salva l'ID della sessione di Stripe nel booking per riferimento futuro
    await db.booking.update({
      where: { id: booking.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('Errore nella creazione della sessione Stripe:', error);
    const errorMessage = error instanceof Error ? error.message : 'Errore sconosciuto';
    return NextResponse.json({ error: 'Errore interno del server', details: errorMessage }, { status: 500 });
  }
}
