"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, User, Mail, Phone, MessageSquare, CheckCircle2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
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

  // Consensi legali obbligatori
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [medicalConsentAccepted, setMedicalConsentAccepted] = useState(false);
  const [informedConsentAccepted, setInformedConsentAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");
      const data = await res.json();

      // Verifica che data sia un array
      if (Array.isArray(data)) {
        setServices(data);
      } else {
        console.error("API error:", data);
        setServices([]);
      }
    } catch (error) {
      console.error("Error fetching services:", error);
      setServices([]);
    }
  };

  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedService || !selectedDate || !selectedStaff) return;

    setLoading(true);
    try {
      const staffMember = selectedService.staffMembers.find(s => s.id === selectedStaff);
      // Convert Date to YYYY-MM-DD format
      const dateStr = selectedDate.toISOString().split("T")[0];
      const res = await fetch(
        `/api/available-slots?date=${dateStr}&duration=${selectedService.durationMinutes}&staffEmail=${staffMember?.email}`
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
  }, [selectedService, selectedDate, selectedStaff]);

  useEffect(() => {
    if (selectedDate && selectedService && selectedStaff) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedService, selectedStaff, fetchAvailableSlots]);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedStaff("");
    setSelectedDate(undefined);
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
          // Consensi legali con firma digitale
          privacyAccepted,
          medicalConsentAccepted,
          informedConsentAccepted,
          termsAccepted,
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

            <div className="grid md:grid-cols-2 gap-6">
              {/* Calendar Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarIcon className="w-5 h-5" />
                    Seleziona la Data
                  </CardTitle>
                  <CardDescription>
                    Scegli il giorno della tua visita
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) =>
                      date < new Date(new Date().setHours(0, 0, 0, 0)) ||
                      date > new Date(new Date().setMonth(new Date().getMonth() + 3))
                    }
                    initialFocus
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              {/* Time Slots Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Clock className="w-5 h-5" />
                    Orari Disponibili
                  </CardTitle>
                  <CardDescription>
                    {selectedDate
                      ? `${selectedDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}`
                      : "Seleziona prima una data"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedDate ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarIcon className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">
                        Seleziona una data dal calendario per vedere gli orari disponibili
                      </p>
                    </div>
                  ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                      <p className="text-sm text-gray-600">Caricamento orari...</p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Clock className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-600 font-medium mb-1">
                        Nessun orario disponibile
                      </p>
                      <p className="text-xs text-gray-500">
                        Prova a selezionare un'altra data
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => handleSlotSelect(slot)}
                          className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                              <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-gray-900">
                                {slot.start.toLocaleTimeString("it-IT", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              <p className="text-xs text-gray-500">
                                Durata: {selectedService.durationMinutes} min
                              </p>
                            </div>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Button variant="outline" onClick={() => setStep(2)} className="mt-6">
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

                  {/* CONSENSI OBBLIGATORI PER CENTRI MEDICI */}
                  <div className="border-t-2 border-gray-200 pt-6 mt-6 space-y-4">
                    <h3 className="font-semibold text-lg mb-4">
                      ⚖️ Consensi Obbligatori (richiesti per legge)
                    </h3>

                    {/* Privacy Policy GDPR */}
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="privacy"
                        checked={privacyAccepted}
                        onChange={(e) => setPrivacyAccepted(e.target.checked)}
                        required
                        className="mt-1"
                      />
                      <label htmlFor="privacy" className="text-sm">
                        <span className="font-semibold">Privacy Policy (GDPR)</span>
                        <p className="text-gray-600 mt-1">
                          Dichiaro di aver letto e accettato l'
                          <a href="/privacy" target="_blank" className="text-blue-600 hover:underline mx-1">
                            Informativa Privacy
                          </a>
                          e autorizzo il trattamento dei miei dati personali ai sensi del Regolamento UE 2016/679.
                        </p>
                      </label>
                    </div>

                    {/* Consenso Dati Sanitari (Art. 9 GDPR) */}
                    <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                      <input
                        type="checkbox"
                        id="medical"
                        checked={medicalConsentAccepted}
                        onChange={(e) => setMedicalConsentAccepted(e.target.checked)}
                        required
                        className="mt-1"
                      />
                      <label htmlFor="medical" className="text-sm">
                        <span className="font-semibold text-red-800">
                          ⚕️ Consenso al Trattamento Dati Sanitari (Art. 9 GDPR) *OBBLIGATORIO*
                        </span>
                        <p className="text-gray-700 mt-1">
                          Autorizzo espressamente il Centro Biofertility al trattamento dei miei dati relativi alla salute
                          (categorie particolari di dati personali ex art. 9 GDPR), necessario per l'erogazione delle prestazioni
                          sanitarie richieste. Tali dati saranno conservati per 10 anni come previsto dalla normativa sanitaria.
                        </p>
                      </label>
                    </div>

                    {/* Consenso Informato alla Prestazione */}
                    <div className="flex items-start gap-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                      <input
                        type="checkbox"
                        id="informed"
                        checked={informedConsentAccepted}
                        onChange={(e) => setInformedConsentAccepted(e.target.checked)}
                        required
                        className="mt-1"
                      />
                      <label htmlFor="informed" className="text-sm">
                        <span className="font-semibold text-yellow-800">
                          📋 Consenso Informato alla Prestazione Sanitaria (L. 219/2017)
                        </span>
                        <p className="text-gray-700 mt-1">
                          Dichiaro di aver letto e compreso il
                          <a href="/consenso-informato" target="_blank" className="text-blue-600 hover:underline mx-1">
                            Consenso Informato
                          </a>
                          relativo alla prestazione sanitaria che mi verrà erogata. Sono stato informato/a dei rischi, benefici
                          e alternative terapeutiche e acconsento liberamente alla prestazione.
                        </p>
                      </label>
                    </div>

                    {/* Termini e Condizioni */}
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        required
                        className="mt-1"
                      />
                      <label htmlFor="terms" className="text-sm">
                        <span className="font-semibold">Termini e Condizioni del Servizio</span>
                        <p className="text-gray-600 mt-1">
                          Dichiaro di aver letto e accettato i
                          <a href="/termini-condizioni" target="_blank" className="text-blue-600 hover:underline mx-1">
                            Termini e Condizioni
                          </a>
                          del servizio di prenotazione online, incluse le politiche di cancellazione e rimborso.
                        </p>
                      </label>
                    </div>

                    {/* Firma Digitale */}
                    <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4 mt-4">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        🔏 Firma Digitale dei Consensi
                      </p>
                      <p className="text-xs text-blue-800">
                        Cliccando su "Conferma Prenotazione", apponi la tua firma digitale ai consensi sopra indicati.
                        La firma avrà validità legale ai sensi del D.Lgs. 82/2005 (CAD - Codice dell'Amministrazione Digitale).
                        Timestamp: {new Date().toISOString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" type="button" onClick={() => setStep(3)}>
                      Indietro
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || !privacyAccepted || !medicalConsentAccepted || !informedConsentAccepted || !termsAccepted}
                      className="flex-1"
                    >
                      {loading ? "Prenotazione in corso..." : "Conferma Prenotazione e Firma Digitale"}
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
