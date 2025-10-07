import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

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

    // Assicurati che il prezzo sia in centesimi
    const amountInCents = Math.round(booking.service.price * 100);

    // Costruisci l'URL di base per i redirect
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Crea la sessione di checkout di Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: booking.service.name,
              description: `Prenotazione per il ${new Date(booking.startTime).toLocaleString('it-IT')}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
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
