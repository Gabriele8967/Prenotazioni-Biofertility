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
  try {
    console.log("📥 [BOOKING] Nuova richiesta di prenotazione ricevuta");

    const clientIP = getClientIP(request.headers);
    if (!checkBookingRateLimit(clientIP)) {
      console.error("❌ [BOOKING] Rate limit superato per IP:", clientIP);
      return NextResponse.json({ error: "Troppe richieste. Riprova più tardi." }, { status: 429 });
    }

    const body = await request.json();
    console.log("✅ [BOOKING] Body parsato correttamente");
    const { serviceId, staffId, startTime, notes,
      patientName, patientEmail, patientPhone, luogoNascita, dataNascita, professione, indirizzo, citta, provincia, cap, codiceFiscale, numeroDocumento, scadenzaDocumento, emailComunicazioni,
      partnerData,
      gdprConsent, privacyConsent,
      documentoFrente, documentoRetro, documentoFrentePartner, documentoRetroPartner
    } = body;

    const sanitizedNotes = notes ? sanitizeInput(notes) : null;

    // Sanitizza i dati prima di usarli
    const sanitizedData = {
        name: sanitizeInput(patientName),
        email: sanitizeInput(patientEmail),
        phone: patientPhone ? sanitizeInput(patientPhone) : null,
        luogoNascita: luogoNascita ? sanitizeInput(luogoNascita) : null,
        professione: professione ? sanitizeInput(professione) : null,
        indirizzo: indirizzo ? sanitizeInput(indirizzo) : null,
        citta: citta ? sanitizeInput(citta) : null,
        provincia: provincia ? sanitizeInput(provincia.toUpperCase()) : null,
        cap: cap ? sanitizeInput(cap) : null,
        fiscalCode: codiceFiscale ? formatFiscalCode(sanitizeInput(codiceFiscale)) : null,
        numeroDocumento: numeroDocumento ? sanitizeInput(numeroDocumento) : null,
        emailComunicazioni: emailComunicazioni ? sanitizeInput(emailComunicazioni) : null,
    };

    // Validazione Codice Fiscale
    if (sanitizedData.fiscalCode) {
        const fcValidation = validateFiscalCode(sanitizedData.fiscalCode);
        if (!fcValidation.isValid) {
            console.error("❌ [BOOKING] Codice fiscale non valido:", fcValidation.errors);
            return NextResponse.json({
                error: "Codice fiscale non valido",
                details: fcValidation.errors
            }, { status: 400 });
        }

        // Controlla coerenza con data di nascita se presente
        if (dataNascita) {
            const coherenceCheck = checkFiscalCodeCoherence(sanitizedData.fiscalCode, dataNascita);
            if (!coherenceCheck.isCoherent) {
                console.error("❌ [BOOKING] Codice fiscale non coerente con i dati anagrafici:", coherenceCheck.issues);
                return NextResponse.json({
                    error: "Il codice fiscale non corrisponde ai dati anagrafici inseriti",
                    details: coherenceCheck.issues,
                    suggestions: coherenceCheck.suggestions
                }, { status: 400 });
            }
        }
    }

    // Controlla se l'utente esiste già
    let existingPatient = await db.user.findUnique({ where: { email: sanitizedData.email } });
    const isReturningUser = !!existingPatient;

    // Validazione dati obbligatori
    if (!serviceId || !staffId || !sanitizedData.email || !sanitizedData.name || !startTime || !sanitizedData.fiscalCode) {
      console.error("❌ [BOOKING] Dati mancanti:", { serviceId: !!serviceId, staffId: !!staffId, email: !!sanitizedData.email, name: !!sanitizedData.name, startTime: !!startTime, fiscalCode: !!sanitizedData.fiscalCode });
      return NextResponse.json({ error: "Dati anagrafici o di prenotazione mancanti." }, { status: 400 });
    }

    // Richiedi documenti solo per i nuovi utenti
    if (!isReturningUser && (!documentoFrente || !documentoRetro)) {
        console.error("❌ [BOOKING] Documenti mancanti per nuovo utente:", sanitizedData.email);
        return NextResponse.json({ error: "Documenti di identità mancanti per il nuovo utente." }, { status: 400 });
    }

    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) return NextResponse.json({ error: "Servizio non trovato" }, { status: 404 });

    const staff = await db.user.findUnique({ where: { id: staffId }, select: { email: true } });
    if (!staff) return NextResponse.json({ error: "Staff non trovato" }, { status: 404 });

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

    console.log(`[BOOKING_TRACE] 1. Email ricevuta dal form: ${sanitizedData.email}`);

    let patient = await db.user.findUnique({ where: { email: sanitizedData.email } });

    if (patient) {
      console.log(`[BOOKING_TRACE] 2. Trovato utente esistente con ID: ${patient.id} e email: ${patient.email} e ruolo: ${patient.role}`);
      
      // IMPORTANTE: Non permettere di sovrascrivere utenti ADMIN o STAFF
      if (patient.role === 'ADMIN' || patient.role === 'STAFF') {
        console.error(`[BOOKING_TRACE] ERRORE: Tentativo di sovrascrivere un utente ${patient.role} con email ${patient.email}`);
        return NextResponse.json({ 
          error: "Questa email è già associata a un account amministrativo. Usa un'altra email per la prenotazione." 
        }, { status: 400 });
      }
      
      patient = await db.user.update({ where: { id: patient.id }, data: userPayload });
      console.log(`[BOOKING_TRACE] 3. Utente aggiornato. Email attuale: ${patient.email}`);
    } else {
      const tempPassword = await require("bcryptjs").hash(Math.random().toString(36), 10);
      console.log(`[BOOKING_TRACE] 2. Nessun utente esistente. Creazione nuovo utente con email: ${userPayload.email}`);
      patient = await db.user.create({
        data: { ...userPayload, password: tempPassword, role: "PATIENT" },
      });
      console.log(`[BOOKING_TRACE] 3. Creato nuovo utente con ID: ${patient.id} e email: ${patient.email}`);
    }

    console.log(`[BOOKING_TRACE] 4. ID paziente da associare alla prenotazione: ${patient.id}`);

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
    } catch (calendarError) {
        console.error("⚠️ Errore non bloccante nella creazione dell'evento Google Calendar:", calendarError);
        // Non bloccare il flusso se la creazione dell'evento fallisce
    }

    const booking = await db.booking.create({
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
