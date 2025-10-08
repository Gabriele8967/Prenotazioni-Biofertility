import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to upload services...');

  const staffMember = await prisma.user.findUnique({
    where: { email: 'centrimanna2@gmail.com' },
  });

  if (!staffMember) {
    console.error('Staff member "Prof. Claudio Manna" not found.');
    return;
  }

  console.log(`Found staff member: ${staffMember.name}`);

  const fileContent = ` Categoria: Prestazioni Biofertility
Ordina Servizi:
Prima visita ginecologica (ID: 3)

Durata: 2h

Prezzo: €180.00
Seconda visita ginecologica (ID: 107)

Durata: 40min

Prezzo: €100.00
Biopsia endometriale per Plasmacellule + Datazione (ID: 108)

Durata: 40min

Prezzo: €450.00
Seconda Visita con ECO (ID: 106)

Durata: 40min

Prezzo: €150.00
ISTEROSCOPIA (ID: 84)

Durata: 20min

Prezzo: €250.00
Biopsia endometriale per plasmacellule (ID: 85)

Durata: 15min

Prezzo: €220.00
Biopsia datazione endometrio (finestra di impianto) (ID: 86)

Durata: 30min

Prezzo: €300.00
SCRATCH ENDOMETRIO (ID: 87)

Durata: 15min

Prezzo: €100.00
SCRATCH ENDOMETRIALE + PROVA TRANSFER (ID: 99)

Durata: 30min

Prezzo: €150.00
MONITORAGGIO FOLLICOLARE (ID: 88)

Durata: 15min

Prezzo: €200.00
Monitoraggio ecografico per pazienti esterne (ID: 89)

Durata: 15min

Prezzo: €350.00
Ecografia ginecologica (ID: 90)

Durata: 30min

Prezzo: €100.00
Ecografia ostetrica del primo trimestre (ID: 91)

Durata: 30min

Prezzo: €100.00
ISTEROSONOSALPINGOGRAFIA (ID: 92)

Durata: 30min

Prezzo: €300.00
SPERMIOGRAMMA (ID: 93)

Durata: 30min

Prezzo: €80.00
FRAMMENTAZIONE DNA SPERMATICO (ID: 94)

Durata: 30min

Prezzo: €160.00
VISITA ANDROLOGICA PER INFERTILITA' (ID: 95)

Durata: 1h

Prezzo: €150.00
ECOCOLOR DOPPLER SCROTALE (ID: 96)

Durata: 30min

Prezzo: €80.00
VISITA UROLOGICA (ID: 97)

Durata: 1h

Prezzo: €150.00
Aspirazione cisti ovariche (ID: 83)

Durata: 30min

Prezzo: €250.00
PRP ENDOMETRIALE (ID: 98)

Durata: 1h

Prezzo: €650.00

-------------------

Categoria: Tamponi e PAP-TEST
Ordina Servizi:
PAP-TEST (ID: 63)

Durata: 20min

Prezzo: €60.00
Tampone clamidia (ID: 61)

Durata: 10min

Prezzo: €45.00
Tampone germi comuni (ID: 60)

Durata: 10min

Prezzo: €100.00
Tampone micoplasma (ID: 62)

Durata: 10min

Prezzo: €35.00

-------------

Categoria: Visita Online

Secondo colloquio online (ID: 105)
Durata: 1h

Prezzo: €65.00
Consulto ginecologico - online (ID: 17)

Durata: 1h 30min

Prezzo: €120.00

------------
Categoria: Analisi
Ordina Servizi:
Altre analisi (ID: 59)

Durata: 10min

Prezzo: €0.00
Ormonali (ID: 36)

Durata: 10min

Prezzo: €15.00
Pacchetto analisi pre ICSI (ID: 47)

Durata: 10min

Prezzo: €650.00
`;

  const lines = fileContent.split('\n');

  let currentCategory = ''; // Renamed to avoid conflict with 'category' field
  let serviceName = '';
  let duration = 0;
  let price = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('Cateogria:') || trimmedLine.startsWith('Categoria :') || trimmedLine.startsWith('Categoria:')) {
      currentCategory = trimmedLine.split(':')[1].trim();
      console.log(`Processing category: ${currentCategory}`);
    } else if (trimmedLine.includes('(ID:')) {
      serviceName = trimmedLine.split('(ID:')[0].trim();
    } else if (trimmedLine.startsWith('Durata:')) {
      const durationString = trimmedLine.split(':')[1].trim();
      if (durationString.includes('h')) {
        const parts = durationString.replace('min', '').split('h');
        duration = parseInt(parts[0]) * 60 + (parts[1] ? parseInt(parts[1]) : 0);
      } else {
        duration = parseInt(durationString.replace('min', ''));
      }
    } else if (trimmedLine.startsWith('Prezzo:')) {
      const priceString = trimmedLine.split('€')[1].trim().replace(',', '.');
      price = parseFloat(priceString);

      if (serviceName && duration) {
        try {
            const existingService = await prisma.service.findFirst({
                where: { name: serviceName, staffMembers: { some: { id: staffMember.id } } },
            });

            if (existingService) {
                // Update existing service with category
                await prisma.service.update({
                    where: { id: existingService.id },
                    data: {
                        category: currentCategory || null,
                        price: price,
                    },
                });
                console.log(`Updated service: ${serviceName} with category: ${currentCategory}`);
            } else {
                // Create new service with category
                const service = await prisma.service.create({
                    data: {
                        name: serviceName,
                        durationMinutes: duration,
                        price: price,
                        category: currentCategory || null, // Assign category here
                        active: true,
                        staffMembers: {
                        connect: { id: staffMember.id },
                        },
                    },
                });
                console.log(`Created service: ${service.name} with category: ${currentCategory}`);
            }
        } catch (error) {
            console.error(`Error creating/updating service "${serviceName}":`, error);
        }
      }

      // Reset for next service
      serviceName = '';
      duration = 0;
      price = 0;
    }
  }

  console.log('Finished uploading services.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });