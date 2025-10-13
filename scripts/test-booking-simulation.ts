import { PrismaClient } from '@prisma/client';
import { validatePatientData } from '../lib/validators';
import { validateFiscalCode, checkFiscalCodeCoherence } from '../lib/fiscal-code-validator';

const prisma = new PrismaClient();

async function simulateBooking() {
  console.log('🧪 Test Simulazione Prenotazione\n');

  // Dati test paziente 1: Erika Di Gregorio
  const erikaData = {
    name: 'Erika Di Gregorio',
    email: 'erika.test@example.com',
    phone: '3331234567',
    fiscalCode: 'DGRRKR90A41H501T', // CF di esempio
    luogoNascita: 'Roma',
    dataNascita: '1990-01-01',
    professione: 'Impiegata',
    indirizzo: 'Via Roma 1',
    citta: 'Roma',
    provincia: 'RM',
    cap: '00100',
    numeroDocumento: 'AB1234567',
    scadenzaDocumento: '2030-12-31'
  };

  // Dati test paziente 2: Simona Cariella
  const simonaData = {
    name: 'Simona Cariella',
    email: 'simona.test@example.com',
    phone: '3339876543',
    fiscalCode: 'CRLSMN85M41H501X', // CF di esempio
    luogoNascita: 'Roma',
    dataNascita: '1985-08-01',
    professione: 'Insegnante',
    indirizzo: 'Via Milano 10',
    citta: 'Roma',
    provincia: 'RM',
    cap: '00185',
    numeroDocumento: 'CD9876543',
    scadenzaDocumento: '2029-06-30'
  };

  console.log('═══════════════════════════════════════════════════');
  console.log('TEST 1: Erika Di Gregorio\n');

  // Test validazione dati Erika
  console.log('📝 Validazione dati anagrafici...');
  const erikaValidation = validatePatientData(erikaData);
  if (!erikaValidation.isValid) {
    console.log('❌ ERRORE validazione:', erikaValidation.errors);
  } else {
    console.log('✅ Dati anagrafici validi');
  }

  // Test CF Erika
  console.log('\n📝 Validazione Codice Fiscale...');
  const erikaCFValidation = validateFiscalCode(erikaData.fiscalCode);
  if (!erikaCFValidation.isValid) {
    console.log('❌ ERRORE CF:', erikaCFValidation.errors);
  } else {
    console.log('✅ Codice Fiscale valido');
  }

  // Test coerenza CF Erika
  console.log('\n📝 Controllo coerenza CF con data nascita...');
  const erikaCoherence = checkFiscalCodeCoherence(erikaData.fiscalCode, erikaData.dataNascita);
  if (!erikaCoherence.isCoherent) {
    console.log('⚠️  WARNING coerenza:', erikaCoherence.issues);
    console.log('💡 Suggerimenti:', erikaCoherence.suggestions);
  } else {
    console.log('✅ CF coerente con data nascita');
  }

  // Verifica servizi disponibili
  console.log('\n📝 Verifica servizi disponibili...');
  const services = await prisma.service.findMany({ where: { active: true } });
  if (services.length === 0) {
    console.log('❌ ERRORE: Nessun servizio attivo!');
  } else {
    console.log(`✅ ${services.length} servizi disponibili`);
  }

  // Verifica staff disponibili
  console.log('\n📝 Verifica staff disponibili...');
  const staff = await prisma.user.findMany({ where: { role: { in: ['STAFF', 'ADMIN'] } } });
  if (staff.length === 0) {
    console.log('❌ ERRORE: Nessuno staff disponibile!');
  } else {
    console.log(`✅ ${staff.length} staff members disponibili`);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('TEST 2: Simona Cariella\n');

  // Test validazione dati Simona
  console.log('📝 Validazione dati anagrafici...');
  const simonaValidation = validatePatientData(simonaData);
  if (!simonaValidation.isValid) {
    console.log('❌ ERRORE validazione:', simonaValidation.errors);
  } else {
    console.log('✅ Dati anagrafici validi');
  }

  // Test CF Simona
  console.log('\n📝 Validazione Codice Fiscale...');
  const simonaCFValidation = validateFiscalCode(simonaData.fiscalCode);
  if (!simonaCFValidation.isValid) {
    console.log('❌ ERRORE CF:', simonaCFValidation.errors);
  } else {
    console.log('✅ Codice Fiscale valido');
  }

  // Test coerenza CF Simona
  console.log('\n📝 Controllo coerenza CF con data nascita...');
  const simonaCoherence = checkFiscalCodeCoherence(simonaData.fiscalCode, simonaData.dataNascita);
  if (!simonaCoherence.isCoherent) {
    console.log('⚠️  WARNING coerenza:', simonaCoherence.issues);
    console.log('💡 Suggerimenti:', simonaCoherence.suggestions);
  } else {
    console.log('✅ CF coerente con data nascita');
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('✅ TEST COMPLETATO\n');
  console.log('💡 Se tutti i test passano ma le pazienti non riescono a prenotare,');
  console.log('   il problema potrebbe essere:');
  console.log('   1. Dati reali diversi da quelli di test');
  console.log('   2. Errore lato client (browser, connessione)');
  console.log('   3. Problema con Stripe checkout');
  console.log('   4. Rate limiting (troppe richieste dallo stesso IP)');
}

simulateBooking()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
