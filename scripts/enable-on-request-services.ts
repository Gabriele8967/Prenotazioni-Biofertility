import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Aggiornamento servizi su richiesta...\n');

  const servicesToUpdate = [
    'Isteroscopia',
    'Visita andrologica',
    'Visita Andrologica',
    'Biopsia datazione endometrio',
    'Finestra d\'impianto',
    'PRP endometriale',
    'Visita urologica',
    'Visita Urologica'
  ];

  for (const serviceName of servicesToUpdate) {
    try {
      const services = await prisma.service.findMany({
        where: {
          name: {
            contains: serviceName,
            mode: 'insensitive'
          }
        }
      });

      if (services.length === 0) {
        console.log(`⚠️  Servizio non trovato: "${serviceName}"`);
        continue;
      }

      for (const service of services) {
        const updated = await prisma.service.update({
          where: { id: service.id },
          data: { onRequest: true }
        });

        console.log(`✅ Aggiornato: "${updated.name}" (ID: ${updated.id}) → onRequest: true`);
      }
    } catch (error) {
      console.error(`❌ Errore aggiornamento "${serviceName}":`, error);
    }
  }

  console.log('\n✅ Aggiornamento completato!');
}

main()
  .catch((e) => {
    console.error('❌ Errore:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
