import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, durationMinutes, price, notes, color, staffIds, active } = body;

    const service = await db.service.update({
      where: { id },
      data: {
        name,
        description,
        durationMinutes: durationMinutes ? parseInt(durationMinutes) : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        notes,
        color,
        active,
        staffMembers: staffIds
          ? {
              set: staffIds.map((id: string) => ({ id })),
            }
          : undefined,
      },
      include: {
        staffMembers: true,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Errore nell'aggiornamento del servizio" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getServerSession();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    await db.service.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Errore nell'eliminazione del servizio" },
      { status: 500 }
    );
  }
}
