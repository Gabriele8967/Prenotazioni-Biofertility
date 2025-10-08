import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Aggiornamento categorie servizi in produzione...\n");

  // Categoria: Prestazioni Biofertility
  const biofertilityServices = [
    "Aspirazione cisti ovariche",
    "PRP ENDOMETRIALE",
    "Biopsia endometriale per Plasmacellule + Datazione",
    "Seconda Visita con ECO",
    "ISTEROSCOPIA",
    "Biopsia endometriale per plasmacellule",
    "Biopsia datazione endometrio (finestra di impianto)",
    "SCRATCH ENDOMETRIO",
    "SCRATCH ENDOMETRIALE + PROVA TRANSFER",
    "Monitoraggio ecografico per pazienti esterne",
    "Ecografia ginecologica",
    "Ecografia ostetrica del primo trimestre",
    "SPERMIOGRAMMA",
    "FRAMMENTAZIONE DNA SPERMATICO",
    "VISITA ANDROLOGICA PER INFERTILITA'",
    "ECOCOLOR DOPPLER SCROTALE",
    "MONITORAGGIO FOLLICOLARE",
    "Visita ginecologica",
    "ISTEROSONOSALPINGOGRAFIA",
    "VISITA UROLOGICA",
    "Prima visita ginecologica",
    "Seconda visita ginecologica",
    "Seconda visita"
  ];

  // Categoria: Tamponi e PAP-TEST
  const tamponiServices = [
    "Tampone micoplasma",
    "PAP-TEST",
    "Tampone clamidia",
    "Tampone germi comuni"
  ];

  // Categoria: Visita Online
  const visitaOnlineServices = [
    "Secondo colloquio online",
    "Consulto ginecologico - online"
  ];

  // Categoria: Analisi (nascosta)
  const analisiServices = [
    "Altre analisi",
    "Ormonali",
    "Pacchetto analisi pre ICSI"
  ];

  // Aggiorna Prestazioni Biofertility
  for (const serviceName of biofertilityServices) {
    const result = await prisma.service.updateMany({
      where: { name: serviceName },
      data: { category: "Prestazioni Biofertility" }
    });
    if (result.count > 0) {
      console.log(`✅ ${serviceName} → Prestazioni Biofertility`);
    }
  }

  // Aggiorna Tamponi e PAP-TEST
  for (const serviceName of tamponiServices) {
    const result = await prisma.service.updateMany({
      where: { name: serviceName },
      data: { category: "Tamponi e PAP-TEST" }
    });
    if (result.count > 0) {
      console.log(`✅ ${serviceName} → Tamponi e PAP-TEST`);
    }
  }

  // Aggiorna Visita Online
  for (const serviceName of visitaOnlineServices) {
    const result = await prisma.service.updateMany({
      where: { name: serviceName },
      data: { category: "Visita Online" }
    });
    if (result.count > 0) {
      console.log(`✅ ${serviceName} → Visita Online`);
    }
  }

  // Aggiorna Analisi
  for (const serviceName of analisiServices) {
    const result = await prisma.service.updateMany({
      where: { name: serviceName },
      data: { category: "Analisi" }
    });
    if (result.count > 0) {
      console.log(`✅ ${serviceName} → Analisi`);
    }
  }

  console.log("\n✅ Categorie aggiornate con successo!");

  // Verifica
  const allServices = await prisma.service.findMany({
    where: { active: true },
    select: { name: true, category: true }
  });

  console.log("\n📊 Riepilogo categorie:");
  const grouped = allServices.reduce((acc, s) => {
    const cat = s.category || "SENZA CATEGORIA";
    if (!acc[cat]) acc[cat] = 0;
    acc[cat]++;
    return acc;
  }, {} as Record<string, number>);

  Object.entries(grouped).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} servizi`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Errore:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
