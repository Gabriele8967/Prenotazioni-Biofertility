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
