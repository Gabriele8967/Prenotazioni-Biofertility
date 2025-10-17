import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifica servizi su richiesta...\n');

  const onRequestServices = await prisma.service.findMany({
    where: {
      onRequest: true
    },
    select: {
      id: true,
      name: true,
      price: true,
      onRequest: true,
      active: true
    }
  });

  console.log(`✅ Trovati ${onRequestServices.length} servizi su richiesta:\n`);

  onRequestServices.forEach(service => {
    console.log(`  📋 ${service.name}`);
    console.log(`     ID: ${service.id}`);
    console.log(`     Prezzo: €${service.price}`);
    console.log(`     Attivo: ${service.active ? '✅' : '❌'}`);
    console.log('');
  });

  // Verifica anche che gli altri servizi NON siano su richiesta
  const normalServices = await prisma.service.findMany({
    where: {
      onRequest: false
    },
    select: {
      name: true
    }
  });

  console.log(`\n📊 Servizi con pagamento normale: ${normalServices.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Errore:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
