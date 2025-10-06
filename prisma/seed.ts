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

  // Create test staff member
  const staffEmail = "dott.rossi@test.com";
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
        name: "Dott. Mario Rossi",
        role: "STAFF",
      },
    });
    console.log(`Test staff member created: ${staffEmail}`);
  } else {
    staffMember = existingStaff;
    console.log("Test staff member already exists");
  }

  // Create test service
  const serviceName = "Visita Generale";
  const existingService = await prisma.service.findFirst({
    where: { name: serviceName },
  });

  if (!existingService) {
    await prisma.service.create({
      data: {
        name: serviceName,
        description: "Visita medica generale con controllo completo",
        durationMinutes: 30,
        price: 50,
        notes: "Portare documentazione medica precedente se disponibile",
        active: true,
        staffMembers: {
          connect: { id: staffMember.id },
        },
      },
    });
    console.log(`Test service created: ${serviceName}`);
  } else {
    console.log("Test service already exists");
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
