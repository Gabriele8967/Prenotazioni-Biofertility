"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, User, CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  notes: string | null;
  staffMembers: Array<{ id: string; name: string; email: string; }>;
  category: string | null;
};

type Location = {
  id: string;
  name: string;
  address: string;
  hours: Record<string, string[]>;
};

type TimeSlot = { start: Date; end: Date; };

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FiscalCodeInput } from "@/components/FiscalCodeInput";

import imageCompression from 'browser-image-compression';
import { uploadMultipleFiles } from '@/lib/uploadToSupabase';

// Helper per convertire file in base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Funzione per la compressione delle immagini
const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1, // Dimensione massima in MB
    maxWidthOrHeight: 1920, // Risoluzione massima
    useWebWorker: true,
  };

  try {
    console.log(`Compressione immagine... Originale: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    const compressedFile = await imageCompression(file, options);
    console.log(`Immagine compressa! Nuovo: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`);
    return compressedFile;
  } catch (error) {
    console.error("Errore durante la compressione dell'immagine:", error);
    return file; // Ritorna il file originale in caso di errore
  }
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
  console.log('BookingPage rendered');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [datesWithSlots, setDatesWithSlots] = useState<Date[]>([]);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const groupedServices = services.reduce((acc, service) => {
    const category = service.category || 'Altro'; // Default category if none is provided
    if (category === 'Analisi') return acc; // Exclude 'Analisi' category
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, Service[]>);

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
  const [provincia, setProvincia] = useState("");
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
  const [fileError, setFileError] = useState<string>("");

  // Dimensione massima file: 10MB (upload diretto a Supabase, non passa più da Vercel!)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  // Funzione per validare dimensione file
  const validateFileSize = (file: File | null, fieldName: string): boolean => {
    if (!file) return true; // Se non c'è file, ok

    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setFileError(`❌ ${fieldName}: Il file è troppo grande (${sizeMB}MB). Dimensione massima consentita: 2MB`);
      return false;
    }

    setFileError(""); // Reset errore se tutto ok
    return true;
  };

  // Handler per documento fronte paziente
  const handleDocumentoFronte = async (file: File | null) => {
    if (!file) return;
    const compressedFile = await compressImage(file);
    if (validateFileSize(compressedFile, "Documento Fronte")) {
      setDocumentoFrente(compressedFile);
    }
  };

  // Handler per documento retro paziente
  const handleDocumentoRetro = async (file: File | null) => {
    if (!file) return;
    const compressedFile = await compressImage(file);
    if (validateFileSize(compressedFile, "Documento Retro")) {
      setDocumentoRetro(compressedFile);
    }
  };

  // Handler per documento fronte partner
  const handleDocumentoFrentePartner = async (file: File | null) => {
    if (!file) return;
    const compressedFile = await compressImage(file);
    if (validateFileSize(compressedFile, "Documento Fronte Partner")) {
      setDocumentoFrentePartner(compressedFile);
    }
  };

  // Handler per documento retro partner
  const handleDocumentoRetroPartner = async (file: File | null) => {
    if (!file) return;
    const compressedFile = await compressImage(file);
    if (validateFileSize(compressedFile, "Documento Retro Partner")) {
      setDocumentoRetroPartner(compressedFile);
    }
  };

  // Consensi
  const [gdprConsent, setGdprConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_success')) setBookingComplete(true);
    fetchServices();
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/settings/locations");
      const data = await res.json();
      if (Array.isArray(data)) {
        setLocations(data);
        if (data.length > 0) {
          setSelectedLocation(data[0]); // Select first location by default
        }
      } else {
        console.error("API error fetching locations:", data);
        setLocations([]);
      }
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    }
  };

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
          setProvincia(userData.provincia || "");
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
    if (!selectedService || !selectedDate || !selectedStaff || !selectedLocation) return;

    console.log('selectedService in fetchAvailableSlots', selectedService);
    console.log('selectedStaff in fetchAvailableSlots', selectedStaff);

    setLoading(true);
    try {
      const staffMember = selectedService.staffMembers.find(s => s.id === selectedStaff);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const res = await fetch(
        `/api/available-slots?date=${dateStr}&duration=${selectedService.durationMinutes}&staffEmail=${staffMember?.email}&locationId=${selectedLocation.id}`
      );
      const data = await res.json();
      console.log('data from api', data);
      setAvailableSlots(data.map((slot: any) => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
      })));
    } catch (error) {
      console.error("Error fetching slots:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedService, selectedDate, selectedStaff, selectedLocation]);

  // Funzione per trovare i prossimi giorni con disponibilità
  const findDatesWithAvailability = useCallback(async () => {
    if (!selectedService || !selectedStaff || !selectedLocation) return;

    setCheckingAvailability(true);
    const datesFound: Date[] = [];
    const staffMember = selectedService.staffMembers.find(s => s.id === selectedStaff);
    
    // Controlla i prossimi 60 giorni
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 60 && datesFound.length < 10; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      
      // Salta se non è un giorno lavorativo per la sede
      if (selectedLocation.id === 'viale_eroi_di_rodi' && checkDate.getDay() !== 3) {
        continue;
      }
      
      try {
        const dateStr = format(checkDate, 'yyyy-MM-dd');
        const res = await fetch(
          `/api/available-slots?date=${dateStr}&duration=${selectedService.durationMinutes}&staffEmail=${staffMember?.email}&locationId=${selectedLocation.id}`
        );
        const data = await res.json();
        
        if (data.length > 0) {
          datesFound.push(checkDate);
        }
      } catch (error) {
        console.error("Error checking availability:", error);
      }
    }
    
    setDatesWithSlots(datesFound);
    setCheckingAvailability(false);
  }, [selectedService, selectedStaff, selectedLocation]);

  useEffect(() => {
    if (selectedDate && selectedService && selectedStaff && selectedLocation) {
      fetchAvailableSlots();
    }
  }, [selectedDate, selectedService, selectedStaff, selectedLocation, fetchAvailableSlots]);

  useEffect(() => {
    console.log('availableSlots updated', availableSlots);
  }, [availableSlots]);

  const handleServiceSelect = (service: Service) => {
    console.log('selectedService', service);
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

    // Validazione dimensione file (max 5MB per file)
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const checkFileSize = (file: File | null, name: string) => {
      if (file && file.size > MAX_FILE_SIZE) {
        alert(`Il file "${name}" è troppo grande (${(file.size / 1024 / 1024).toFixed(2)}MB). Max 5MB per file.`);
        return false;
      }
      return true;
    };

    if (!checkFileSize(documentoFrente, "Documento Fronte")) return;
    if (!checkFileSize(documentoRetro, "Documento Retro")) return;
    if (!checkFileSize(documentoFrentePartner, "Documento Fronte Partner")) return;
    if (!checkFileSize(documentoRetroPartner, "Documento Retro Partner")) return;

    setLoading(true);
    try {
      let booking: any; // Dichiarazione di booking

      // Upload documenti direttamente a Supabase (senza passare dal server Vercel)
      console.log("📤 Upload documenti a Supabase...");
      const uploadResults = await uploadMultipleFiles(
        [
          { file: documentoFrente, label: 'documentoFrente' },
          { file: documentoRetro, label: 'documentoRetro' },
          { file: documentoFrentePartner, label: 'documentoFrentePartner' },
          { file: documentoRetroPartner, label: 'documentoRetroPartner' },
        ],
        patientEmail
      );

      // Controlla errori upload
      const failedUploads = Object.entries(uploadResults).filter(([_, result]) => !result.success);
      if (failedUploads.length > 0) {
        const errors = failedUploads.map(([label, result]) => `${label}: ${result.error}`).join('\n');
        throw new Error(`Errore upload documenti:\n${errors}`);
      }

      // Estrai i path dei file uploadati (da salvare nel DB invece di base64)
      const docFrontePath = uploadResults.documentoFrente?.filePath || null;
      const docRetroPath = uploadResults.documentoRetro?.filePath || null;
      const docFrontePartnerPath = uploadResults.documentoFrentePartner?.filePath || null;
      const docRetroPartnerPath = uploadResults.documentoRetroPartner?.filePath || null;

      console.log("✅ Upload completato:", { docFrontePath, docRetroPath });

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

      console.log("📤 Invio prenotazione al server...");
      console.log("📋 Dati:", {
        serviceId: selectedService.id,
        staffId: selectedStaff,
        patientEmail,
        hasDocFrente: !!docFrontePath,
        hasDocRetro: !!docRetroPath,
        includePartner
      });

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
          provincia,
          cap,
          codiceFiscale,
          numeroDocumento,
          scadenzaDocumento,
          emailComunicazioni,
          // Dati partner
          partnerData: partnerData ? JSON.stringify(partnerData) : null,
          // Documenti (ora salviamo solo i path, non base64!)
          documentoFrente: docFrontePath,
          documentoRetro: docRetroPath,
          documentoFrentePartner: docFrontePartnerPath,
          documentoRetroPartner: docRetroPartnerPath,
          // Consensi
          gdprConsent,
          privacyConsent,
        }),
      });

      if (res.ok) {
        try {
          booking = await res.json();
        } catch (parseError) {
          console.error("❌ Errore parsing JSON:", parseError);
          throw new Error("Errore nel processare la risposta del server. Riprova o contatta l'assistenza.");
        }

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
          console.error("❌ Errore checkout:", checkoutData);
          alert("Errore nella creazione della sessione di pagamento: " + (checkoutData.error || 'Errore sconosciuto'));
        }
      } else {
        // Se la risposta non è ok, prova a leggere il JSON per un errore strutturato
        try {
          const errorData = await res.json();
          console.error("❌ Errore prenotazione (server):", errorData);
          // Mostra errore dettagliato dal server
          let errorMessage = "Errore nella prenotazione:\n\n";
          if (errorData.error) errorMessage += errorData.error;
          if (errorData.missingFields) errorMessage += `\nCampi mancanti: ${errorData.missingFields.join(', ')}`;
          if (errorData.details) errorMessage += `\nDettagli: ${Array.isArray(errorData.details) ? errorData.details.join(', ') : errorData.details}`;
          alert(errorMessage);
        } catch (e) {
          // Se il JSON non può essere parsato, mostra un errore generico
          const errorText = await res.text();
          console.error("❌ Errore server (risposta non-JSON):", errorText.substring(0, 500));
          alert(`Si è verificato un errore sul server (codice: ${res.status}). Questo può accadere se i file caricati sono troppo grandi. Riprova con file più piccoli o contatta l'assistenza.`);
        }
      }
    } catch (error) {
      console.error("❌ Errore critico durante prenotazione:", error);
      console.error("Stack trace:", error instanceof Error ? error.stack : 'N/D');

      let errorMsg = "Si è verificato un errore durante la prenotazione.\n\n";
      if (error instanceof Error) {
        errorMsg += "Dettagli: " + error.message;
      } else {
        errorMsg += "Errore sconosciuto.";
      }
      errorMsg += "\n\nSe il problema persiste, contatta l'assistenza:\n📞 06-8415269\n📧 info@biofertility.it";

      alert(errorMsg);
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
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Prenota la tua Visita</h1>
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
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Scegli la Visita</h2>
            <Tabs defaultValue="Prestazioni Biofertility" className="w-full">
              <TabsList className="flex flex-wrap gap-2 h-auto bg-transparent justify-center mb-6">
                {Object.keys(groupedServices).sort((a, b) => {
                  // "Prestazioni Biofertility" sempre per prima
                  if (a === "Prestazioni Biofertility") return -1;
                  if (b === "Prestazioni Biofertility") return 1;
                  return a.localeCompare(b);
                }).map((category) => (
                  <TabsTrigger 
                    key={category} 
                    value={category} 
                    className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border-2 border-gray-200 rounded-full data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-600 data-[state=active]:shadow-md hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 whitespace-nowrap"
                  >
                    {category}
                  </TabsTrigger>
                ))}
              </TabsList>
              {Object.entries(groupedServices).map(([category, servicesInCategory]) => {
                // Ordina i servizi: Prima visita ginecologica, poi Seconda visita ginecologica, poi gli altri
                const sortedServices = [...servicesInCategory].sort((a, b) => {
                  const isPrimaA = a.name.toLowerCase().includes('prima visita ginecologica');
                  const isPrimaB = b.name.toLowerCase().includes('prima visita ginecologica');
                  const isSecondaA = a.name.toLowerCase().includes('seconda visita ginecologica');
                  const isSecondaB = b.name.toLowerCase().includes('seconda visita ginecologica');
                  
                  if (isPrimaA) return -1;
                  if (isPrimaB) return 1;
                  if (isSecondaA) return -1;
                  if (isSecondaB) return 1;
                  return 0;
                });

                return (
                  <TabsContent key={category} value={category} className="mt-0">
                    <div className="mb-4 text-center">
                      <h3 className="text-lg font-semibold text-gray-800">{category}</h3>
                      <p className="text-sm text-gray-500 mt-1">{servicesInCategory.length} {servicesInCategory.length === 1 ? 'servizio disponibile' : 'servizi disponibili'}</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {sortedServices.map((service) => (
                        <Card key={service.id} className="cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all duration-200 border-2" onClick={() => handleServiceSelect(service)}>
                          <CardHeader>
                            <CardTitle className="text-lg">{service.name}</CardTitle>
                            {service.description && <CardDescription>{service.description}</CardDescription>}
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <p className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4 text-blue-600" />
                                {service.durationMinutes} minuti
                              </p>
                              <p className="font-bold text-xl text-blue-600">€{service.price.toFixed(2)}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        )}

        {/* Step 2: Select Staff and Location */}
        {step === 2 && selectedService && (
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Scegli la Sede e l&apos;Operatore</h2>

            {/* Location Selection */}
            <div className="mb-6">
              <Label htmlFor="location-select" className="block text-lg font-medium text-gray-700 mb-2">Seleziona la Sede</Label>
              <select
                id="location-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                value={selectedLocation?.id || ''}
                onChange={(e) => {
                  const loc = locations.find(l => l.id === e.target.value);
                  setSelectedLocation(loc || null);
                  setSelectedStaff(""); // Reset staff selection when location changes
                }}
              >
                <option value="" disabled>Seleziona una sede</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} - {loc.address}
                  </option>
                ))}
              </select>
            </div>

            {/* Staff Selection */}
            {selectedLocation && (
              <div className="mt-8">
                <h3 className="text-xl font-semibold mb-4">Scegli l&apos;Operatore</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {selectedService.staffMembers.map((staff) => (
                    <Card key={staff.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleStaffSelect(staff.id)}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />{staff.name}</CardTitle>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" onClick={() => setStep(1)} className="mt-4">Indietro</Button>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && selectedService && (
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold mb-4">Scegli Data e Orario</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><CalendarIcon className="w-5 h-5" />Seleziona la Data</CardTitle>
                  <CardDescription>Scegli il giorno della tua visita (puoi cambiare mese)</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Calendar 
                    mode="single" 
                    selected={selectedDate} 
                    onSelect={(date) => {
                      console.log('onSelect date', date);
                      setSelectedDate(date);
                    }} 
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0)) || date > new Date(new Date().setMonth(new Date().getMonth() + 3)) || (selectedLocation?.id === 'viale_eroi_di_rodi' && date.getDay() !== 3)} 
                    initialFocus 
                    className="rounded-md border"
                    fromDate={new Date()}
                    toDate={new Date(new Date().setMonth(new Date().getMonth() + 3))}
                  />
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
                      <p className="text-sm text-gray-600 font-medium mb-2">Nessun orario disponibile</p>
                      <p className="text-xs text-gray-500 mb-4">Prova a selezionare un'altra data</p>
                      
                      {!checkingAvailability && datesWithSlots.length === 0 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={findDatesWithAvailability}
                          className="mt-2"
                        >
                          🔍 Trova prossimi giorni disponibili
                        </Button>
                      )}
                      
                      {checkingAvailability && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          Ricerca in corso...
                        </div>
                      )}
                      
                      {datesWithSlots.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg w-full">
                          <p className="text-sm font-semibold text-blue-900 mb-3">📅 Prossimi giorni disponibili:</p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            {datesWithSlots.map((date, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSelectedDate(date);
                                  setDatesWithSlots([]);
                                }}
                                className="px-3 py-2 bg-white border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-100 transition-colors text-sm font-medium text-blue-900"
                              >
                                {date.toLocaleDateString("it-IT", { weekday: 'short', day: 'numeric', month: 'short' })}
                              </button>
                            ))}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setDatesWithSlots([])}
                            className="mt-3 text-xs"
                          >
                            Nascondi
                          </Button>
                        </div>
                      )}
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
                      <div><Label>Professione *</Label><Input value={professione} onChange={(e) => setProfessione(e.target.value)} required /></div>
                      <div className="md:col-span-2">
                        <FiscalCodeInput
                          value={codiceFiscale}
                          onChange={setCodiceFiscale}
                          birthDate={dataNascita}
                          required
                        />
                      </div>
                      <div className="md:col-span-2"><Label>Indirizzo Completo *</Label><Input value={indirizzo} onChange={(e) => setIndirizzo(e.target.value)} required /></div>
                      <div><Label>Città *</Label><Input value={citta} onChange={(e) => setCitta(e.target.value)} required /></div>
                      <div><Label>Provincia *</Label><Input value={provincia} onChange={(e) => setProvincia(e.target.value.toUpperCase())} maxLength={2} placeholder="RM" required /></div>
                      <div><Label>CAP *</Label><Input value={cap} onChange={(e) => setCap(e.target.value)} required /></div>
                      <div><Label>Numero Documento *</Label><Input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} required /></div>
                      <div><Label>Scadenza Documento *</Label><Input type="date" value={scadenzaDocumento} onChange={(e) => setScadenzaDocumento(e.target.value)} required /></div>
                      <div className="md:col-span-2"><Label>Email per Comunicazioni</Label><Input type="email" value={emailComunicazioni} onChange={(e) => setEmailComunicazioni(e.target.value)} /></div>
                    </div>

                    {/* Upload Documenti Paziente */}
                    {!isReturningUser && (
                      <div className="border-t pt-6">
                        <h3 className="font-semibold mb-4">📄 Documenti di Identità *</h3>

                        {fileError && (
                          <div className="mb-4 p-3 bg-red-50 border border-red-300 rounded-md text-sm text-red-800">
                            {fileError}
                          </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="docFrente">Documento Fronte * (max 10MB)</Label>
                            <div className="mt-2 flex items-center gap-2">
                              <Input
                                id="docFrente"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleDocumentoFronte(e.target.files?.[0] || null)}
                                required={!isReturningUser}
                              />
                              {documentoFrente && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                            </div>
                            {documentoFrente && (
                              <p className="text-xs text-gray-500 mt-1">
                                {(documentoFrente.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="docRetro">Documento Retro * (max 10MB)</Label>
                            <div className="mt-2 flex items-center gap-2">
                              <Input
                                id="docRetro"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleDocumentoRetro(e.target.files?.[0] || null)}
                                required={!isReturningUser}
                              />
                              {documentoRetro && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                            </div>
                            {documentoRetro && (
                              <p className="text-xs text-gray-500 mt-1">
                                {(documentoRetro.size / (1024 * 1024)).toFixed(2)} MB
                              </p>
                            )}
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
                            <div><Label>Professione Partner *</Label><Input value={professionePartner} onChange={(e) => setProfessionePartner(e.target.value)} required={includePartner} /></div>
                            <div className="md:col-span-2">
                              <FiscalCodeInput
                                value={codiceFiscalePartner}
                                onChange={setCodiceFiscalePartner}
                                birthDate={dataNascitaPartner}
                                required={includePartner}
                                label="Codice Fiscale Partner"
                              />
                            </div>
                            <div><Label>Telefono Partner</Label><Input value={telefonoPartner} onChange={(e) => setTelefonoPartner(e.target.value)} /></div>
                            <div><Label>Email Partner</Label><Input type="email" value={emailPartner} onChange={(e) => setEmailPartner(e.target.value)} /></div>
                            <div><Label>Numero Documento Partner *</Label><Input value={numeroDocumentoPartner} onChange={(e) => setNumeroDocumentoPartner(e.target.value)} required={includePartner} /></div>
                            <div><Label>Scadenza Doc. Partner *</Label><Input type="date" value={scadenzaDocumentoPartner} onChange={(e) => setScadenzaDocumentoPartner(e.target.value)} required={includePartner} /></div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label htmlFor="docFrontePartner">Documento Fronte Partner * (max 10MB)</Label>
                              <Input
                                id="docFrontePartner"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleDocumentoFrentePartner(e.target.files?.[0] || null)}
                                required={includePartner}
                              />
                              {documentoFrentePartner && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {(documentoFrentePartner.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="docRetroPartner">Documento Retro Partner * (max 10MB)</Label>
                              <Input
                                id="docRetroPartner"
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleDocumentoRetroPartner(e.target.files?.[0] || null)}
                                required={includePartner}
                              />
                              {documentoRetroPartner && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {(documentoRetroPartner.size / (1024 * 1024)).toFixed(2)} MB
                                </p>
                              )}
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
                    <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                      <p className="font-semibold text-lg border-b border-blue-200 pb-2">Riepilogo Prenotazione</p>
                      <p className="text-sm font-medium">{selectedService?.name}</p>
                      <p className="text-sm text-gray-600">{selectedSlot.start.toLocaleDateString("it-IT")} alle {selectedSlot.start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>

                      <div className="border-t border-blue-200 pt-2 mt-2">
                        <div className="flex justify-between text-sm">
                          <span>Prezzo servizio:</span>
                          <span className="font-medium">€{selectedService?.price.toFixed(2)}</span>
                        </div>
                        {selectedService && selectedService.price > 77.47 && (
                          <div className="flex justify-between text-sm text-gray-600 mt-1">
                            <span>Marca da bollo (art. 15 DPR 642/72):</span>
                            <span className="font-medium">€2,00</span>
                          </div>
                        )}
                        <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-blue-300">
                          <span>Totale da pagare:</span>
                          <span className="text-blue-600">€{selectedService ? (selectedService.price + (selectedService.price > 77.47 ? 2 : 0)).toFixed(2) : '0.00'}</span>
                        </div>
                      </div>

                      {selectedService && selectedService.price > 77.47 && (
                        <p className="text-xs text-gray-500 bg-white p-2 rounded mt-2">
                          ℹ️ La marca da bollo è obbligatoria per le prestazioni sanitarie esenti IVA con importo superiore a €77,47
                        </p>
                      )}
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
