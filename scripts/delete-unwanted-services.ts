import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const serviceNames = [
    "Prima Visita di Coppia",
    "Visita Ginecologica di Controllo",
    "Ecografia Pelvica 3D/4D",
    "Isteroscopia Diagnostica",
    "Consulenza PMA (Procreazione Assistita)",
    "Monitoraggio Follicolare",
    "Sonoisterografia"
  ];

  try {
    const { count } = await prisma.service.deleteMany({
      where: {
        name: {
          in: serviceNames,
        },
      },
    });
    console.log(`Successfully deleted ${count} unwanted services.`);
  } catch (error) {
    console.error('Error deleting unwanted services:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
