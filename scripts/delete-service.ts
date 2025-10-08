
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const serviceName = "Seconda visita";
  try {
    const { count } = await prisma.service.deleteMany({
      where: {
        name: serviceName,
      },
    });
    console.log(`Successfully deleted ${count} services named "${serviceName}".`);
  } catch (error) {
    console.error(`Error deleting service "${serviceName}":`, error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
