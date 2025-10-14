import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin, STORAGE_BUCKET } from '@/lib/supabase';

/**
 * GET /api/delete-file/cleanup
 *
 * Endpoint chiamato dal Vercel Cron Job ogni notte alle 3:00.
 * Elimina tutti i file temporanei più vecchi di 24 ore.
 *
 * Configurazione cron in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/delete-file/cleanup",
 *     "schedule": "0 3 * * *"  // Ogni notte alle 3:00 AM
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Verifica authorization header (Vercel cron invia CRON_SECRET)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // Se CRON_SECRET è configurato, verifica che corrisponda
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('⚠️  Tentativo accesso cleanup non autorizzato');
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 401 }
      );
    }

    const maxAgeHours = 24; // Elimina file più vecchi di 24 ore

    console.log(`🗑️  Avvio cleanup file temporanei (>${maxAgeHours}h)...`);

    // Lista tutti i file nella cartella temp/
    // Supabase Storage organizza i file per email, dobbiamo listarli ricorsivamente
    const { data: folders, error: listError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list('temp', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (listError) {
      console.error('❌ Errore listing cartelle:', listError);
      return NextResponse.json(
        { error: 'Errore durante listing file', details: listError.message },
        { status: 500 }
      );
    }

    if (!folders || folders.length === 0) {
      console.log('✅ Nessun file in temp/ - cleanup non necessario');
      return NextResponse.json({
        success: true,
        message: 'Nessun file da eliminare',
        deletedCount: 0,
      });
    }

    // Per ogni cartella email in temp/, lista i file
    let totalDeleted = 0;
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000; // ore → millisecondi

    for (const folder of folders) {
      // folder.name è il nome della cartella (es. "paziente@example.com")
      const folderPath = `temp/${folder.name}`;

      // Lista file dentro questa cartella
      const { data: files, error: filesError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .list(folderPath, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'asc' },
        });

      if (filesError || !files) {
        console.warn(`⚠️  Errore listing file in ${folderPath}:`, filesError);
        continue;
      }

      // Filtra file più vecchi di maxAge
      const oldFiles = files.filter((file) => {
        const fileAge = now - new Date(file.created_at).getTime();
        return fileAge > maxAge;
      });

      if (oldFiles.length === 0) continue;

      // Elimina i file vecchi
      const pathsToDelete = oldFiles.map((f) => `${folderPath}/${f.name}`);

      const { error: deleteError } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .remove(pathsToDelete);

      if (deleteError) {
        console.error(`❌ Errore eliminazione file in ${folderPath}:`, deleteError);
        continue;
      }

      console.log(`✅ Eliminati ${oldFiles.length} file da ${folderPath}`);
      totalDeleted += oldFiles.length;
    }

    console.log(`🎉 Cleanup completato: ${totalDeleted} file eliminati`);

    return NextResponse.json({
      success: true,
      deletedCount: totalDeleted,
      maxAgeHours,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Errore in cleanup automatico:', error);
    return NextResponse.json(
      {
        error: 'Errore server durante cleanup',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Supporta anche POST per test manuali
export async function POST(request: NextRequest) {
  return GET(request);
}
