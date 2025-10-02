import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";

export default async function StaffDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "STAFF") {
    redirect("/staff/login");
  }

  const bookings = await db.booking.findMany({
    where: {
      staffId: session.user.id,
      startTime: {
        gte: new Date(),
      },
    },
    include: {
      service: true,
      patient: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard Operatore</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.name}</span>
            <Button variant="outline" asChild>
              <Link href="/api/auth/signout">Logout</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-4">Prossimi Appuntamenti</h2>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              Nessun appuntamento in programma
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <CardTitle>{booking.service.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Paziente:</strong> {booking.patient.name}</p>
                      <p><strong>Email:</strong> {booking.patient.email}</p>
                      {booking.patient.phone && <p><strong>Tel:</strong> {booking.patient.phone}</p>}
                    </div>
                    <div>
                      <p><strong>Data:</strong> {booking.startTime.toLocaleDateString("it-IT")}</p>
                      <p><strong>Orario:</strong> {booking.startTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
                      <p><strong>Durata:</strong> {booking.service.durationMinutes} min</p>
                    </div>
                  </div>
                  {booking.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                      <strong>Note:</strong> {booking.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
