/**
 * Helper per upload diretto di file a Supabase Storage
 * senza passare dal server Vercel (evita limiti body size)
 */

export type UploadResult = {
  success: boolean;
  filePath?: string;
  publicUrl?: string;
  error?: string;
};

/**
 * Upload di un file direttamente a Supabase Storage
 *
 * @param file - File da uploadare
 * @param patientEmail - Email paziente (per organizzare i file)
 * @returns Promise con risultato upload
 */
export async function uploadFileToSupabase(
  file: File,
  patientEmail: string
): Promise<UploadResult> {
  try {
    console.log(`📤 Inizio upload: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // 1. Richiedi URL firmata al server
    const urlResponse = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        patientEmail,
      }),
    });

    if (!urlResponse.ok) {
      const error = await urlResponse.json();
      throw new Error(error.error || 'Errore generazione URL upload');
    }

    const { uploadUrl, filePath, token } = await urlResponse.json();

    // 2. Upload diretto a Supabase (NON passa da Vercel!)
    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
        'x-upsert': 'true', // Sovrascrivi se esiste già
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Errore upload file: ${errorText}`);
    }

    console.log(`✅ Upload completato: ${filePath}`);

    // 3. Genera URL pubblica per accesso (valida 1 ora)
    // Nota: questa URL sarà usata per scaricare il file quando serve
    const publicUrlResponse = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/authenticated/patient-documents/${filePath}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return {
      success: true,
      filePath,
      publicUrl: publicUrlResponse.url,
    };
  } catch (error) {
    console.error('❌ Errore upload:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Errore sconosciuto durante upload',
    };
  }
}

/**
 * Upload multiplo di file (parallelo)
 *
 * @param files - Array di oggetti { file: File, label: string }
 * @param patientEmail - Email paziente
 * @returns Promise con risultati di tutti gli upload
 */
export async function uploadMultipleFiles(
  files: Array<{ file: File | null; label: string }>,
  patientEmail: string
): Promise<Record<string, UploadResult>> {
  const results: Record<string, UploadResult> = {};

  // Upload in parallelo
  const uploadPromises = files
    .filter((item) => item.file !== null)
    .map(async (item) => {
      const result = await uploadFileToSupabase(item.file!, patientEmail);
      results[item.label] = result;
    });

  await Promise.all(uploadPromises);

  return results;
}

/**
 * Elimina file da Supabase Storage
 *
 * @param filePath - Path del file da eliminare
 * @returns Promise con esito eliminazione
 */
export async function deleteFileFromSupabase(filePath: string): Promise<boolean> {
  try {
    const response = await fetch('/api/delete-file', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore eliminazione file');
    }

    console.log(`✅ File eliminato: ${filePath}`);
    return true;
  } catch (error) {
    console.error('❌ Errore eliminazione:', error);
    return false;
  }
}

/**
 * Elimina multipli file (utile dopo conferma prenotazione)
 *
 * @param filePaths - Array di path da eliminare
 * @returns Promise con esito eliminazione
 */
export async function deleteMultipleFiles(filePaths: string[]): Promise<boolean> {
  try {
    const response = await fetch('/api/delete-file', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePaths }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore eliminazione file');
    }

    console.log(`✅ ${filePaths.length} file eliminati`);
    return true;
  } catch (error) {
    console.error('❌ Errore eliminazione multipla:', error);
    return false;
  }
}
