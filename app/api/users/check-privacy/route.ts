import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: "Email mancante" }, { status: 400 });
  }

  try {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Se l'utente non esiste, non ha compilato la privacy
      return NextResponse.json({ privacyComplete: false, isUserFound: false });
    }

    // Controlla che i campi chiave della privacy siano compilati
    const isComplete =
        !!user.luogoNascita &&
        !!user.birthDate &&
        !!user.professione &&
        !!user.indirizzo &&
        !!user.citta &&
        !!user.cap &&
        !!user.fiscalCode &&
        !!user.numeroDocumento &&
        !!user.scadenzaDocumento;

    return NextResponse.json({ privacyComplete: isComplete, isUserFound: true, patientName: user.name });

  } catch (error) {
    console.error("Errore nel controllo della privacy dell'utente:", error);
    return NextResponse.json({ error: "Errore del server" }, { status: 500 });
  }
}
