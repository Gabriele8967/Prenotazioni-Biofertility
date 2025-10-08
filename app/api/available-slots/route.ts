import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/google-calendar";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get("date");
    const durationStr = searchParams.get("duration");
    const staffEmail = searchParams.get("staffEmail");
    const locationId = searchParams.get("locationId");

    if (!dateStr || !durationStr || !locationId) {
      return NextResponse.json(
        { error: "Data, durata e sede richiesti" },
        { status: 400 }
      );
    }

    const date = new Date(dateStr);
    const duration = parseInt(durationStr);

    const slots = await getAvailableSlots(
      date,
      duration,
      staffEmail || undefined,
      locationId
    );

    return NextResponse.json(slots);
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return NextResponse.json(
      { error: "Errore nel recupero degli slot disponibili" },
      { status: 500 }
    );
  }
}
