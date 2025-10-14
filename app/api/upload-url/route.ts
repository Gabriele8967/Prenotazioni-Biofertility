import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/upload-url
 *
 * Genera una URL firmata per upload diretto a Supabase Storage.
 * Il client userà questa URL per caricare il file senza passare dal server.
 *
 * Body:
 * {
 *   "fileName": "documento-fronte.jpg",
 *   "fileType": "image/jpeg",
 *   "patientEmail": "paziente@example.com" // Per organizzare i file
 * }
 *
 * Response:
 * {
 *   "uploadUrl": "https://xxxxx.supabase.co/storage/v1/object/...",
 *   "filePath": "temp/paziente@example.com/uuid-documento-fronte.jpg"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, fileType, patientEmail } = body;

    // Validazione
    if (!fileName || !fileType || !patientEmail) {
      return NextResponse.json(
        { error: 'Parametri mancanti: fileName, fileType, patientEmail richiesti' },
        { status: 400 }
      );
    }

    // Valida tipi file consentiti
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(fileType)) {
      return NextResponse.json(
        { error: `Tipo file non consentito: ${fileType}. Consentiti: immagini (JPEG, PNG, WebP) e PDF` },
        { status: 400 }
      );
    }

    // Genera path univoco: temp/email/uuid-filename
    // "temp/" indica che è temporaneo e verrà eliminato dopo conferma/scadenza
    const fileExtension = fileName.split('.').pop();
    const uniqueFileName = `${uuidv4()}-${Date.now()}.${fileExtension}`;
    const filePath = `temp/${patientEmail}/${uniqueFileName}`;

    // Genera URL firmata per upload (valida 10 minuti)
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error('❌ Errore generazione URL firmata:', error);
      return NextResponse.json(
        { error: 'Errore creazione URL upload', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ URL firmata generata per: ${filePath}`);

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      filePath: filePath,
      token: data.token, // Token necessario per l'upload
    });
  } catch (error) {
    console.error('❌ Errore in /api/upload-url:', error);
    return NextResponse.json(
      { error: 'Errore server durante generazione URL' },
      { status: 500 }
    );
  }
}
