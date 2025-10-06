import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServerSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verifica che l'utente sia autenticato e sia staff
    const session = await getServerSession();

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Non autenticato' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'STAFF' && session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Solo lo staff può autenticarsi con Google' },
        { status: 403 }
      );
    }

    // Crea OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL + '/api/staff/auth/google/callback'
    );

    // Genera URL di autenticazione con scope Calendar
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Per ottenere refresh token
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      // Forza selezione account e consenso ogni volta
      prompt: 'consent select_account',
      state: session.user.id, // Passa l'ID utente nello state
      // Forza approvazione anche se già autorizzato
      include_granted_scopes: true,
    });

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    return NextResponse.json(
      { error: 'Errore durante la generazione dell\'URL di autenticazione' },
      { status: 500 }
    );
  }
}
