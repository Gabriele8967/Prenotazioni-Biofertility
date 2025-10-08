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
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        price: true,
        notes: true,
        active: true,
        color: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        staffMembers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Custom sort logic to prioritize specific services
    services.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      const order: { [key: string]: number } = {
        "prima visita ginecologica": 1,
        "seconda visita ginecologica": 2,
      };

      const aOrder = order[aName];
      const bOrder = order[bName];

      if (aOrder && bOrder) {
        return aOrder - bOrder;
      }
      if (aOrder) {
        return -1;
      }
      if (bOrder) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json(
      { error: "Errore nel recupero delle visite" },
      { status: 500 }
    );
  }
}
