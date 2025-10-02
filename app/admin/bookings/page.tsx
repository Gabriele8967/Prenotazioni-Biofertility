"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    const res = await fetch("/api/bookings");
    const data = await res.json();
    setBookings(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING":
        return "In Attesa";
      case "CONFIRMED":
        return "Confermata";
      case "CANCELLED":
        return "Cancellata";
      case "COMPLETED":
        return "Completata";
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Prenotazioni</h1>
          <Link href="/admin/dashboard">
            <Button variant="outline">← Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-4">
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                Nessuna prenotazione trovata
              </CardContent>
            </Card>
          ) : (
            bookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-start">
                    <span>{booking.service.name}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(booking.status)}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Paziente:</strong> {booking.patient.name}</p>
                      <p><strong>Email:</strong> {booking.patient.email}</p>
                      {booking.patient.phone && <p><strong>Tel:</strong> {booking.patient.phone}</p>}
                    </div>
                    <div>
                      <p><strong>Operatore:</strong> {booking.staff.name}</p>
                      <p><strong>Data:</strong> {new Date(booking.startTime).toLocaleDateString("it-IT")}</p>
                      <p><strong>Orario:</strong> {new Date(booking.startTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
                      <p><strong>Prezzo:</strong> €{booking.service.price}</p>
                      <p>
                        <strong>Pagamento:</strong>{" "}
                        <span className={booking.paymentCompleted ? "text-green-600" : "text-red-600"}>
                          {booking.paymentCompleted ? "Completato" : "In attesa"}
                        </span>
                      </p>
                    </div>
                  </div>
                  {booking.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                      <strong>Note:</strong> {booking.notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
