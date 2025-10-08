import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Definisci la chiave segreta per la verifica del JWT da una variabile d'ambiente
const JWT_SECRET = process.env.WORDPRESS_JWT_SECRET
  ? new TextEncoder().encode(process.env.WORDPRESS_JWT_SECRET)
  : null;

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Gestisci il token SSO solo sulla pagina di prenotazione e solo se la chiave è configurata
  if (pathname.startsWith('/prenotazioni') && JWT_SECRET) {
    const token = searchParams.get('sso_token');

    if (token) {
      try {
        // Verifica il token ma non fare nulla che possa influenzare i dati del form
        await jwtVerify(token, JWT_SECRET);

        // Pulisci l'URL dal token per non lasciarlo in vista, ma non aggiungere altri parametri
        const url = request.nextUrl.clone();
        url.searchParams.delete('sso_token');
        return NextResponse.redirect(url);

      } catch (error) {
        console.error("SSO Token validation error:", error);
        // Se il token non è valido, puliscilo dall'URL e reindirizza
        const url = request.nextUrl.clone();
        url.searchParams.delete('sso_token');
        return NextResponse.redirect(url);
      }
    }
  }

  // Per tutte le altre rotte o se non c'è token, procedi normalmente
  return NextResponse.next();
}

export const config = {
  // Esegui il middleware solo sulla pagina di prenotazione
  matcher: '/prenotazioni',
};