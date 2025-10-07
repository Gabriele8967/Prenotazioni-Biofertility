import nodemailer from 'nodemailer';
import { db } from './db';
import { generatePrivacyPdf } from './pdf';

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

    // 3. Invia l'email al centro
    const adminMailOptions: MailOptions = {
        from: `"Biofertility Booking" <${process.env.GMAIL_USER}>`,
        to: 'centrimanna2@gmail.com',
        subject: `Nuova Prenotazione Pagata: ${patient.name} - ${service.name}`,
        html: `
            <h1>Nuova Prenotazione Pagata</h1>
            <p><strong>Paziente:</strong> ${patient.name}</p>
            <p><strong>Email:</strong> ${patient.email}</p>
            <p><strong>Servizio:</strong> ${service.name}</p>
            <p><strong>Data:</strong> ${new Date(booking.startTime).toLocaleString('it-IT')}</p>
            <p><strong>Staff:</strong> ${staff.name}</p>
            <p>In allegato trovi il modulo privacy compilato e i documenti d'identità.</p>
        `,
        attachments,
    };

    await sendEmail(adminMailOptions);
}

export async function sendBookingConfirmationToClient(bookingId: string) {
    const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { patient: true, service: true },
    });

    if (!booking) return;

    const { patient, service } = booking;

    const clientMailOptions: MailOptions = {
        from: `"Centro Biofertility" <${process.env.GMAIL_USER}>`,
        to: patient.email,
        subject: `La tua prenotazione per ${service.name} è confermata!`,
        html: `
            <h1>Prenotazione Confermata</h1>
            <p>Ciao ${patient.name},</p>
            <p>La tua prenotazione per <strong>${service.name}</strong> è stata confermata con successo.</p>
            <p><strong>Data e Ora:</strong> ${new Date(booking.startTime).toLocaleString('it-IT')}</p>
            <p>A breve riceverai anche la fattura per il pagamento effettuato.</p>
            <br>
            <p>Grazie,</p>
            <p>Il team di Biofertility</p>
        `,
    };

    await sendEmail(clientMailOptions);
}
