import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Ricerca pazienti: Erika Di Gregorio e Simona Cariella\n');

  // Cerca per nome/cognome
  const patients = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: 'Erika', mode: 'insensitive' } },
        { name: { contains: 'Di Gregorio', mode: 'insensitive' } },
        { name: { contains: 'Simona', mode: 'insensitive' } },
        { name: { contains: 'Cariella', mode: 'insensitive' } },
        { name: { contains: 'Cariello', mode: 'insensitive' } },
        { email: { contains: 'erika', mode: 'insensitive' } },
        { email: { contains: 'simona', mode: 'insensitive' } },
        { email: { contains: 'digregorio', mode: 'insensitive' } },
        { email: { contains: 'cariella', mode: 'insensitive' } },
        { email: { contains: 'cariello', mode: 'insensitive' } },
      ]
    },
    include: {
      bookingsAsPatient: {
        orderBy: { createdAt: 'desc' },
        take: 3
      }
    }
  });

  console.log(`\n📊 Trovati ${patients.length} pazienti:\n`);

  for (const patient of patients) {
    console.log('═══════════════════════════════════════════════════');
    console.log(`👤 Nome: ${patient.name}`);
    console.log(`📧 Email: ${patient.email}`);
    console.log(`📱 Telefono: ${patient.phone || 'N/D'}`);
    console.log(`🆔 Codice Fiscale: ${patient.fiscalCode || 'N/D'}`);
    console.log(`👔 Ruolo: ${patient.role}`);
    console.log(`📅 Registrato: ${patient.createdAt.toLocaleDateString('it-IT')}`);
    console.log(`\n🔐 PRIVACY:`);
    console.log(`  - Privacy Accepted: ${patient.privacyAccepted ? '✅' : '❌'}`);
    console.log(`  - Data Processing: ${patient.dataProcessingConsent ? '✅' : '❌'}`);
    console.log(`  - Luogo Nascita: ${patient.luogoNascita || '❌ MANCANTE'}`);
    console.log(`  - Data Nascita: ${patient.birthDate ? patient.birthDate.toLocaleDateString('it-IT') : '❌ MANCANTE'}`);
    console.log(`  - Professione: ${patient.professione || '❌ MANCANTE'}`);
    console.log(`  - Indirizzo: ${patient.indirizzo || '❌ MANCANTE'}`);
    console.log(`  - Città: ${patient.citta || '❌ MANCANTE'}`);
    console.log(`  - Provincia: ${patient.provincia || '❌ MANCANTE'}`);
    console.log(`  - CAP: ${patient.cap || '❌ MANCANTE'}`);
    console.log(`  - Numero Doc: ${patient.numeroDocumento || '❌ MANCANTE'}`);
    console.log(`  - Scadenza Doc: ${patient.scadenzaDocumento ? patient.scadenzaDocumento.toLocaleDateString('it-IT') : '❌ MANCANTE'}`);

    console.log(`\n📋 Prenotazioni (${patient.bookingsAsPatient.length}):`);
    if (patient.bookingsAsPatient.length === 0) {
      console.log('  Nessuna prenotazione');
    } else {
      patient.bookingsAsPatient.forEach((booking, i) => {
        console.log(`  ${i + 1}. ${new Date(booking.startTime).toLocaleString('it-IT')} - Status: ${booking.status}`);
      });
    }
    console.log('');
  }

  if (patients.length === 0) {
    console.log('❌ Nessun paziente trovato con questi criteri');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
