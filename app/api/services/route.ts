import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAPIRateLimit, getClientIP } from "@/lib/security";

export async function GET(request: NextRequest) {
  // 🔒 Rate Limiting
  const clientIP = getClientIP(request.headers);
  if (!checkAPIRateLimit(clientIP, '/api/services')) {
    return NextResponse.json(
      { error: "Troppe richieste" },
      { status: 429 }
    );
  }
  try {
    const services = await db.service.findMany({
      where: {
        active: true,
      },
      include: {
        staffMembers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json(
      { error: "Errore nel recupero delle visite" },
      { status: 500 }
    );
  }
}
