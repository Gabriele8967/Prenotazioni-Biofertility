"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, UploadCloud, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";

// --- TYPES ---
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

// --- HELPERS ---
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

// --- COMPONENT ---
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

  const [checkingUser, setCheckingUser] = useState(false);
  const [userChecked, setUserChecked] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);

  // Form state
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const debouncedEmail = useDebounce(patientEmail, 750);
  // ... (rest of the state variables)
  const [patientPhone, setPatientPhone] = useState("");
  const [notes, setNotes] = useState("");
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
  const [documentoFrente, setDocumentoFrente] = useState<File | null>(null);
  const [documentoRetro, setDocumentoRetro] = useState<File | null>(null);
  const [documentoFrentePartner, setDocumentoFrentePartner] = useState<File | null>(null);
  const [documentoRetroPartner, setDocumentoRetroPartner] = useState<File | null>(null);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success')) setBookingComplete(true);
    fetchServices();
  }, []);

  // Effect for debounced email check
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
    } catch (error) { console.error("Error checking user:", error); setIsReturningUser(false); }
    finally { setCheckingUser(false); setUserChecked(true); }
  };

  const fetchServices = async () => { /* ... */ };
  const fetchAvailableSlots = useCallback(async () => { /* ... */ }, [selectedService, selectedDate, selectedStaff]);
  useEffect(() => { /* ... */ }, [selectedDate, selectedService, selectedStaff, fetchAvailableSlots]);
  const handleSubmit = async (e: React.FormEvent) => { /* ... */ };
  const handleServiceSelect = (service: Service) => { setStep(2); setSelectedService(service); };
  const handleStaffSelect = (staffId: string) => { setStep(3); setSelectedStaff(staffId); };
  const handleSlotSelect = (slot: TimeSlot) => { setStep(4); setSelectedSlot(slot); };

  if (bookingComplete) { /* ... success screen ... */ }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* ... header & progress ... */}
        {step === 1 && (<div>...</div>)}
        {step === 2 && (<div>...</div>)}
        {step === 3 && (<div>...</div>)}
        {step === 4 && selectedSlot && (
          <form onSubmit={handleSubmit}>
            <Card className="mb-6">
              <CardHeader><CardTitle>Step 4: Anagrafica e Consensi</CardTitle></CardHeader>
              <CardContent>
                <div className="form-group mb-6">
                  <Label htmlFor="patientEmail">La tua Email *</Label>
                  <div className="flex items-center space-x-2">
                    <Input id="patientEmail" type="email" value={patientEmail} onChange={(e) => setPatientEmail(e.target.value)} required placeholder="Inizia a scrivere la tua email..." />
                    {checkingUser && <Loader2 className="animate-spin text-blue-600" />}
                  </div>
                </div>
                {userChecked && (
                  <div className="space-y-6 animate-in fade-in-50">
                    {isReturningUser && <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-800">Bentornato! Abbiamo pre-compilato i tuoi dati. Controllali e procedi con il caricamento dei documenti.</div>}
                    {/* The rest of the form fields... */}
                  </div>
                )}
              </CardContent>
            </Card>
            {/* The rest of the form cards... */}
          </form>
        )}
      </div>
    </div>
  );
}