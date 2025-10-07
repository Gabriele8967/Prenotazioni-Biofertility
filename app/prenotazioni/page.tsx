"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  notes: string | null;
  staffMembers: Array<{ id: string; name: string; email: string; }>;
};

type TimeSlot = { start: Date; end: Date; };

// Helper per convertire file in base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);

  // Controllo utente esistente
  const [checkingUser, setCheckingUser] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);

  // Dati paziente
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const debouncedEmail = useDebounce(patientEmail, 750);
  const [patientPhone, setPatientPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Dati GDPR completi
  const [luogoNascita, setLuogoNascita] = useState("");
  const [dataNascita, setDataNascita] = useState("");
  const [professione, setProfessione] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [citta, setCitta] = useState("");
  const [cap, setCap] = useState("");
  const [codiceFiscale, setCodiceFiscale] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [scadenzaDocumento, setScadenzaDocumento] = useState("");
  const [emailComunicazioni, setEmailComunicazioni] = useState("");

  // Dati partner (opzionale)
  const [includePartner, setIncludePartner] = useState(false);
  const [nomePartner, setNomePartner] = useState("");
  const [cognomePartner, setCognomePartner] = useState("");
  const [luogoNascitaPartner, setLuogoNascitaPartner] = useState("");
  const [dataNascitaPartner, setDataNascitaPartner] = useState("");
  const [professionePartner, setProfessionePartner] = useState("");
  const [indirizzoPartner, setIndirizzoPartner] = useState("");
  const [cittaPartner, setCittaPartner] = useState("");
  const [capPartner, setCapPartner] = useState("");
  const [codiceFiscalePartner, setCodiceFiscalePartner] = useState("");
  const [numeroDocumentoPartner, setNumeroDocumentoPartner] = useState("");
  const [scadenzaDocumentoPartner, setScadenzaDocumentoPartner] = useState("");
  const [telefonoPartner, setTelefonoPartner] = useState("");
  const [emailPartner, setEmailPartner] = useState("");

  // Documenti
  const [documentoFrente, setDocumentoFrente] = useState<File | null>(null);
  const [documentoRetro, setDocumentoRetro] = useState<File | null>(null);
  const [documentoFrentePartner, setDocumentoFrentePartner] = useState<File | null>(null);
  const [documentoRetroPartner, setDocumentoRetroPartner] = useState<File | null>(null);

  // Consensi
  const [gdprConsent, setGdprConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success')) setBookingComplete(true);
    fetchServices();
  }, []);

  // Check utente esistente quando l'email cambia (con debounce)
  useEffect(() => {
    if (debouncedEmail && /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(debouncedEmail)) {
      handleEmailCheck(debouncedEmail);
    } else {
      setUserChecked(false);
      setIsReturningUser(false);
    }
  }, [debouncedEmail]);

  const handleEmailCheck = async (email: string) => {
    setCheckingUser(true);
    try {
      const checkRes = await fetch(`/api/users/check-privacy?email=${email}`);
      const checkData = await checkRes.json();

      if (checkRes.ok && checkData.privacyComplete) {
        setIsReturningUser(true);

        // Carica i dati dell'utente
        const userRes = await fetch(`/api/users?email=${email}`);
        const userData = await userRes.json();

        if (userRes.ok) {
          setPatientName(userData.name || "");
          setPatientPhone(userData.phone || "");
          setLuogoNascita(userData.luogoNascita || "");
          setDataNascita(userData.birthDate ? userData.birthDate.split('T')[0] : "");
          setProfessione(userData.professione || "");
          setIndirizzo(userData.indirizzo || "");
          setCitta(userData.citta || "");
          setCap(userData.cap || "");
          setCodiceFiscale(userData.fiscalCode || "");
          setNumeroDocumento(userData.numeroDocumento || "");
          setScadenzaDocumento(userData.scadenzaDocumento ? userData.scadenzaDocumento.split('T')[0] : "");
          setEmailComunicazioni(userData.emailComunicazioni || "");
        }
      } else {
        setIsReturningUser(false);
      }
    } catch (error) {
      console.error("Error checking user:", error);
      setIsReturningUser(false);
    } finally {
      setCheckingUser(false);
      setUserChecked(true);
    }
  };

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/services");
      const data = await res.json();
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
      // Converti i file in base64
      const docFronteBase64 = documentoFrente ? await fileToBase64(documentoFrente) : null;
      const docRetroBase64 = documentoRetro ? await fileToBase64(documentoRetro) : null;
      const docFrontePartnerBase64 = documentoFrentePartner ? await fileToBase64(documentoFrentePartner) : null;
      const docRetroPartnerBase64 = documentoRetroPartner ? await fileToBase64(documentoRetroPartner) : null;

      // Prepara i dati del partner se incluso
      const partnerData = includePartner ? {
        nomePartner,
        cognomePartner,
        luogoNascitaPartner,
        dataNascitaPartner,
        professionePartner,
        indirizzoPartner,
        cittaPartner,
        capPartner,
        codiceFiscalePartner,
        numeroDocumentoPartner,
        scadenzaDocumentoPartner,
        telefonoPartner,
        emailPartner
      } : null;

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
          // Dati GDPR completi
          luogoNascita,
          dataNascita,
          professione,
          indirizzo,
          citta,
          cap,
          codiceFiscale,
          numeroDocumento,
          scadenzaDocumento,
          emailComunicazioni,
          // Dati partner
          partnerData: partnerData ? JSON.stringify(partnerData) : null,
          // Documenti
          documentoFrente: docFronteBase64,
          documentoRetro: docRetroBase64,
          documentoFrentePartner: docFrontePartnerBase64,
          documentoRetroPartner: docRetroPartnerBase64,
          // Consensi
          gdprConsent,
          privacyConsent,
        }),
      });

      const booking = await res.json();

      if (res.ok) {
        // Crea sessione Stripe per il pagamento
        const checkoutRes = await fetch("/api/checkout-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.id }),
        });

        const checkoutData = await checkoutRes.json();

        if (checkoutRes.ok && checkoutData.url) {
          // Redirect a Stripe
          window.location.href = checkoutData.url;
        } else {
          alert("Errore nella creazione della sessione di pagamento");
        }
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
                Pagamento Confermato!
              </CardTitle>
              <CardDescription className="text-center">
                La tua prenotazione è stata completata con successo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg space-y-2">
                <p className="text-center">✅ Riceverai a breve:</p>
                <ul className="text-sm space-y-1 ml-6 list-disc">
                  <li>Email di conferma con i dettagli della prenotazione</li>
                  <li>Fattura fiscale</li>
                  <li>Documentazione firmata</li>
                </ul>
              </div>
              <Button onClick={() => window.location.href = "/"} className="w-full">
                Torna alla Home
              </Button>
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
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"}`}>
                  {s}
                </div>
                {s < 4 && <div className={`w-12 h-1 ${step > s ? "bg-blue-600" : "bg-gray-300"}`} />}
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
                <Card key={service.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleServiceSelect(service)}>
                  <CardHeader>
                    <CardTitle>{service.name}</CardTitle>
                    {service.description && <CardDescription>{service.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2"><Clock className="w-4 h-4" />{service.durationMinutes} minuti</p>
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
                <Card key={staff.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleStaffSelect(staff.id)}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />{staff.name}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
            <Button variant="outline" onClick={() => setStep(1)} className="mt-4">Indietro</Button>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && selectedService && (
          <div>
            <h2 className="text-2xl font-semibold mb-4">Scegli Data e Orario</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><CalendarIcon className="w-5 h-5" />Seleziona la Data</CardTitle>
                  <CardDescription>Scegli il giorno della tua visita</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date > new Date(new Date().setMonth(new Date().getMonth() + 3))} initialFocus className="rounded-md border" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Clock className="w-5 h-5" />Orari Disponibili</CardTitle>
                  <CardDescription>{selectedDate ? `${selectedDate.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}` : "Seleziona prima una data"}</CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedDate ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <CalendarIcon className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">Seleziona una data dal calendario per vedere gli orari disponibili</p>
                    </div>
                  ) : loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                      <p className="text-sm text-gray-600">Caricamento orari...</p>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Clock className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-600 font-medium mb-1">Nessun orario disponibile</p>
                      <p className="text-xs text-gray-500">Prova a selezionare un'altra data</p>
                    </div>
                  ) : (
                    <div className="max-h-[400px] overflow-y-auto space-y-2">
                      {availableSlots.map((slot, index) => (
                        <button key={index} onClick={() => handleSlotSelect(slot)} className="w-full flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                              <Clock className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-gray-900">{slot.start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
                              <p className="text-xs text-gray-500">Durata: {selectedService.durationMinutes} min</p>
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
            <Button variant="outline" onClick={() => setStep(2)} className="mt-6">Indietro</Button>
          </div>
        )}

        {/* Step 4: Patient Info & Documents */}
        {step === 4 && selectedSlot && (
          <form onSubmit={handleSubmit}>
            <Card className="mb-6">
              <CardHeader><CardTitle>Step 4: Anagrafica e Consensi</CardTitle></CardHeader>
              <CardContent>
                {/* Email con check utente esistente */}
                <div className="mb-6">
                  <Label htmlFor="patientEmail">La tua Email *</Label>
                  <div className="flex items-center space-x-2">
                    <Input id="patientEmail" type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} required placeholder="Inizia a scrivere la tua email..." />
                    {checkingUser && <Loader2 className="animate-spin text-blue-600" />}
                  </div>
                </div>

                {userChecked && (
                  <div className="space-y-6 animate-in fade-in-50">
                    {isReturningUser && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">
                        ✅ Bentornato! Abbiamo pre-compilato i tuoi dati. Controllali e procedi con il caricamento dei documenti.
                      </div>
                    )}

                    {/* Dati anagrafici completi */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><Label>Nome Completo *</Label><Input value={patientName} onChange={(e) => setPatientName(e.target.value)} required /></div>
                      <div><Label>Telefono *</Label><Input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} required /></div>
                      <div><Label>Luogo di Nascita *</Label><Input value={luogoNascita} onChange={(e) => setLuogoNascita(e.target.value)} required /></div>
                      <div><Label>Data di Nascita *</Label><Input type="date" value={dataNascita} onChange={(e) => setDataNascita(e.target.value)} required /></div>
                      <div><Label>Professione</Label><Input value={professione} onChange={(e) => setProfessione(e.target.value)} /></div>
                      <div><Label>Codice Fiscale *</Label><Input value={codiceFiscale} onChange={(e) => setCodiceFiscale(e.target.value)} required /></div>
                      <div className="md:col-span-2"><Label>Indirizzo Completo *</Label><Input value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} required /></div>
                      <div><Label>Città *</Label><Input value={citta} onChange={(e) => setCitta(e.target.value)} required /></div>
                      <div><Label>CAP *</Label><Input value={cap} onChange={(e) => setCap(e.target.value)} required /></div>
                      <div><Label>Numero Documento *</Label><Input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} required /></div>
                      <div><Label>Scadenza Documento *</Label><Input type="date" value={scadenzaDocumento} onChange={(e) => setScadenzaDocumento(e.target.value)} required /></div>
                      <div className="md:col-span-2"><Label>Email per Comunicazioni</Label><Input type="email" value={emailComunicazioni} onChange={(e) => setEmailComunicazioni(e.target.value)} /></div>
                    </div>

                    {/* Upload Documenti Paziente */}
                    {!isReturningUser && (
                      <div className="border-t pt-6">
                        <h3 className="font-semibold mb-4">📄 Documenti di Identità *</h3>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="docFrente">Documento Fronte *</Label>
                            <div className="mt-2 flex items-center gap-2">
                              <Input id="docFrente" type="file" accept="image/*" onChange={(e) => setDocumentoFrente(e.target.files?.[0] || null)} required={!isReturningUser} />
                              {documentoFrente && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="docRetro">Documento Retro *</Label>
                            <div className="mt-2 flex items-center gap-2">
                              <Input id="docRetro" type="file" accept="image/*" onChange={(e) => setDocumentoRetro(e.target.files?.[0] || null)} required={!isReturningUser} />
                              {documentoRetro && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dati Partner (opzionale) */}
                    <div className="border-t pt-6">
                      <div className="flex items-center space-x-2 mb-4">
                        <input type="checkbox" id="includePartner" checked={includePartner} onChange={(e) => setIncludePartner(e.target.checked)} className="w-4 h-4" />
                        <Label htmlFor="includePartner" className="cursor-pointer">Aggiungi dati del partner</Label>
                      </div>

                      {includePartner && (
                        <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                          <h3 className="font-semibold">Dati Partner</h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div><Label>Nome Partner *</Label><Input value={nomePartner} onChange={(e) => setNomePartner(e.target.value)} required={includePartner} /></div>
                            <div><Label>Cognome Partner *</Label><Input value={cognomePartner} onChange={(e) => setCognomePartner(e.target.value)} required={includePartner} /></div>
                            <div><Label>Luogo Nascita Partner *</Label><Input value={luogoNascitaPartner} onChange={(e) => setLuogoNascitaPartner(e.target.value)} required={includePartner} /></div>
                            <div><Label>Data Nascita Partner *</Label><Input type="date" value={dataNascitaPartner} onChange={(e) => setDataNascitaPartner(e.target.value)} required={includePartner} /></div>
                            <div><Label>Professione Partner</Label><Input value={professionePartner} onChange={(e) => setProfessionePartner(e.target.value)} /></div>
                            <div><Label>Codice Fiscale Partner *</Label><Input value={codiceFiscalePartner} onChange={(e) => setCodiceFiscalePartner(e.target.value)} required={includePartner} /></div>
                            <div><Label>Telefono Partner</Label><Input value={telefonoPartner} onChange={(e) => setTelefonoPartner(e.target.value)} /></div>
                            <div><Label>Email Partner</Label><Input type="email" value={emailPartner} onChange={(e) => setEmailPartner(e.target.value)} /></div>
                            <div><Label>Numero Documento Partner *</Label><Input value={numeroDocumentoPartner} onChange={(e) => setNumeroDocumentoPartner(e.target.value)} required={includePartner} /></div>
                            <div><Label>Scadenza Doc. Partner *</Label><Input type="date" value={scadenzaDocumentoPartner} onChange={(e) => setScadenzaDocumentoPartner(e.target.value)} required={includePartner} /></div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label htmlFor="docFrontePartner">Documento Fronte Partner *</Label>
                              <Input id="docFrontePartner" type="file" accept="image/*" onChange={(e) => setDocumentoFrentePartner(e.target.files?.[0] || null)} required={includePartner} />
                            </div>
                            <div>
                              <Label htmlFor="docRetroPartner">Documento Retro Partner *</Label>
                              <Input id="docRetroPartner" type="file" accept="image/*" onChange={(e) => setDocumentoRetroPartner(e.target.files?.[0] || null)} required={includePartner} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Consensi GDPR */}
                    <div className="border-t pt-6 space-y-4">
                      <h3 className="font-semibold text-lg">⚖️ Consensi Obbligatori</h3>

                      <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                        <input type="checkbox" id="gdpr" checked={gdprConsent} onChange={(e) => setGdprConsent(e.target.checked)} required className="mt-1" />
                        <label htmlFor="gdpr" className="text-sm">
                          <span className="font-semibold text-red-800">Consenso Trattamento Dati Sanitari (Art. 9 GDPR) *</span>
                          <p className="text-gray-700 mt-1">Autorizzo espressamente il trattamento dei miei dati relativi alla salute, necessari per l&apos;erogazione delle prestazioni sanitarie.</p>
                        </label>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <input type="checkbox" id="privacy" checked={privacyConsent} onChange={(e) => setPrivacyConsent(e.target.checked)} required className="mt-1" />
                        <label htmlFor="privacy" className="text-sm">
                          <span className="font-semibold">Privacy Policy (GDPR)</span>
                          <p className="text-gray-600 mt-1">Dichiaro di aver letto l&apos;<a href="/privacy" target="_blank" className="text-blue-600 hover:underline">Informativa Privacy</a> e autorizzo il trattamento dei miei dati personali.</p>
                        </label>
                      </div>

                      <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-4">
                        <p className="text-sm font-semibold text-blue-900">🔏 Firma Digitale</p>
                        <p className="text-xs text-blue-800 mt-1">Cliccando su &quot;Procedi al Pagamento&quot;, apponi firma digitale ai consensi. Timestamp: {new Date().toISOString()}</p>
                      </div>
                    </div>

                    {/* Riepilogo */}
                    <div className="bg-blue-50 p-4 rounded-lg space-y-1">
                      <p className="font-semibold">Riepilogo Prenotazione:</p>
                      <p className="text-sm">{selectedService?.name}</p>
                      <p className="text-sm">{selectedSlot.start.toLocaleDateString("it-IT")} alle {selectedSlot.start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="text-sm font-semibold text-lg">€{selectedService?.price}</p>
                    </div>

                    {/* Note aggiuntive */}
                    <div>
                      <Label htmlFor="notes">Note Aggiuntive</Label>
                      <textarea id="notes" className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Eventuali note..." />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setStep(3)}>Indietro</Button>
              <Button type="submit" disabled={loading || !userChecked || !gdprConsent || !privacyConsent} className="flex-1">
                {loading ? <><Loader2 className="animate-spin mr-2" />Elaborazione...</> : "Procedi al Pagamento"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
