import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';

/**
 * DELETE /api/delete-file
 *
 * Elimina un file da Supabase Storage.
 * Chiamato dopo conferma prenotazione o scadenza.
 *
 * Body:
 * {
 *   "filePath": "temp/paziente@example.com/uuid-documento.jpg"
 * }
 *
 * Oppure array per eliminazione multipla:
 * {
 *   "filePaths": ["temp/.../doc1.jpg", "temp/.../doc2.jpg"]
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePath, filePaths } = body;

    // Supporta eliminazione singola o multipla
    const pathsToDelete = filePaths || (filePath ? [filePath] : []);

    if (pathsToDelete.length === 0) {
      return NextResponse.json(
        { error: 'Parametro mancante: filePath o filePaths richiesto' },
        { status: 400 }
      );
    }

    // Elimina i file da Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(pathsToDelete);

    if (error) {
      console.error('❌ Errore eliminazione file:', error);
      return NextResponse.json(
        { error: 'Errore durante eliminazione file', details: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ File eliminati (${pathsToDelete.length}):`, pathsToDelete);

    return NextResponse.json({
      success: true,
      deletedCount: pathsToDelete.length,
      files: pathsToDelete,
    });
  } catch (error) {
    console.error('❌ Errore in /api/delete-file:', error);
    return NextResponse.json(
      { error: 'Errore server durante eliminazione' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/delete-file/cleanup
 *
 * Elimina tutti i file temporanei più vecchi di X ore.
 * Da chiamare via cron job o manualmente.
 */
export async function POST(request: NextRequest) {
  try {
    const { maxAgeHours = 24 } = await request.json();

    // Lista tutti i file nella cartella temp/
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list('temp', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (listError) {
      console.error('❌ Errore listing file:', listError);
      return NextResponse.json(
        { error: 'Errore durante listing file', details: listError.message },
        { status: 500 }
      );
    }

    // Filtra file più vecchi di maxAgeHours
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // ore → millisecondi

    const oldFiles = files?.filter((file) => {
      const fileAge = now - new Date(file.created_at).getTime();
      return fileAge > maxAge;
    }) || [];

    if (oldFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nessun file da eliminare',
        deletedCount: 0,
      });
    }

    // Elimina i file vecchi
    const pathsToDelete = oldFiles.map((f) => `temp/${f.name}`);
    const { error: deleteError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(pathsToDelete);

    if (deleteError) {
      console.error('❌ Errore eliminazione file vecchi:', deleteError);
      return NextResponse.json(
        { error: 'Errore durante cleanup', details: deleteError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Cleanup completato: ${oldFiles.length} file eliminati`);

    return NextResponse.json({
      success: true,
      deletedCount: oldFiles.length,
      maxAgeHours,
    });
  } catch (error) {
    console.error('❌ Errore in /api/delete-file/cleanup:', error);
    return NextResponse.json(
      { error: 'Errore server durante cleanup' },
      { status: 500 }
    );
  }
}
