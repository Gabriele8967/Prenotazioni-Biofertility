import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // User ID
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        new URL(`/staff/dashboard?error=${error}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/staff/dashboard?error=missing_params', request.url)
      );
    }

    // Costruisci redirect URI dinamicamente dal request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const redirectUri = `${protocol}://${host}/api/staff/auth/google/callback`;

    // Crea OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    // Scambia il code per i token
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        new URL('/staff/dashboard?error=token_missing', request.url)
      );
    }

    // Salva i token nel database
    await db.user.update({
      where: { id: state },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token,
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      },
    });

    // Verifica ruolo utente per redirect corretto
    const user = await db.user.findUnique({
      where: { id: state },
      select: { role: true },
    });

    const dashboardUrl = user?.role === 'ADMIN'
      ? '/admin/dashboard?google_auth=success'
      : '/staff/dashboard?google_auth=success';

    // Redirect alla dashboard con successo
    return NextResponse.redirect(
      new URL(dashboardUrl, request.url)
    );
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(
      new URL('/staff/dashboard?error=auth_failed', request.url)
    );
  }
}
