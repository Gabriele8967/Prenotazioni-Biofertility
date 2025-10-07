import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: "Amministratore",
        role: "ADMIN",
      },
    });

    console.log(`Admin user created: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log("IMPORTANT: Change the admin password after first login!");
  } else {
    console.log("Admin user already exists");
  }

  // Create default settings
  const paymentLinkExists = await prisma.settings.findUnique({
    where: { key: "payment_link" },
  });

  if (!paymentLinkExists) {
    await prisma.settings.create({
      data: {
        key: "payment_link",
        value: process.env.PAYMENT_LINK_URL || "https://example.com/payment",
      },
    });
    console.log("Default payment link setting created");
  }

  // Create test staff member - Professor Claudio Manna
  const staffEmail = "prof.manna@biofertility.com";
  const existingStaff = await prisma.user.findUnique({
    where: { email: staffEmail },
  });

  let staffMember;
  if (!existingStaff) {
    const hashedPassword = await bcrypt.hash("password123", 10);
    staffMember = await prisma.user.create({
      data: {
        email: staffEmail,
        password: hashedPassword,
        name: "Prof. Claudio Manna",
        role: "STAFF",
      },
    });
    console.log(`Staff member created: ${staffEmail}`);
  } else {
    staffMember = existingStaff;
    console.log("Staff member already exists");
  }

  // Create fertility services
  const services = [
    {
      name: "Prima Visita di Coppia",
      description: "Prima valutazione completa della coppia per diagnosi di infertilità, anamnesi dettagliata e prescrizione esami",
      durationMinutes: 60,
      price: 150,
      notes: "Portare eventuali esami precedenti e documentazione medica",
      color: "#3b82f6",
    },
    {
      name: "Visita Ginecologica di Controllo",
      description: "Visita ginecologica con ecografia transvaginale per monitoraggio follicolare o controllo",
      durationMinutes: 30,
      price: 100,
      notes: "Eseguire con vescica vuota",
      color: "#ec4899",
    },
    {
      name: "Ecografia Pelvica 3D/4D",
      description: "Ecografia tridimensionale/quadridimensionale per studio della cavità uterina e valutazione ovarica",
      durationMinutes: 45,
      price: 120,
      notes: "Eseguire con vescica piena",
      color: "#8b5cf6",
    },
    {
      name: "Isteroscopia Diagnostica",
      description: "Esame endoscopico della cavità uterina per diagnosi di patologie endocavitarie",
      durationMinutes: 30,
      price: 200,
      notes: "Eseguire nei giorni dopo il ciclo mestruale",
      color: "#f59e0b",
    },
    {
      name: "Consulenza PMA (Procreazione Assistita)",
      description: "Consulenza specialistica per tecniche di Procreazione Medicalmente Assistita (FIVET, ICSI, IUI)",
      durationMinutes: 60,
      price: 150,
      notes: "Portare tutti gli esami e referti precedenti",
      color: "#10b981",
    },
    {
      name: "Monitoraggio Follicolare",
      description: "Ecografia per monitoraggio della crescita follicolare durante stimolazione ovarica",
      durationMinutes: 20,
      price: 80,
      notes: "Da eseguire secondo indicazioni del medico",
      color: "#06b6d4",
    },
    {
      name: "Sonoisterografia",
      description: "Ecografia con infusione di soluzione salina per valutazione cavità uterina e pervietà tubarica",
      durationMinutes: 45,
      price: 180,
      notes: "Eseguire dopo il ciclo mestruale e prima dell'ovulazione",
      color: "#ef4444",
    },
  ];

  for (const serviceData of services) {
    const existingService = await prisma.service.findFirst({
      where: { name: serviceData.name },
    });

    if (!existingService) {
      await prisma.service.create({
        data: {
          ...serviceData,
          active: true,
          staffMembers: {
            connect: { id: staffMember.id },
          },
        },
      });
      console.log(`Service created: ${serviceData.name}`);
    }
  }

  // Create contact settings
  const contactSettings = [
    { key: "center_name", value: "Biofertility - Centro di Procreazione Medicalmente Assistita" },
    { key: "center_address_1", value: "Viale degli Eroi di Rodi 214, Roma" },
    { key: "center_address_2", value: "Via Velletri 7, 00198 Roma" },
    { key: "center_phone_1", value: "06-8415269" },
    { key: "center_phone_2", value: "392-0583277" },
    { key: "center_phone_3", value: "333-5082362" },
    { key: "center_email", value: "centrimanna2@gmail.com" },
    { key: "director_name", value: "Prof. Claudio Manna" },
    { key: "opening_hours", value: "Lun-Ven: 9:00-13:00 / 15:00-18:00, Sab: 9:00-13:00" },
  ];

  for (const setting of contactSettings) {
    const existing = await prisma.settings.findUnique({
      where: { key: setting.key },
    });

    if (!existing) {
      await prisma.settings.create({
        data: setting,
      });
      console.log(`Setting created: ${setting.key}`);
    }
  }

  console.log("Seed completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
