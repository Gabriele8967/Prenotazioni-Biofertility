import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { format } from "date-fns";
import {
  checkBookingRateLimit,
  getClientIP,
  sanitizeInput,
  isValidEmail,
  isValidItalianPhone,
} from "@/lib/security";
import { validateFiscalCode, checkFiscalCodeCoherence, formatFiscalCode } from "@/lib/fiscal-code-validator";
import { handleApiError } from "@/lib/error-handler";
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  const MAX_PAYLOAD_SIZE = 4.4 * 1024 * 1024;
  const contentLength = request.headers.get('content-length');

  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    console.error(`❌ [SERVICE_REQUEST] Payload troppo grande: ${contentLength} bytes`);
    return NextResponse.json(
      { error: `Richiesta troppo grande. La dimensione totale non può superare i 4.4MB.` },
      { status: 413 }
    );
  }

  try {
    const timestamp = new Date().toISOString();
    console.log(`\n${"=".repeat(80)}`);
    console.log(`📥 [SERVICE_REQUEST ${timestamp}] Nuova richiesta servizio su richiesta`);
    console.log("=".repeat(80));

    const clientIP = getClientIP(request.headers);
    console.log(`🌐 [SERVICE_REQUEST] IP Client: ${clientIP}`);

    if (!checkBookingRateLimit(clientIP)) {
      console.error("❌ [SERVICE_REQUEST] Rate limit superato per IP:", clientIP);
      return NextResponse.json({ error: "Troppe richieste. Riprova più tardi." }, { status: 429 });
    }
    console.log("✅ [SERVICE_REQUEST] Rate limit OK");

    const body = await request.json();
    console.log("✅ [SERVICE_REQUEST] Body parsato correttamente");
    console.log(`📧 [SERVICE_REQUEST] Email paziente: ${body.patientEmail}`);

    const {
      serviceId,
      patientName,
      patientEmail,
      patientPhone,
      luogoNascita,
      dataNascita,
      professione,
      indirizzo,
      citta,
      provincia,
      cap,
      codiceFiscale,
      notes
    } = body;

    console.log("🔄 [SERVICE_REQUEST] Sanitizzazione dati in corso...");

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
      notes: notes ? sanitizeInput(notes) : null,
    };

    console.log("✅ [SERVICE_REQUEST] Dati sanitizzati");

    // Validazione Codice Fiscale
    console.log("🔍 [SERVICE_REQUEST] Validazione codice fiscale...");
    if (sanitizedData.fiscalCode) {
      const fcValidation = validateFiscalCode(sanitizedData.fiscalCode);
      if (!fcValidation.isValid) {
        console.error("❌ [SERVICE_REQUEST] Codice fiscale non valido:", sanitizedData.fiscalCode);
        return NextResponse.json({
          error: "Codice fiscale non valido",
          details: fcValidation.errors
        }, { status: 400 });
      }
      console.log("✅ [SERVICE_REQUEST] Codice fiscale formato valido");

      if (dataNascita) {
        console.log(`🔍 [SERVICE_REQUEST] Verifica coerenza CF con data nascita: ${dataNascita}`);
        const coherenceCheck = checkFiscalCodeCoherence(sanitizedData.fiscalCode, dataNascita);
        if (!coherenceCheck.isCoherent) {
          console.error("❌ [SERVICE_REQUEST] CF non coerente:", coherenceCheck.issues);
          return NextResponse.json({
            error: "Il codice fiscale non corrisponde ai dati anagrafici inseriti",
            details: coherenceCheck.issues,
            suggestions: coherenceCheck.suggestions
          }, { status: 400 });
        }
        console.log("✅ [SERVICE_REQUEST] CF coerente con data nascita");
      }
    }

    // Validazione campi obbligatori
    console.log("🔍 [SERVICE_REQUEST] Validazione campi obbligatori...");
    const missingFields: string[] = [];
    if (!serviceId) missingFields.push('Servizio');
    if (!sanitizedData.email) missingFields.push('Email');
    if (!sanitizedData.name) missingFields.push('Nome');
    if (!sanitizedData.fiscalCode) missingFields.push('Codice Fiscale');
    if (!sanitizedData.phone) missingFields.push('Telefono');
    if (!luogoNascita) missingFields.push('Luogo di nascita');
    if (!dataNascita) missingFields.push('Data di nascita');

    if (missingFields.length > 0) {
      console.error("❌ [SERVICE_REQUEST] Campi obbligatori mancanti:", missingFields);
      return NextResponse.json({
        error: `Campi obbligatori mancanti: ${missingFields.join(', ')}`,
        missingFields
      }, { status: 400 });
    }
    console.log("✅ [SERVICE_REQUEST] Tutti i campi obbligatori presenti");

    console.log("🔍 [SERVICE_REQUEST] Recupero servizio dal database...");
    const service = await db.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      console.error("❌ [SERVICE_REQUEST] Servizio non trovato:", serviceId);
      return NextResponse.json({ error: "Servizio non trovato" }, { status: 404 });
    }

    if (!service.onRequest) {
      console.error("❌ [SERVICE_REQUEST] Servizio non è su richiesta:", serviceId);
      return NextResponse.json({ error: "Questo servizio non è disponibile su richiesta" }, { status: 400 });
    }

    console.log(`✅ [SERVICE_REQUEST] Servizio trovato: ${service.name} (su richiesta)`);

    // Invia email al centro
    console.log("📧 [SERVICE_REQUEST] Invio email al centro...");

    const mailOptions = {
      from: `"Biofertility Booking" <${process.env.GMAIL_USER}>`,
      to: 'centrimanna2@gmail.com',
      subject: `🔔 Nuova Richiesta Servizio: ${service.name} - ${sanitizedData.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #f59e0b; margin-bottom: 20px; border-bottom: 3px solid #f59e0b; padding-bottom: 10px;">
              🔔 Nuova Richiesta Servizio su Richiesta
            </h1>

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #92400e; margin-top: 0; font-size: 18px;">📋 Servizio Richiesto</h2>
              <p style="margin: 5px 0;"><strong>Servizio:</strong> ${service.name}</p>
              <p style="margin: 5px 0;"><strong>Prezzo indicativo:</strong> €${service.price.toFixed(2)}</p>
              ${service.description ? `<p style="margin: 5px 0;"><strong>Descrizione:</strong> ${service.description}</p>` : ''}
            </div>

            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1e40af; margin-top: 0; font-size: 18px;">👤 Dati Paziente</h2>
              <p style="margin: 5px 0;"><strong>Nome:</strong> ${sanitizedData.name}</p>
              <p style="margin: 5px 0;"><strong>Email:</strong> ${sanitizedData.email}</p>
              <p style="margin: 5px 0;"><strong>Telefono:</strong> ${sanitizedData.phone || 'N/D'}</p>
              <p style="margin: 5px 0;"><strong>Codice Fiscale:</strong> ${sanitizedData.fiscalCode || 'N/D'}</p>
              <p style="margin: 5px 0;"><strong>Data di nascita:</strong> ${dataNascita ? new Date(dataNascita).toLocaleDateString('it-IT') : 'N/D'}</p>
              <p style="margin: 5px 0;"><strong>Luogo di nascita:</strong> ${sanitizedData.luogoNascita || 'N/D'}</p>
              ${sanitizedData.professione ? `<p style="margin: 5px 0;"><strong>Professione:</strong> ${sanitizedData.professione}</p>` : ''}
              ${sanitizedData.indirizzo ? `<p style="margin: 5px 0;"><strong>Indirizzo:</strong> ${sanitizedData.indirizzo}</p>` : ''}
              ${sanitizedData.citta ? `<p style="margin: 5px 0;"><strong>Città:</strong> ${sanitizedData.citta}</p>` : ''}
              ${sanitizedData.provincia ? `<p style="margin: 5px 0;"><strong>Provincia:</strong> ${sanitizedData.provincia}</p>` : ''}
              ${sanitizedData.cap ? `<p style="margin: 5px 0;"><strong>CAP:</strong> ${sanitizedData.cap}</p>` : ''}
            </div>

            ${sanitizedData.notes ? `
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #374151; margin-top: 0; font-size: 18px;">📝 Note del Paziente</h2>
              <p style="margin: 5px 0;">${sanitizedData.notes}</p>
            </div>
            ` : ''}

            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                ⚠️ <strong>Azione richiesta:</strong> Contattare il paziente per confermare la disponibilità e fissare l'appuntamento.
              </p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ [SERVICE_REQUEST] Email inviata al centro`);

    // Invia email di conferma al paziente
    const clientMailOptions = {
      from: `"Centro Biofertility" <${process.env.GMAIL_USER}>`,
      to: sanitizedData.email,
      subject: `📩 Richiesta Ricevuta - ${service.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 20px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
                        📩 Richiesta Ricevuta
                      </h1>
                      <p style="color: #fef3c7; margin: 10px 0 0 0; font-size: 16px;">
                        La tua richiesta è stata inviata con successo
                      </p>
                    </td>
                  </tr>

                  <!-- Saluto -->
                  <tr>
                    <td style="padding: 30px 30px 20px 30px;">
                      <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0;">
                        Gentile <strong>${sanitizedData.name.split(' ')[0]}</strong>,
                      </p>
                      <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 10px 0 0 0;">
                        Abbiamo ricevuto la tua richiesta per il servizio <strong>${service.name}</strong>.
                      </p>
                    </td>
                  </tr>

                  <!-- Info servizio -->
                  <tr>
                    <td style="padding: 0 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 10px; border-left: 4px solid #f59e0b;">
                        <tr>
                          <td style="padding: 25px;">
                            <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 20px;">
                              📋 Servizio Richiesto
                            </h2>
                            <p style="margin: 5px 0; color: #78350f;"><strong>Servizio:</strong> ${service.name}</p>
                            <p style="margin: 5px 0; color: #78350f;"><strong>Costo indicativo:</strong> €${service.price.toFixed(2)}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Prossimi passi -->
                  <tr>
                    <td style="padding: 20px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #dbeafe; border-radius: 8px; border-left: 4px solid #2563eb;">
                        <tr>
                          <td style="padding: 20px;">
                            <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 16px;">
                              ⏭️ Prossimi Passi
                            </h3>
                            <p style="color: #1e3a8a; margin: 0; line-height: 1.8;">
                              Il nostro centro ti contatterà <strong>entro 2-3 giorni lavorativi</strong> per:<br>
                              • Confermare la disponibilità del servizio<br>
                              • Fissare data e ora dell'appuntamento<br>
                              • Fornire eventuali istruzioni pre-esame
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Contatti -->
                  <tr>
                    <td style="padding: 20px 30px 30px 30px;">
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; border-radius: 8px;">
                        <tr>
                          <td style="padding: 20px; text-align: center;">
                            <h3 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">
                              📞 Contatti
                            </h3>
                            <p style="color: #4b5563; margin: 0; font-size: 14px; line-height: 1.6;">
                              Per informazioni urgenti:<br>
                              <strong>Email:</strong> centrimanna2@gmail.com<br>
                              <strong>Telefono:</strong> 06 841 5269
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 25px 30px; text-align: center;">
                      <p style="color: #9ca3af; margin: 0 0 5px 0; font-size: 14px;">
                        Grazie per la fiducia,
                      </p>
                      <p style="color: #e5e7eb; margin: 0; font-size: 16px; font-weight: 600;">
                        Il Team di Centro Biofertility
                      </p>
                      <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 12px;">
                        Questa è una email automatica, si prega di non rispondere.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(clientMailOptions);
    console.log(`✅ [SERVICE_REQUEST] Email di conferma inviata al paziente`);

    console.log("=".repeat(80));
    console.log(`✅ [SERVICE_REQUEST] Richiesta completata con successo!`);
    console.log(`   Paziente: ${sanitizedData.name} (${sanitizedData.email})`);
    console.log(`   Servizio: ${service.name}`);
    console.log("=".repeat(80) + "\n");

    return NextResponse.json({
      success: true,
      message: "Richiesta inviata con successo. Ti contatteremo entro 2-3 giorni lavorativi."
    });

  } catch (error) {
    return handleApiError(
      error,
      'POST /api/service-requests',
      'Errore durante l\'invio della richiesta. Riprova tra qualche istante.'
    );
  }
}
