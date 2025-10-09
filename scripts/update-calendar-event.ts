/**
 * Script per aggiornare eventi Google Calendar esistenti con tutti i dati del form
 * 
 * Uso: npx tsx scripts/update-calendar-event.ts <email-paziente>
 */

import { db } from '../lib/db';
import { updateCalendarEvent } from '../lib/google-calendar';

async function updateCalendarEventWithFullData(patientEmail: string) {
  try {
    console.log(`🔍 Ricerca prenotazioni con eventi Google Calendar per ${patientEmail}...`);
    
    // Trova tutte le prenotazioni con googleEventId per questo paziente
    const bookingsWithEvents = await db.booking.findMany({
      where: {
        patient: {
          email: patientEmail
        },
        googleEventId: {
          not: null
        }
      },
      include: {
        patient: true,
        service: true,
        staff: true
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    if (bookingsWithEvents.length === 0) {
      console.log(`⚠️  Nessuna prenotazione con evento Google Calendar trovata per ${patientEmail}`);
      return;
    }

    console.log(`\n📋 Trovate ${bookingsWithEvents.length} prenotazione/i con evento Calendar:\n`);

    for (const booking of bookingsWithEvents) {
      const patient = booking.patient;
      console.log(`📅 Prenotazione ID: ${booking.id}`);
      console.log(`   Google Event ID: ${booking.googleEventId}`);
      console.log(`   Paziente: ${patient.name}`);
      console.log(`   Servizio: ${booking.service.name}`);
      console.log(`   Data: ${booking.startTime.toLocaleDateString('it-IT')} ${booking.startTime.toLocaleTimeString('it-IT')}`);
      console.log(`   Operatore: ${booking.staff.name} (${booking.staff.email})`);
      
      // Costruisci la descrizione completa con tutti i dati
      const descriptionParts = [
        `👤 DATI ANAGRAFICI`,
        `Nome: ${patient.name}`,
        `Email: ${patient.email}`,
        `Telefono: ${patient.phone || 'N/D'}`,
        `Codice Fiscale: ${patient.fiscalCode || 'N/D'}`,
        `Data di nascita: ${patient.birthDate ? patient.birthDate.toLocaleDateString('it-IT') : 'N/D'}`,
        `Luogo di nascita: ${patient.luogoNascita || 'N/D'}`,
        `Professione: ${patient.professione || 'N/D'}`,
        ``,
        `📍 INDIRIZZO`,
        `Via: ${patient.indirizzo || 'N/D'}`,
        `Città: ${patient.citta || 'N/D'}`,
        `CAP: ${patient.cap || 'N/D'}`,
        ``,
        `📄 DOCUMENTO`,
        `Numero: ${patient.numeroDocumento || 'N/D'}`,
        `Scadenza: ${patient.scadenzaDocumento ? patient.scadenzaDocumento.toLocaleDateString('it-IT') : 'N/D'}`,
        ``,
        `📧 COMUNICAZIONI`,
        `Email comunicazioni: ${patient.emailComunicazioni || patient.email}`,
      ];

      // Aggiungi dati partner se presenti
      if (booking.partnerData) {
        try {
          const partner = JSON.parse(booking.partnerData);
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
          console.error('   ⚠️  Errore parsing partnerData:', e);
        }
      }

      // Aggiungi note se presenti
      if (booking.notes) {
        descriptionParts.push(``, `📝 NOTE`, booking.notes);
      }

      const fullDescription = descriptionParts.join('\n');
      
      console.log(`   🔄 Aggiornamento evento Google Calendar...`);
      
      try {
        await updateCalendarEvent(
          booking.googleEventId!,
          booking.staff.email,
          undefined, // Non cambiare il titolo
          fullDescription,
          undefined, // Non cambiare start
          undefined  // Non cambiare end
        );
        
        console.log(`   ✅ Evento aggiornato con successo!\n`);
      } catch (error: any) {
        console.error(`   ❌ Errore durante l'aggiornamento dell'evento:`, error.message);
        if (error.response?.data) {
          console.error(`   Dettagli errore:`, JSON.stringify(error.response.data, null, 2));
        }
        console.log('');
      }
    }

    console.log(`✅ Processo completato!`);

  } catch (error) {
    console.error('❌ Errore durante l\'esecuzione dello script:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Esegui lo script
const patientEmail = process.argv[2];

if (!patientEmail) {
  console.error('❌ Uso: npx tsx scripts/update-calendar-event.ts <email-paziente>');
  console.error('   Esempio: npx tsx scripts/update-calendar-event.ts battaglia.francesco1991@gmail.com');
  process.exit(1);
}

updateCalendarEventWithFullData(patientEmail).catch(error => {
  console.error('Errore fatale:', error);
  process.exit(1);
});
