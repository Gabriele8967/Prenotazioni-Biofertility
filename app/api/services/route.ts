import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
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
