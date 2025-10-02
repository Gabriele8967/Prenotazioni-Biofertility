import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Per ora permetti tutto - il controllo auth è gestito nelle pagine
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/api/admin/:path*", "/api/staff/:path*"],
};
