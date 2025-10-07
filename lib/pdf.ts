import { PDFDocument, rgb, StandardFonts, PDFFont } from 'pdf-lib';
import { db } from './db';
import { Booking, User } from '@prisma/client';

// Funzione di utilità per il wrapping del testo
function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const words = text.split(' ');
    let lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = font.widthOfTextAtSize(currentLine + " " + word, size);
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

export async function generatePrivacyPdf(bookingId: string): Promise<Uint8Array> {
    const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: { patient: true },
    });

    if (!booking || !booking.patient) {
        throw new Error('Booking or patient not found for PDF generation');
    }

    const { patient } = booking;
    const partner = booking.partnerData ? JSON.parse(booking.partnerData as string) : null;

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 50;
    let y = height - 40;

    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    const center = (text: string, font: PDFFont, size: number, yPos: number) => {
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: (width - textWidth) / 2, y: yPos, font, size, color: rgb(0, 0, 0) });
    };

    center('PRESTAZIONE DEL CONSENSO PER IL TRATTAMENTO', timesRomanBoldFont, 14, y); y -= 18;
    center('DEI DATI PERSONALI E SENSIBILI PER I PAZIENTI DEL', timesRomanBoldFont, 14, y); y -= 18;
    center('CENTRO DI PROCREAZIONE MEDICALMENTE ASSISTITA', timesRomanBoldFont, 14, y); y -= 18;
    center('BIOFERTILITY', timesRomanBoldFont, 14, y); y -= 30;

    const drawSection = (title: string, data: Record<string, any>) => {
        if (y < margin + 40) { page = pdfDoc.addPage(); y = height - margin; }
        page.drawText(title, { x: margin, y, font: timesRomanBoldFont, size: 12 }); y -= 20;
        for (const [key, value] of Object.entries(data)) {
            if (y < margin) { page = pdfDoc.addPage(); y = height - margin; }
            page.drawText(`${key}:`, { x: margin + 10, y, font: timesRomanBoldFont, size: 10 });
            page.drawText(String(value || 'N/D'), { x: margin + 150, y, font: timesRomanFont, size: 10 });
            y -= 15;
        }
    };

    drawSection('DATI PAZIENTE PRINCIPALE', {
        'Nome e Cognome': patient.name,
        'Data di Nascita': patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('it-IT') : 'N/D',
        'Luogo di Nascita': patient.luogoNascita,
        'Professione': patient.professione,
        'Indirizzo': `${patient.indirizzo}, ${patient.citta} ${patient.cap}`,
        'Codice Fiscale': patient.fiscalCode,
        'Telefono': patient.phone,
        'Documento N.': patient.numeroDocumento,
        'Scadenza Documento': patient.scadenzaDocumento ? new Date(patient.scadenzaDocumento).toLocaleDateString('it-IT') : 'N/D',
        'Email Comunicazioni': patient.emailComunicazioni,
    });

    if (partner) {
        y -= 10;
        drawSection('DATI PARTNER', {
            'Nome e Cognome': `${partner.nomePartner} ${partner.cognomePartner}`,
            'Data di Nascita': partner.dataNascitaPartner ? new Date(partner.dataNascitaPartner).toLocaleDateString('it-IT') : 'N/D',
            'Luogo di Nascita': partner.luogoNascitaPartner,
            'Codice Fiscale': partner.codiceFiscalePartner,
            'Telefono': partner.telefonoPartner,
        });
    }

    y -= 20;
    page.drawText('DICHIARAZIONE DI CONSENSO', { x: margin, y, font: timesRomanBoldFont, size: 12 }); y -= 15;

    const consentText = `Il/La sottoscritto/a ${patient.name}${partner ? ` e ${partner.nomePartner} ${partner.cognomePartner}` : ''}, pienamente consapevole della importanza della presente dichiarazione, dichiara di essere stato esaustivamente e chiaramente informato su:`;
    const consentLines = wrapText(consentText, timesRomanFont, 10, width - margin * 2);
    consentLines.forEach(line => { y -= 12; page.drawText(line, { x: margin, y, font: timesRomanFont, size: 10 }); });

    y -= 15;
    const infoPoints = [
        'le finalità e le modalità del trattamento cui sono destinati i dati, connesse con le attività di prevenzione, diagnosi, cura e riabilitazione, svolte dal medico a tutela della salute;',
        'i soggetti o le categorie di soggetti ai quali i dati personali possono essere comunicati (medici sostituti, laboratorio analisi, medici specialisti, aziende ospedaliere, case di cura private e fiscalisti, ministero Finanze, Enti pubblici quali INPS, Inail ecc.) o che possono venirne a conoscenza in qualità di incaricati;',
        'il diritto di accesso ai dati personali, la facoltà di chiederne l\'aggiornamento, la rettifica, l\'integrazione e la cancellazione e/o la limitazione nell\'utilizzo degli stessi;',
        'il nome del medico titolare del trattamento dei dati personali ed i suoi dati di contatto;',
        'la necessità di fornire dati richiesti per poter ottenere l\'erogazione di prestazioni mediche adeguate e la fruizione dei servizi sanitari secondo la attuale disciplina.'
    ];

    infoPoints.forEach(point => {
        const pointLines = wrapText(`• ${point}`, timesRomanFont, 10, width - margin * 2 - 10);
        pointLines.forEach(line => {
            if (y < margin) { page = pdfDoc.addPage(); y = height - margin; }
            y -= 12;
            page.drawText(line, { x: margin + 10, y, font: timesRomanFont, size: 10 });
        });
    });

    y -= 20;
    const signatureText = `Data e Ora Firma: ${new Date().toLocaleString('it-IT')}\nIndirizzo IP: ${patient.ipAddress || 'N/D'}`;
    page.drawText(signatureText, { x: margin, y, font: timesRomanFont, size: 9 });

    return pdfDoc.save();
}