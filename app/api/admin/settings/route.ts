import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const settings = await db.settings.findMany();

    const settingsObj: Record<string, string> = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    return NextResponse.json(settingsObj);
  } catch (error) {
    return NextResponse.json(
      { error: "Errore nel recupero delle impostazioni" },
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
    const { key, value } = body;

    if (!key || !value) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    const setting = await db.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json(
      { error: "Errore nel salvataggio dell'impostazione" },
      { status: 500 }
    );
  }
}
