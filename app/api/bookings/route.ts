import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createCalendarEvent } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      serviceId,
      staffId,
      patientEmail,
      patientName,
      patientPhone,
      startTime,
      notes,
      // Consensi legali
      privacyAccepted,
      medicalConsentAccepted,
      informedConsentAccepted,
      termsAccepted,
    } = body;

    if (!serviceId || !staffId || !patientEmail || !patientName || !startTime) {
      return NextResponse.json(
        { error: "Dati mancanti" },
        { status: 400 }
      );
    }

    // Recupera informazioni sul servizio
    const service = await db.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Servizio non trovato" },
        { status: 404 }
      );
    }

    // Calcola endTime
    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMinutes * 60000);

    // Crea o trova il paziente
    let patient = await db.user.findUnique({
      where: { email: patientEmail },
    });

    // Genera firma digitale (hash dei consensi + timestamp)
    const consentTimestamp = new Date().toISOString();
    const crypto = require("crypto");
    const consentSignature = crypto
      .createHash("sha256")
      .update(`${patientEmail}${consentTimestamp}${privacyAccepted}${medicalConsentAccepted}${informedConsentAccepted}${termsAccepted}`)
      .digest("hex");

    if (!patient) {
      const bcrypt = require("bcryptjs");
      const tempPassword = await bcrypt.hash(Math.random().toString(36), 10);

      patient = await db.user.create({
        data: {
          email: patientEmail,
          name: patientName,
          phone: patientPhone,
          password: tempPassword,
          role: "PATIENT",
          // Consensi GDPR
          privacyAccepted: privacyAccepted || false,
          privacyAcceptedAt: privacyAccepted ? new Date() : null,
          // Consensi sanitari
          medicalConsentAccepted: medicalConsentAccepted || false,
          medicalConsentAt: medicalConsentAccepted ? new Date() : null,
          informedConsentAccepted: informedConsentAccepted || false,
          informedConsentAt: informedConsentAccepted ? new Date() : null,
          termsAccepted: termsAccepted || false,
          termsAcceptedAt: termsAccepted ? new Date() : null,
          consentSignature,
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        },
      });
    } else {
      // Aggiorna consensi se paziente già esistente
      patient = await db.user.update({
        where: { id: patient.id },
        data: {
          privacyAccepted: privacyAccepted || patient.privacyAccepted,
          privacyAcceptedAt: privacyAccepted ? new Date() : patient.privacyAcceptedAt,
          medicalConsentAccepted: medicalConsentAccepted || patient.medicalConsentAccepted,
          medicalConsentAt: medicalConsentAccepted ? new Date() : patient.medicalConsentAt,
          informedConsentAccepted: informedConsentAccepted || patient.informedConsentAccepted,
          informedConsentAt: informedConsentAccepted ? new Date() : patient.informedConsentAt,
          termsAccepted: termsAccepted || patient.termsAccepted,
          termsAcceptedAt: termsAccepted ? new Date() : patient.termsAcceptedAt,
          consentSignature,
          ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
        },
      });
    }

    // Crea evento su Google Calendar con tutti i dettagli nel titolo
    const eventTitle = `${patientName} - ${service.name} - €${service.price} - ${patientEmail} - ${patientPhone || "N/D"}`;
    const eventDescription = `
📋 DETTAGLI PRENOTAZIONE

👤 Paziente: ${patientName}
📧 Email: ${patientEmail}
📱 Telefono: ${patientPhone || "N/D"}

🏥 Servizio: ${service.name}
💶 Prezzo: €${service.price}
⏱️ Durata: ${service.durationMinutes} minuti

📝 Note: ${notes || "Nessuna nota"}

---
Sistema Prenotazioni Centro Biofertility
    `.trim();

    const calendarEvent = await createCalendarEvent(
      eventTitle,
      eventDescription,
      start,
      end,
      patientEmail
    );

    // Ottieni link di pagamento dalle impostazioni
    const paymentSetting = await db.settings.findUnique({
      where: { key: "payment_link" },
    });

    // Crea prenotazione
    const booking = await db.booking.create({
      data: {
        serviceId,
        staffId,
        patientId: patient.id,
        startTime: start,
        endTime: end,
        notes,
        googleEventId: calendarEvent.id || undefined,
        paymentLink: paymentSetting?.value || process.env.PAYMENT_LINK_URL,
        status: "PENDING",
      },
      include: {
        service: true,
        staff: true,
        patient: true,
      },
    });

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Errore nella creazione della prenotazione" },
      { status: 500 }
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
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Errore nel recupero delle prenotazioni" },
      { status: 500 }
    );
  }
}
