"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, Mail, Phone, MessageSquare } from "lucide-react";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  notes: string | null;
  staffMembers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
};

type TimeSlot = {
  start: Date;
  end: Date;
};

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loading, setLoading] = useState(false);

  // Dati paziente
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Prenotazione completata
  const [bookingComplete, setBookingComplete] = useState(false);
  const [paymentLink, setPaymentLink] = useState("");

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
      setServices(data);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  const fetchAvailableSlots = async () => {
    if (!selectedService || !selectedDate || !selectedStaff) return;

    setLoading(true);
    try {
      const staffMember = selectedService.staffMembers.find(s => s.id === selectedStaff);
      const res = await fetch(
        `/api/available-slots?date=${selectedDate}&duration=${selectedService.durationMinutes}&staffEmail=${staffMember?.email}`
      );
      const data = await res.json();
      setAvailableSlots(data.map((slot: any) => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
      })));
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate && selectedService && selectedStaff) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedService, selectedStaff]);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedStaff("");
    setSelectedDate("");
    setStep(2);
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaff(staffId);
    setStep(3);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setStep(4);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedStaff || !selectedSlot) return;

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          staffId: selectedStaff,
          patientName,
          patientEmail,
          patientPhone,
          startTime: selectedSlot.start.toISOString(),
          notes,
        }),
      });

      const booking = await res.json();

      if (res.ok) {
        setPaymentLink(booking.paymentLink);
        setBookingComplete(true);
      } else {
        alert("Errore nella prenotazione: " + booking.error);
      }
    } catch (error) {
      alert("Errore nella prenotazione");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl text-green-600">
                Prenotazione Confermata!
              </CardTitle>
              <CardDescription className="text-center">
                La tua prenotazione è stata registrata con successo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <p><strong>Visita:</strong> {selectedService?.name}</p>
                <p><strong>Data:</strong> {selectedSlot?.start.toLocaleDateString("it-IT")}</p>
                <p><strong>Orario:</strong> {selectedSlot?.start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
                <p><strong>Durata:</strong> {selectedService?.durationMinutes} minuti</p>
                <p><strong>Prezzo:</strong> €{selectedService?.price}</p>
              </div>

              {selectedService?.notes && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="font-semibold mb-2">Note importanti:</p>
                  <p className="text-sm">{selectedService.notes}</p>
                </div>
              )}

              <div className="text-center space-y-4">
                <p className="text-sm text-gray-600">
                  Riceverai una conferma via email con tutti i dettagli.
                </p>
                {paymentLink && (
                  <div>
                    <p className="mb-2 font-semibold">Completa il pagamento:</p>
                    <Button asChild className="w-full">
                      <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                        Procedi al Pagamento
                      </a>
                    </Button>
                  </div>
                )}
                <Button variant="outline" onClick={() => window.location.href = "/"}>
                  Torna alla Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2">Prenota la tua Visita</h1>
          <p className="text-gray-600">Segui i passaggi per completare la prenotazione</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8 flex justify-center">
          <div className="flex items-center space-x-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    step >= s ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-12 h-1 ${
                      step > s ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Scegli la Visita</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleServiceSelect(service)}
                >
                  <CardHeader>
                    <CardTitle>{service.name}</CardTitle>
                    {service.description && (
                      <CardDescription>{service.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {service.durationMinutes} minuti
                      </p>
                      <p className="font-semibold text-lg">€{service.price}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Staff */}
        {step === 2 && selectedService && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Scegli l&apos;Operatore</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {selectedService.staffMembers.map((staff) => (
                <Card
                  key={staff.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => handleStaffSelect(staff.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {staff.name}
                    </CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Button variant="outline" onClick={() => setStep(1)} className="mt-4">
              Indietro
            </Button>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && selectedService && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Scegli Data e Orario</h2>
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="date">Seleziona Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>

                  {selectedDate && (
                    <div>
                      <Label>Orari Disponibili</Label>
                      {loading ? (
                        <p className="text-sm text-gray-600 mt-2">Caricamento...</p>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-sm text-gray-600 mt-2">
                          Nessun orario disponibile per questa data
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                          {availableSlots.map((slot, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              onClick={() => handleSlotSelect(slot)}
                              className="text-sm"
                            >
                              {slot.start.toLocaleTimeString("it-IT", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Button variant="outline" onClick={() => setStep(2)} className="mt-4">
              Indietro
            </Button>
          </div>
        )}

        {/* Step 4: Patient Info */}
        {step === 4 && selectedSlot && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">I Tuoi Dati</h2>
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={patientEmail}
                      onChange={(e) => setPatientEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Telefono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Note Aggiuntive</Label>
                    <textarea
                      id="notes"
                      className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Eventuali note o richieste particolari..."
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg space-y-1">
                    <p className="font-semibold">Riepilogo:</p>
                    <p className="text-sm">{selectedService?.name}</p>
                    <p className="text-sm">
                      {selectedSlot.start.toLocaleDateString("it-IT")} alle{" "}
                      {selectedSlot.start.toLocaleTimeString("it-IT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-sm font-semibold">€{selectedService?.price}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => setStep(3)}>
                      Indietro
                    </Button>
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading ? "Prenotazione in corso..." : "Conferma Prenotazione"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
