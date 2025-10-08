import nodemailer from 'nodemailer';
import { db } from './db';
import { generatePrivacyPdf } from './pdf';
import { formatInTimeZone } from 'date-fns-tz';
import { it } from 'date-fns/locale';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD, // Utilizza la "Password per le app" di Google
    },
});

interface MailOptions {
    from: string;
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType: string; }>;
}

async function sendEmail(mailOptions: MailOptions) {
    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email inviata a: ${mailOptions.to}`);
    } catch (error) {
        console.error(`Errore nell'invio dell'email a ${mailOptions.to}:`, error);
        // Non rilanciare l'errore per non bloccare il flusso principale (es. webhook)
    }
}

export async function sendBookingConfirmationToAdmin(bookingId: string) {
    const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { patient: true, service: true, staff: true },
    });

    if (!booking) throw new Error('Booking not found for email');

    const { patient, service, staff } = booking;

    // 1. Genera il PDF della privacy
    const pdfData = await generatePrivacyPdf(bookingId);

    // 2. Prepara gli allegati
    const attachments = [];
    attachments.push({ filename: `Modulo_Privacy_${patient.name.replace(/ /g, '_')}.pdf`, content: Buffer.from(pdfData), contentType: 'application/pdf' });

    const docFields: Array<keyof typeof booking> = ['documentoFrente', 'documentoRetro', 'documentoFrentePartner', 'documentoRetroPartner'];
    for (const field of docFields) {
        const docValue = booking[field];
        if (docValue && typeof docValue === 'string') {
            const base64Data = docValue.split(';base64,').pop();
            if (base64Data) {
                attachments.push({
                    filename: `${String(field)}_${patient.name.replace(/ /g, '_')}.png`,
                    content: Buffer.from(base64Data, 'base64'),
                    contentType: 'image/png',
                });
            }
        }
    }

    // 3. Formatta la data con timezone corretto
    const ROME_TZ = 'Europe/Rome';
    const appointmentDate = formatInTimeZone(
        new Date(booking.startTime),
        ROME_TZ,
        "EEEE d MMMM yyyy 'alle ore' HH:mm",
        { locale: it }
    );

    // 4. Invia l'email al centro
    const adminMailOptions: MailOptions = {
        from: `"Biofertility Booking" <${process.env.GMAIL_USER}>`,
        to: 'centrimanna2@gmail.com',
        subject: `🆕 Nuova Prenotazione Pagata: ${patient.name} - ${service.name}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
                <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h1 style="color: #2563eb; margin-bottom: 20px; border-bottom: 3px solid #2563eb; padding-bottom: 10px;">
                        🆕 Nuova Prenotazione Pagata
                    </h1>

                    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h2 style="color: #1e40af; margin-top: 0; font-size: 18px;">👤 Dati Paziente</h2>
                        <p style="margin: 5px 0;"><strong>Nome:</strong> ${patient.name}</p>
                        <p style="margin: 5px 0;"><strong>Email:</strong> ${patient.email}</p>
                        <p style="margin: 5px 0;"><strong>Telefono:</strong> ${patient.phone || 'N/D'}</p>
                        <p style="margin: 5px 0;"><strong>Codice Fiscale:</strong> ${patient.fiscalCode || 'N/D'}</p>
                    </div>

                    <div style="background-color: #dcfce7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h2 style="color: #15803d; margin-top: 0; font-size: 18px;">📋 Dettagli Prenotazione</h2>
                        <p style="margin: 5px 0;"><strong>Servizio:</strong> ${service.name}</p>
                        <p style="margin: 5px 0;"><strong>Data e Ora:</strong> ${appointmentDate}</p>
                        <p style="margin: 5px 0;"><strong>Operatore:</strong> ${staff.name}</p>
                        <p style="margin: 5px 0;"><strong>Prezzo:</strong> €${service.price.toFixed(2)}</p>
                        ${booking.notes ? `<p style="margin: 5px 0;"><strong>Note:</strong> ${booking.notes}</p>` : ''}
                    </div>

                    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e;">
                            📎 <strong>Allegati:</strong> Modulo privacy compilato e documenti d'identità del paziente.
                        </p>
                    </div>
                </div>
            </div>
        `,
        attachments,
    };

    await sendEmail(adminMailOptions);
}

export async function sendBookingConfirmationToClient(bookingId: string) {
    const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { patient: true, service: true, staff: true },
    });

    if (!booking) return;

    const { patient, service, staff } = booking;

    // Formatta la data con timezone corretto
    const ROME_TZ = 'Europe/Rome';
    const appointmentDate = formatInTimeZone(
        new Date(booking.startTime),
        ROME_TZ,
        "EEEE d MMMM yyyy",
        { locale: it }
    );
    const appointmentTime = formatInTimeZone(
        new Date(booking.startTime),
        ROME_TZ,
        "HH:mm",
        { locale: it }
    );

    // Prepara il nome del paziente (solo primo nome per essere più friendly)
    const firstName = patient.name.split(' ')[0];

    const clientMailOptions: MailOptions = {
        from: `"Centro Biofertility" <${process.env.GMAIL_USER}>`,
        to: patient.email,
        subject: `✅ Prenotazione Confermata - ${service.name}`,
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

                                <!-- Header con gradiente -->
                                <tr>
                                    <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                                        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">
                                            ✅ Prenotazione Confermata
                                        </h1>
                                        <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">
                                            Il pagamento è stato completato con successo
                                        </p>
                                    </td>
                                </tr>

                                <!-- Saluto personalizzato -->
                                <tr>
                                    <td style="padding: 30px 30px 20px 30px;">
                                        <p style="color: #1f2937; font-size: 16px; line-height: 1.6; margin: 0;">
                                            Gentile <strong>${firstName}</strong>,
                                        </p>
                                        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 10px 0 0 0;">
                                            La ringraziamo per aver scelto il <strong>Centro Biofertility</strong>. La sua prenotazione è stata confermata e registrata nel nostro sistema.
                                        </p>
                                    </td>
                                </tr>

                                <!-- Box dettagli appuntamento -->
                                <tr>
                                    <td style="padding: 0 30px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 10px; border-left: 4px solid #2563eb;">
                                            <tr>
                                                <td style="padding: 25px;">
                                                    <h2 style="color: #1e40af; margin: 0 0 15px 0; font-size: 20px;">
                                                        📅 Dettagli del Tuo Appuntamento
                                                    </h2>

                                                    <table width="100%" cellpadding="8" cellspacing="0">
                                                        <tr>
                                                            <td style="color: #1e3a8a; font-weight: 600; font-size: 14px; padding: 8px 0;">Servizio:</td>
                                                            <td style="color: #1e40af; font-size: 14px; padding: 8px 0;"><strong>${service.name}</strong></td>
                                                        </tr>
                                                        <tr>
                                                            <td style="color: #1e3a8a; font-weight: 600; font-size: 14px; padding: 8px 0;">Data:</td>
                                                            <td style="color: #1e40af; font-size: 14px; padding: 8px 0;"><strong>${appointmentDate}</strong></td>
                                                        </tr>
                                                        <tr>
                                                            <td style="color: #1e3a8a; font-weight: 600; font-size: 14px; padding: 8px 0;">Orario:</td>
                                                            <td style="color: #1e40af; font-size: 14px; padding: 8px 0;"><strong>${appointmentTime}</strong></td>
                                                        </tr>
                                                        <tr>
                                                            <td style="color: #1e3a8a; font-weight: 600; font-size: 14px; padding: 8px 0;">Medico:</td>
                                                            <td style="color: #1e40af; font-size: 14px; padding: 8px 0;"><strong>${staff.name}</strong></td>
                                                        </tr>
                                                        <tr>
                                                            <td style="color: #1e3a8a; font-weight: 600; font-size: 14px; padding: 8px 0;">Durata:</td>
                                                            <td style="color: #1e40af; font-size: 14px; padding: 8px 0;"><strong>${service.durationMinutes} minuti</strong></td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Informazioni importanti -->
                                <tr>
                                    <td style="padding: 20px 30px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
                                            <tr>
                                                <td style="padding: 20px;">
                                                    <h3 style="color: #065f46; margin: 0 0 12px 0; font-size: 16px;">
                                                        ℹ️ Informazioni Importanti
                                                    </h3>
                                                    <ul style="color: #047857; margin: 0; padding-left: 20px; line-height: 1.8;">
                                                        <li>Si prega di presentarsi <strong>10 minuti prima</strong> dell'orario previsto</li>
                                                        <li>Portare con sé un <strong>documento d'identità valido</strong></li>
                                                        <li>In caso di impedimento, contattarci <strong>almeno 24 ore prima</strong></li>
                                                        <li>Riceverai a breve la <strong>fattura fiscale</strong> via email</li>
                                                    </ul>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>

                                <!-- Contatti -->
                                <tr>
                                    <td style="padding: 20px 30px 30px 30px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-radius: 8px;">
                                            <tr>
                                                <td style="padding: 20px; text-align: center;">
                                                    <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">
                                                        📞 Hai domande?
                                                    </h3>
                                                    <p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.6;">
                                                        Contattaci per qualsiasi informazione:<br>
                                                        <strong>Email:</strong> centrimanna2@gmail.com<br>
                                                        <strong>Telefono:</strong> [Inserire numero]
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

    await sendEmail(clientMailOptions);
}
