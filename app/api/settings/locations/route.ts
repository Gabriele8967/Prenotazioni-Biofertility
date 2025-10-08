import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const viaVelletriHours = await db.settings.findUnique({
      where: { key: 'location_via_velletri_hours' },
    });

    const vialeEroiDiRodiHours = await db.settings.findUnique({
      where: { key: 'location_viale_eroi_di_rodi_hours' },
    });

    const locations = [
      {
        id: 'via_velletri',
        name: 'Via Velletri',
        address: 'Via Velletri 7, 00198 Roma',
        hours: viaVelletriHours ? JSON.parse(viaVelletriHours.value) : {},
      },
      {
        id: 'viale_eroi_di_rodi',
        name: 'Viale degli Eroi di Rodi',
        address: 'Viale degli Eroi di Rodi 214, Roma',
        hours: vialeEroiDiRodiHours ? JSON.parse(vialeEroiDiRodiHours.value) : {},
      },
    ];

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching location settings:", error);
    return NextResponse.json(
      { error: "Errore nel recupero delle impostazioni di localizzazione" },
      { status: 500 }
    );
  }
}
