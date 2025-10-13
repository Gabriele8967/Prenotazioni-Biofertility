import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";
import { format } from "date-fns";
import {
  checkBookingRateLimit,
  getClientIP,
  sanitizeInput,
  isValidEmail,
  isValidItalianPhone,
  logSuspiciousActivity,
} from "@/lib/security";
import { validateFiscalCode, checkFiscalCodeCoherence, formatFiscalCode } from "@/lib/fiscal-code-validator";
import { handleApiError, AppError, ErrorType, logger, handleDatabaseError } from "@/lib/error-handler";
import { validatePatientData } from "@/lib/validators";

export async function POST(request: NextRequest) {
  // Limite dimensione payload (4.4MB per sicurezza sotto il limite di 4.5MB di Vercel)
  const MAX_PAYLOAD_SIZE = 4.4 * 1024 * 1024;
  const contentLength = request.headers.get('content-length');

  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    console.error(`❌ [BOOKING] Payload troppo grande: ${contentLength} bytes`);
    return NextResponse.json(
      { error: `Richiesta troppo grande. La dimensione totale non può superare i 4.4MB. Prova a usare immagini più piccole.` },
      { status: 413 } // 413 Payload Too Large
    );
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📥 [BOOKING ${timestamp}] Nuova richiesta di prenotazione`);
    console.log("=".repeat(80));

    const clientIP = getClientIP(request.headers);
    console.log(`🌐 [BOOKING] IP Client: ${clientIP}`);

    if (!checkBookingRateLimit(clientIP)) {
      console.error("❌ [BOOKING] Rate limit superato per IP:", clientIP);
      return NextResponse.json({ error: "Troppe richieste. Riprova più tardi." }, { status: 429 });
    }
    console.log("✅ [BOOKING] Rate limit OK");

    const body = await request.json();
    console.log("✅ [BOOKING] Body parsato correttamente");
    console.log(`📧 [BOOKING] Email paziente: ${body.patientEmail}`);
    const { serviceId, staffId, startTime, notes,
      patientName, patientEmail, patientPhone, luogoNascita, dataNascita, professione, indirizzo, citta, provincia, cap, codiceFiscale, numeroDocumento, scadenzaDocumento, emailComunicazioni,
      partnerData,
      gdprConsent, privacyConsent,
      documentoFrente, documentoRetro, documentoFrentePartner, documentoRetroPartner
    } = body;

    const sanitizedNotes = notes ? sanitizeInput(notes) : null;

    console.log("🔄 [BOOKING] Sanitizzazione dati in corso...");

    // Sanitizza i dati prima di usarli
    const sanitizedData = {
        name: sanitizeInput(patientName),
        email: sanitizeInput(patientEmail),
        phone: patientPhone ? sanitizeInput(patientPhone) : null,
        luogoNascita: luogoNascita ? sanitizeInput(luogoNascita) : null,
        professione: professione ? sanitizeInput(professione) : null,
        indirizzo: indirizzo ? sanitizeInput(indirizzo) : null,
        citta: citta ? sanitizeInput(citta) : null,
        provincia: provincia ? sanitizeInput(provincia).toUpperCase() : null,
        cap: cap ? sanitizeInput(cap) : null,
        fiscalCode: codiceFiscale ? formatFiscalCode(sanitizeInput(codiceFiscale)) : null,
        numeroDocumento: numeroDocumento ? sanitizeInput(numeroDocumento) : null,
        emailComunicazioni: emailComunicazioni ? sanitizeInput(emailComunicazioni) : null,
    };

    console.log("✅ [BOOKING] Dati sanitizzati");

    // Validazione Codice Fiscale
    console.log("🔍 [BOOKING] Validazione codice fiscale...");
    if (sanitizedData.fiscalCode) {
        const fcValidation = validateFiscalCode(sanitizedData.fiscalCode);
        if (!fcValidation.isValid) {
            console.error("❌ [BOOKING] Codice fiscale non valido:", sanitizedData.fiscalCode, "Errori:", fcValidation.errors);
            return NextResponse.json({
                error: "Codice fiscale non valido",
                details: fcValidation.errors
            }, { status: 400 });
        }
        console.log("✅ [BOOKING] Codice fiscale formato valido");

        // Controlla coerenza con data di nascita se presente
        if (dataNascita) {
            console.log(`🔍 [BOOKING] Verifica coerenza CF con data nascita: ${dataNascita}`);
            const coherenceCheck = checkFiscalCodeCoherence(sanitizedData.fiscalCode, dataNascita);
            if (!coherenceCheck.isCoherent) {
                console.error("❌ [BOOKING] CF non coerente:", coherenceCheck.issues);
                return NextResponse.json({
                    error: "Il codice fiscale non corrisponde ai dati anagrafici inseriti",
                    details: coherenceCheck.issues,
                    suggestions: coherenceCheck.suggestions
                }, { status: 400 });
            }
            console.log("✅ [BOOKING] CF coerente con data nascita");
        }
    }

    // Controlla se l'utente esiste già
    console.log("🔍 [BOOKING] Verifica utente esistente...");
    let existingPatient = await db.user.findUnique({ where: { email: sanitizedData.email } });
    const isReturningUser = !!existingPatient;
    console.log(`${isReturningUser ? '🔄' : '🆕'} [BOOKING] Utente ${isReturningUser ? 'esistente' : 'nuovo'}`);

    // Validazione dati obbligatori completa
    console.log("🔍 [BOOKING] Validazione campi obbligatori...");
    const missingFields: string[] = [];
    if (!serviceId) missingFields.push('Servizio');
    if (!staffId) missingFields.push('Operatore');
    if (!sanitizedData.email) missingFields.push('Email');
    if (!sanitizedData.name) missingFields.push('Nome');
    if (!startTime) missingFields.push('Data e ora');
    if (!sanitizedData.fiscalCode) missingFields.push('Codice Fiscale');
    if (!sanitizedData.phone) missingFields.push('Telefono');
    if (!luogoNascita) missingFields.push('Luogo di nascita');
    if (!dataNascita) missingFields.push('Data di nascita');
    if (!professione) missingFields.push('Professione');
    if (!indirizzo) missingFields.push('Indirizzo');
    if (!citta) missingFields.push('Città');
    if (!provincia) missingFields.push('Provincia');
    if (!cap) missingFields.push('CAP');
    if (!numeroDocumento) missingFields.push('Numero documento');
    if (!scadenzaDocumento) missingFields.push('Scadenza documento');

    if (missingFields.length > 0) {
      console.error("❌ [BOOKING] Campi obbligatori mancanti:", missingFields);
      return NextResponse.json({
        error: `Campi obbligatori mancanti: ${missingFields.join(', ')}`,
        missingFields
      }, { status: 400 });
    }
    console.log("✅ [BOOKING] Tutti i campi obbligatori presenti");

    // Richiedi documenti solo per i nuovi utenti
    console.log("🔍 [BOOKING] Verifica documenti...");
    if (!isReturningUser && (!documentoFrente || !documentoRetro)) {
        console.error("❌ [BOOKING] Documenti mancanti per nuovo utente:", sanitizedData.email);
        return NextResponse.json({ error: "Documenti di identità mancanti per il nuovo utente." }, { status: 400 });
    }
    console.log(`✅ [BOOKING] Documenti OK ${!isReturningUser ? '(nuovi documenti caricati)' : '(utente esistente)'}`);

    console.log("🔍 [BOOKING] Recupero servizio e staff dal database...");
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) {
        console.error("❌ [BOOKING] Servizio non trovato:", serviceId);
        return NextResponse.json({ error: "Servizio non trovato" }, { status: 404 });
    }
    console.log(`✅ [BOOKING] Servizio trovato: ${service.name} (€${service.price})`);

    const staff = await db.user.findUnique({ where: { id: staffId }, select: { email: true, name: true } });
    if (!staff) {
        console.error("❌ [BOOKING] Staff non trovato:", staffId);
        return NextResponse.json({ error: "Staff non trovato" }, { status: 404 });
    }
    console.log(`✅ [BOOKING] Staff trovato: ${staff.name}`);

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    const consentSignature = require("crypto").createHash("sha256").update(`${sanitizedData.email}${new Date().toISOString()}${gdprConsent}${privacyConsent}`).digest("hex");

    const userPayload = {
        ...sanitizedData,
        birthDate: dataNascita ? new Date(dataNascita) : null,
        scadenzaDocumento: scadenzaDocumento ? new Date(scadenzaDocumento) : null,
        consentSignature,
        ipAddress: clientIP,
        privacyAccepted: gdprConsent,
        privacyAcceptedAt: gdprConsent ? new Date() : null,
        dataProcessingConsent: privacyConsent,
    };

    console.log("🔄 [BOOKING] Creazione/aggiornamento utente paziente...");

    let patient = await db.user.findUnique({ where: { email: sanitizedData.email } });

    if (patient) {
      console.log(`🔄 [BOOKING] Utente esistente (ID: ${patient.id}, Ruolo: ${patient.role})`);

      // IMPORTANTE: Non permettere di sovrascrivere utenti ADMIN o STAFF
      if (patient.role === 'ADMIN' || patient.role === 'STAFF') {
        console.error(`❌ [BOOKING] ERRORE: Tentativo di sovrascrivere utente ${patient.role}`);
        return NextResponse.json({
          error: "Questa email è già associata a un account amministrativo. Usa un'altra email per la prenotazione."
        }, { status: 400 });
      }

      try {
        patient = await db.user.update({ where: { id: patient.id }, data: userPayload });
        console.log(`✅ [BOOKING] Utente aggiornato con successo (ID: ${patient.id})`);
      } catch (dbError) {
        console.error("❌ [BOOKING] Errore durante aggiornamento utente:", dbError);
        throw dbError;
      }
    } else {
      console.log("🆕 [BOOKING] Creazione nuovo paziente...");
      const tempPassword = await require("bcryptjs").hash(Math.random().toString(36), 10);

      try {
        patient = await db.user.create({
          data: { ...userPayload, password: tempPassword, role: "PATIENT" },
        });
        console.log(`✅ [BOOKING] Nuovo paziente creato (ID: ${patient.id})`);
      } catch (dbError) {
        console.error("❌ [BOOKING] Errore durante creazione paziente:", dbError);
        throw dbError;
      }
    }

    console.log("📅 [BOOKING] Creazione evento Google Calendar...");
    let googleEventId: string | undefined = undefined;
    try {
        // Costruisci una descrizione completa con tutti i dati del form
        const descriptionParts = [
            `👤 DATI ANAGRAFICI`,
            `Nome: ${sanitizedData.name}`,
            `Email: ${sanitizedData.email}`,
            `Telefono: ${sanitizedData.phone || 'N/D'}`,
            `Codice Fiscale: ${sanitizedData.fiscalCode || 'N/D'}`,
            `Data di nascita: ${dataNascita ? new Date(dataNascita).toLocaleDateString('it-IT') : 'N/D'}`,
            `Luogo di nascita: ${sanitizedData.luogoNascita || 'N/D'}`,
            `Professione: ${sanitizedData.professione || 'N/D'}`,
            ``,
            `📍 INDIRIZZO`,
            `Via: ${sanitizedData.indirizzo || 'N/D'}`,
            `Città: ${sanitizedData.citta || 'N/D'}`,
            `Provincia: ${sanitizedData.provincia || 'N/D'}`,
            `CAP: ${sanitizedData.cap || 'N/D'}`,
            ``,
            `📄 DOCUMENTO`,
            `Numero: ${sanitizedData.numeroDocumento || 'N/D'}`,
            `Scadenza: ${scadenzaDocumento ? new Date(scadenzaDocumento).toLocaleDateString('it-IT') : 'N/D'}`,
            ``,
            `📧 COMUNICAZIONI`,
            `Email comunicazioni: ${sanitizedData.emailComunicazioni || sanitizedData.email}`,
        ];

        // Aggiungi dati partner se presenti
        if (partnerData) {
            try {
                const partner = JSON.parse(partnerData);
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
        if (sanitizedNotes) {
            descriptionParts.push(``, `📝 NOTE`, sanitizedNotes);
        }

        // Titolo evento con tutti i dati principali (come da formato centro medico)
        // Formato: "Tipo Visita - online/in sede, email, nome, telefono\nOrario\nIndirizzo"
        const timeRange = `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
        const eventTitle = `${service.name} - online, ${sanitizedData.email}, ${sanitizedData.name}, ${sanitizedData.phone || 'N/D'}\n${timeRange}\n${sanitizedData.indirizzo || 'N/D'}, ${sanitizedData.citta || 'N/D'} ${sanitizedData.provincia || ''} ${sanitizedData.cap || ''}`;

        const calendarEvent = await createGoogleCalendarEvent(
            eventTitle,
            descriptionParts.join('\n'),
            start, end, staff.email, sanitizedData.email
        );
        googleEventId = calendarEvent.id || undefined;
        console.log(`✅ [BOOKING] Evento Google Calendar creato: ${googleEventId}`);
    } catch (calendarError) {
        console.error("⚠️  [BOOKING] Errore Google Calendar (non bloccante):", calendarError);
        // Non bloccare il flusso se la creazione dell'evento fallisce
    }

    console.log("💾 [BOOKING] Salvataggio prenotazione nel database...");
    let booking;
    try {
      booking = await db.booking.create({
        data: {
          serviceId, staffId, patientId: patient.id, startTime: start, endTime: end, notes: sanitizedNotes,
          googleEventId: googleEventId,
          status: "PENDING",
          partnerData: partnerData as string | undefined,
          documentoFrente,
          documentoRetro,
          documentoFrentePartner,
          documentoRetroPartner,
        },
      });
      console.log(`✅ [BOOKING] Prenotazione salvata (ID: ${booking.id})`);
    } catch (dbError) {
      console.error("❌ [BOOKING] ERRORE CRITICO durante creazione prenotazione:", dbError);
      throw dbError;
    }

    console.log("=".repeat(80));
    console.log(`✅ [BOOKING] Prenotazione completata con successo!`);
    console.log(`   Paziente: ${patient.name} (${patient.email})`);
    console.log(`   Servizio: ${service.name}`);
    console.log(`   Data: ${start.toLocaleString('it-IT')}`);
    console.log(`   Booking ID: ${booking.id}`);
    console.log("=".repeat(80) + "\n");

    return NextResponse.json(booking);

  } catch (error) {
    return handleApiError(
      error,
      'POST /api/bookings',
      'Errore durante la creazione della prenotazione. Riprova tra qualche istante.'
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const patientEmail = searchParams.get("patientEmail");
    const staffId = searchParams.get("staffId");

    let whereClause: any = {};

    if (patientEmail) {
      whereClause.patient = { email: patientEmail };
    }

    if (staffId) {
      whereClause.staffId = staffId;
    }

    const bookings = await db.booking.findMany({
      where: whereClause,
      include: {
        service: true,
        staff: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        startTime: "desc",
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    return handleApiError(
      error,
      'GET /api/bookings',
      'Errore nel recupero delle prenotazioni'
    );
  }
}
