import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.settings.findMany({
    where: {
      key: {
        contains: 'hours'
      }
    }
  });

  console.log('Orari configurati:');
  settings.forEach(setting => {
    console.log('\n' + setting.key + ':');
    try {
      const hours = JSON.parse(setting.value);
      console.log(JSON.stringify(hours, null, 2));
    } catch (e) {
      console.log(setting.value);
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
