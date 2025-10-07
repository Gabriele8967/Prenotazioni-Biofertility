import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const services = await db.service.findMany({
      include: {
        staffMembers: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(services);
  } catch (error) {
    return NextResponse.json(
      { error: "Errore nel recupero dei servizi" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, durationMinutes, price, notes, color, staffIds } = body;

    if (!name || !durationMinutes || price === undefined) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    const service = await db.service.create({
      data: {
        name,
        description,
        durationMinutes: parseInt(durationMinutes),
        price: parseFloat(price),
        notes,
        color: color || "#3b82f6",
        active: true,
        staffMembers: staffIds
          ? {
              connect: staffIds.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        staffMembers: true,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json(
      { error: "Errore nella creazione del servizio" },
      { status: 500 }
    );
  }
}
