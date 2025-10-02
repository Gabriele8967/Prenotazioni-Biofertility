import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, ClipboardList, Settings } from "lucide-react";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard Amministratore</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{session.user.email}</span>
            <Button variant="outline" asChild>
              <Link href="/api/auth/signout">Logout</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/services">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <ClipboardList className="w-10 h-10 text-blue-600" />
                  <div>
                    <CardTitle>Gestione Visite</CardTitle>
                    <CardDescription>
                      Crea e modifica le visite disponibili
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/staff">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Users className="w-10 h-10 text-green-600" />
                  <div>
                    <CardTitle>Gestione Staff</CardTitle>
                    <CardDescription>
                      Aggiungi e gestisci operatori e medici
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/bookings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Calendar className="w-10 h-10 text-purple-600" />
                  <div>
                    <CardTitle>Prenotazioni</CardTitle>
                    <CardDescription>
                      Visualizza e gestisci le prenotazioni
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/admin/settings">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <Settings className="w-10 h-10 text-orange-600" />
                  <div>
                    <CardTitle>Impostazioni</CardTitle>
                    <CardDescription>
                      Configura Google Calendar e link pagamento
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
