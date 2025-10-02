import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import {
  checkLoginRateLimit,
  getClientIP,
  isValidEmail,
  sanitizeInput,
  logSuspiciousActivity,
} from "@/lib/security";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // 🔒 Validazione email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Email non valida" },
        { status: 400 }
      );
    }

    // Sanitizza input
    const sanitizedEmail = sanitizeInput(email);

    // 🔒 Rate Limiting (Anti Brute-Force)
    const clientIP = getClientIP(request.headers);
    if (!checkLoginRateLimit(sanitizedEmail, clientIP)) {
      logSuspiciousActivity({
        ip: clientIP,
        endpoint: '/api/login',
        reason: 'Login rate limit exceeded - possibile brute-force attack',
        timestamp: new Date(),
      });
      return NextResponse.json(
        { error: "Troppi tentativi di login. Riprova tra 15 minuti." },
        { status: 429 }
      );
    }

    // Verifica credenziali
    const user = await db.user.findUnique({
      where: { email: sanitizedEmail },
    });

    if (!user || !user.password) {
      // Non rivelare se l'utente esiste o meno (security best practice)
      logSuspiciousActivity({
        ip: clientIP,
        endpoint: '/api/login',
        reason: `Failed login attempt for email: ${sanitizedEmail}`,
        timestamp: new Date(),
      });
      return NextResponse.json(
        { error: "Credenziali non valide" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logSuspiciousActivity({
        ip: clientIP,
        endpoint: '/api/login',
        reason: `Invalid password for email: ${sanitizedEmail}`,
        timestamp: new Date(),
      });
      return NextResponse.json(
        { error: "Credenziali non valide" },
        { status: 401 }
      );
    }

    // Aggiorna ultimo accesso
    await db.user.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        ipAddress: clientIP,
      },
    });

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });
  } catch (error) {
    console.error("Error during login:", error);
    return NextResponse.json(
      { error: "Errore durante il login" },
      { status: 500 }
    );
  }
}
