import Link from "next/link";
import { Calendar, Users, ClipboardList } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Centro Medico
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Sistema di Prenotazione Visite Online
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Link
            href="/prenotazioni"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-blue-100 hover:border-blue-300"
          >
            <div className="flex flex-col items-center text-center">
              <Calendar className="w-16 h-16 text-blue-600 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Prenota Visita</h2>
              <p className="text-gray-600">
                Scegli la visita e prenota il tuo appuntamento
              </p>
            </div>
          </Link>

          <Link
            href="/admin/login"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-green-100 hover:border-green-300"
          >
            <div className="flex flex-col items-center text-center">
              <ClipboardList className="w-16 h-16 text-green-600 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Area Admin</h2>
              <p className="text-gray-600">
                Gestisci visite, operatori e prenotazioni
              </p>
            </div>
          </Link>

          <Link
            href="/staff/login"
            className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow border-2 border-purple-100 hover:border-purple-300"
          >
            <div className="flex flex-col items-center text-center">
              <Users className="w-16 h-16 text-purple-600 mb-4" />
              <h2 className="text-2xl font-semibold mb-2">Area Staff</h2>
              <p className="text-gray-600">
                Visualizza le tue prenotazioni
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
