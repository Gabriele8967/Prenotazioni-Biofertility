"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    durationMinutes: 30,
    price: 0,
    notes: "",
    color: "#3b82f6",
    staffIds: [] as string[],
    onRequest: false,
  });

  useEffect(() => {
    fetchServices();
    fetchStaff();
  }, []);

  const fetchServices = async () => {
    const res = await fetch("/api/admin/services");
    const data = await res.json();
    setServices(data);
  };

  const fetchStaff = async () => {
    const res = await fetch("/api/admin/staff");
    const data = await res.json();
    setStaff(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setShowForm(false);
      fetchServices();
      setFormData({
        name: "",
        description: "",
        durationMinutes: 30,
        price: 0,
        notes: "",
        color: "#3b82f6",
        staffIds: [],
        onRequest: false,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo servizio?")) return;

    await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    fetchServices();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Gestione Visite</h1>
          <Link href="/admin/dashboard">
            <Button variant="outline">← Dashboard</Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Annulla" : "+ Nuova Visita"}
          </Button>
        </div>

        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Nuova Visita</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Nome Visita *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Descrizione</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Durata (minuti) *</Label>
                    <Input
                      type="number"
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData({ ...formData, durationMinutes: parseInt(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <Label>Prezzo (€) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Note per il paziente</Label>
                  <textarea
                    className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Operatori assegnati</Label>
                  <div className="space-y-2">
                    {staff.map((s) => (
                      <label key={s.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.staffIds.includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, staffIds: [...formData.staffIds, s.id] });
                            } else {
                              setFormData({ ...formData, staffIds: formData.staffIds.filter((id) => id !== s.id) });
                            }
                          }}
                        />
                        {s.name}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.onRequest}
                      onChange={(e) => setFormData({ ...formData, onRequest: e.target.checked })}
                    />
                    Servizio su Richiesta
                  </Label>
                  <p className="text-sm text-gray-500 mt-1">
                    Se attivato, questo servizio richiederà conferma di disponibilità dal centro prima della prenotazione (no pagamento immediato)
                  </p>
                </div>

                <Button type="submit">Crea Visita</Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span>{service.name}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(service.id)}
                  >
                    Elimina
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                <div className="space-y-1 text-sm">
                  <p><strong>Durata:</strong> {service.durationMinutes} min</p>
                  <p><strong>Prezzo:</strong> €{service.price}</p>
                  <p><strong>Staff:</strong> {service.staffMembers.map((s: any) => s.name).join(", ") || "Nessuno"}</p>
                  {service.onRequest && (
                    <p className="text-xs bg-orange-100 text-orange-800 p-2 rounded mt-2 font-semibold">
                      🔔 Servizio su Richiesta
                    </p>
                  )}
                  {service.notes && <p className="text-xs bg-yellow-50 p-2 rounded mt-2">{service.notes}</p>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
