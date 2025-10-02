import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const staff = await db.user.findMany({
      where: {
        role: "STAFF",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        services: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            bookingsAsStaff: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(staff);
  } catch (error) {
    return NextResponse.json(
      { error: "Errore nel recupero dello staff" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Utente già esistente" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staff = await db.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        role: "STAFF",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json(
      { error: "Errore nella creazione dello staff" },
      { status: 500 }
    );
  }
}
