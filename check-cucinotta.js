const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_i5PqfmEBnR2d@ep-polished-hill-agxsfgwn-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require"
    }
  }
});

async function main() {
  try {
    console.log('🔍 Controllo dati per cucinotta814@gmail.com...\n');

    const user = await prisma.user.findUnique({
      where: { email: 'cucinotta814@gmail.com' },
      include: {
        bookingsAsPatient: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            service: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ Utente NON trovato nel database');
      return;
    }

    console.log('✅ UTENTE TROVATO\n');
    console.log('='.repeat(70));
    console.log(`ID: ${user.id}`);
    console.log(`Nome: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Ruolo: ${user.role}`);
    console.log(`Telefono: ${user.phone || '❌ MANCANTE'}`);
    console.log(`Creato: ${user.createdAt}`);
    console.log('='.repeat(70));

    console.log('\n📋 CAMPI OBBLIGATORI PER PRIVACY COMPLETA:\n');

    const requiredFields = {
      'Luogo di Nascita': user.luogoNascita,
      'Data di Nascita': user.birthDate,
      'Professione': user.professione,
      'Indirizzo': user.indirizzo,
      'Città': user.citta,
      'CAP': user.cap,
      'Codice Fiscale': user.fiscalCode,
      'Numero Documento': user.numeroDocumento,
      'Scadenza Documento': user.scadenzaDocumento
    };

    let allComplete = true;

    Object.entries(requiredFields).forEach(([field, value]) => {
      const status = value ? '✅' : '❌ MANCANTE';
      const displayValue = value || 'null';
      console.log(`${status} ${field.padEnd(25)}: ${displayValue}`);
      if (!value) allComplete = false;
    });

    console.log('\n' + '='.repeat(70));

    if (allComplete) {
      console.log('✅ TUTTI I CAMPI OBBLIGATORI SONO PRESENTI');
      console.log('   → L\'autocompletamento DOVREBBE funzionare');
    } else {
      console.log('❌ CAMPI OBBLIGATORI MANCANTI');
      console.log('   → L\'autocompletamento NON funzionerà');
      console.log('   → L\'utente verrà trattato come NUOVO');
    }

    console.log('='.repeat(70));

    console.log('\n📄 CAMPI AGGIUNTIVI:\n');
    console.log(`Provincia: ${user.provincia || 'null'}`);
    console.log(`Email Comunicazioni: ${user.emailComunicazioni || 'null'}`);
    console.log(`Privacy Accepted: ${user.privacyAccepted}`);
    console.log(`Privacy Accepted At: ${user.privacyAcceptedAt || 'null'}`);
    console.log(`Marketing Consent: ${user.marketingConsent}`);
    console.log(`Data Processing Consent: ${user.dataProcessingConsent}`);
    console.log(`IP Address: ${user.ipAddress || 'null'}`);
    console.log(`Consent Signature: ${user.consentSignature || 'null'}`);

    console.log('\n📅 PRENOTAZIONI:\n');
    if (user.bookingsAsPatient.length === 0) {
      console.log('Nessuna prenotazione trovata');
    } else {
      user.bookingsAsPatient.forEach((b, i) => {
        console.log(`${i + 1}. ${b.service.name}`);
        console.log(`   Data: ${b.startTime}`);
        console.log(`   Status: ${b.status} | Payment: ${b.paymentStatus}`);
        console.log(`   Creato: ${b.createdAt}`);
        console.log('');
      });
    }

    // Simula la chiamata API check-privacy
    console.log('\n🔍 SIMULAZIONE API /api/users/check-privacy:\n');

    const isComplete =
        !!user.luogoNascita &&
        !!user.birthDate &&
        !!user.professione &&
        !!user.indirizzo &&
        !!user.citta &&
        !!user.cap &&
        !!user.fiscalCode &&
        !!user.numeroDocumento &&
        !!user.scadenzaDocumento;

    console.log(`Response: {`);
    console.log(`  privacyComplete: ${isComplete},`);
    console.log(`  isUserFound: true,`);
    console.log(`  patientName: "${user.name}"`);
    console.log(`}`);

    if (!isComplete) {
      console.log('\n⚠️  PROBLEMA IDENTIFICATO:');
      console.log('   L\'API restituisce privacyComplete: false');
      console.log('   → Il frontend NON caricherà i dati automaticamente');
      console.log('   → L\'utente sarà trattato come nuovo utente');
    }

  } catch (error) {
    console.error('\n❌ ERRORE:', error);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('❌ Errore finale:', e);
  });
