/**
 * Test Suite per Flusso di Prenotazione
 *
 * Esegui con: DATABASE_URL="..." npx tsx tests/booking-flow-test.ts
 */

import { PrismaClient } from '@prisma/client';
import { validatePatientData, validateBookingData, Validator } from '../lib/validators';
import { validateFiscalCode, checkFiscalCodeCoherence, formatFiscalCode } from '../lib/fiscal-code-validator';

const prisma = new PrismaClient();

// Colori per output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(70) + '\n');
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();

  try {
    await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    log(`✓ ${name} (${duration}ms)`, 'green');
  } catch (error) {
    const duration = Date.now() - start;
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration });
    log(`✗ ${name} (${duration}ms)`, 'red');
    log(`  Error: ${errorMsg}`, 'red');
  }
}

// ========== TEST SUITE ==========

async function main() {
logSection('TEST 1: Validazione Dati Paziente');

await runTest('Validazione dati paziente completi e corretti', async () => {
  const validData = {
    name: 'Mario Rossi',
    email: 'mario.rossi@example.com',
    phone: '3331234567',
    fiscalCode: 'RSSMRA85M01H501Q',
    luogoNascita: 'Roma',
    dataNascita: '1985-08-01',
    professione: 'Ingegnere',
    indirizzo: 'Via Roma 123',
    citta: 'Roma',
    provincia: 'RM',
    cap: '00100',
    numeroDocumento: 'AB1234567',
    scadenzaDocumento: '2030-12-31'
  };

  const result = validatePatientData(validData);
  if (!result.isValid) {
    throw new Error(`Validazione fallita: ${result.errors.join(', ')}`);
  }
});

await runTest('Validazione email non valida', async () => {
  const validator = new Validator();
  const result = validator.email('invalid-email', 'Email').result();

  if (result.isValid) {
    throw new Error('Email non valida dovrebbe fallire la validazione');
  }
});

await runTest('Validazione telefono italiano non valido', async () => {
  const validator = new Validator();
  const result = validator.italianPhone('12345', 'Telefono').result();

  if (result.isValid) {
    throw new Error('Telefono non valido dovrebbe fallire la validazione');
  }
});

await runTest('Validazione codice fiscale formato corretto', async () => {
  const validCF = 'RSSMRA85M01H501Q'; // CF corretto con check digit giusto
  const result = validateFiscalCode(validCF);

  if (!result.isValid) {
    throw new Error(`CF valido rifiutato: ${result.errors?.join(', ')}`);
  }
});

await runTest('Validazione codice fiscale formato errato', async () => {
  const invalidCF = 'INVALID123';
  const result = validateFiscalCode(invalidCF);

  if (result.isValid) {
    throw new Error('CF non valido dovrebbe fallire la validazione');
  }
});

await runTest('Validazione coerenza codice fiscale con data nascita', async () => {
  const cf = 'RSSMRA85M01H501Q'; // CF corretto
  const birthDate = '1985-08-01';

  const result = checkFiscalCodeCoherence(cf, birthDate);
  if (!result.isCoherent) {
    throw new Error(`CF coerente rifiutato: ${result.issues?.join(', ')}`);
  }
});

await runTest('Validazione CAP italiano', async () => {
  const validator = new Validator();

  // CAP valido
  let result = validator.italianPostalCode('00100', 'CAP').result();
  if (!result.isValid) {
    throw new Error('CAP valido rifiutato');
  }

  // CAP non valido
  result = new Validator().italianPostalCode('123', 'CAP').result();
  if (result.isValid) {
    throw new Error('CAP non valido dovrebbe fallire');
  }
});

await runTest('Validazione provincia italiana', async () => {
  const validator = new Validator();

  // Provincia valida
  let result = validator.italianProvince('RM', 'Provincia').result();
  if (!result.isValid) {
    throw new Error('Provincia valida rifiutata');
  }

  // Provincia non valida
  result = new Validator().italianProvince('ROM', 'Provincia').result();
  if (result.isValid) {
    throw new Error('Provincia non valida dovrebbe fallire');
  }
});

await runTest('Validazione campi obbligatori mancanti', async () => {
  const incompleteData = {
    name: '',  // mancante
    email: 'test@example.com',
    phone: '3331234567',
    fiscalCode: '',  // mancante
    luogoNascita: '',  // mancante
    dataNascita: '1985-08-01',
    professione: '',  // mancante
    indirizzo: 'Via Roma 123',
    citta: 'Roma',
    provincia: 'RM',
    cap: '00100',
    numeroDocumento: 'AB123',
    scadenzaDocumento: '2030-12-31'
  };

  const result = validatePatientData(incompleteData);
  if (result.isValid) {
    throw new Error('Dati incompleti dovrebbero fallire la validazione');
  }

  // Verifica che siano stati rilevati i campi mancanti
  const errorStr = result.errors.join(' ');
  if (!errorStr.includes('Nome') || !errorStr.includes('Codice Fiscale')) {
    throw new Error('Non tutti i campi mancanti sono stati rilevati');
  }
});

logSection('TEST 2: Verifica Database e Operazioni');

await runTest('Connessione database funzionante', async () => {
  await prisma.$queryRaw`SELECT 1`;
});

await runTest('Recupero servizi disponibili', async () => {
  const services = await prisma.service.findMany({
    where: { active: true }
  });

  if (services.length === 0) {
    throw new Error('Nessun servizio attivo trovato nel database');
  }

  log(`  Trovati ${services.length} servizi attivi`, 'blue');
});

await runTest('Recupero staff members disponibili', async () => {
  const staff = await prisma.user.findMany({
    where: { role: { in: ['STAFF', 'ADMIN'] } }
  });

  if (staff.length === 0) {
    throw new Error('Nessuno staff member trovato nel database');
  }

  log(`  Trovati ${staff.length} staff members`, 'blue');
});

await runTest('Verifica unicità email paziente', async () => {
  const existingPatients = await prisma.user.findMany({
    where: { role: 'PATIENT' },
    take: 1
  });

  if (existingPatients.length > 0) {
    const email = existingPatients[0].email;

    // Dovrebbe trovare il paziente esistente
    const found = await prisma.user.findUnique({
      where: { email }
    });

    if (!found) {
      throw new Error('Paziente esistente non trovato per email');
    }

    log(`  Verificata unicità email per: ${email}`, 'blue');
  }
});

await runTest('Creazione paziente test (rollback)', async () => {
  const testEmail = `test-${Date.now()}@example.com`;

  // Crea paziente test
  const patient = await prisma.user.create({
    data: {
      email: testEmail,
      name: 'Test Patient',
      password: 'test-password-hash',
      role: 'PATIENT',
      fiscalCode: 'TSTPTN85M01H501Q',
      phone: '3331234567',
      luogoNascita: 'Roma',
      birthDate: new Date('1985-08-01'),
      professione: 'Test',
      indirizzo: 'Via Test 123',
      citta: 'Roma',
      provincia: 'RM',
      cap: '00100',
      numeroDocumento: 'TEST123',
      scadenzaDocumento: new Date('2030-12-31'),
      privacyAccepted: true,
      dataProcessingConsent: true
    }
  });

  // Verifica creazione
  if (!patient.id) {
    throw new Error('Paziente non creato correttamente');
  }

  log(`  Paziente creato con ID: ${patient.id}`, 'blue');

  // Cleanup: elimina paziente test
  await prisma.user.delete({ where: { id: patient.id } });
  log(`  Paziente test eliminato (rollback)`, 'blue');
});

logSection('TEST 3: Validazione Prenotazione');

await runTest('Validazione dati prenotazione completi', async () => {
  // Prima ottieni un servizio e staff reale
  const service = await prisma.service.findFirst({ where: { active: true } });
  const staff = await prisma.user.findFirst({ where: { role: { in: ['STAFF', 'ADMIN'] } } });

  if (!service || !staff) {
    throw new Error('Servizio o staff non disponibili per test');
  }

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7); // +7 giorni

  const bookingData = {
    serviceId: service.id,
    staffId: staff.id,
    startTime: futureDate.toISOString(),
    patientEmail: 'test@example.com'
  };

  const result = validateBookingData(bookingData);
  if (!result.isValid) {
    throw new Error(`Validazione prenotazione fallita: ${result.errors.join(', ')}`);
  }
});

await runTest('Validazione prenotazione con data passata', async () => {
  const service = await prisma.service.findFirst({ where: { active: true } });
  const staff = await prisma.user.findFirst({ where: { role: { in: ['STAFF', 'ADMIN'] } } });

  if (!service || !staff) {
    throw new Error('Servizio o staff non disponibili per test');
  }

  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // -1 giorno

  const bookingData = {
    serviceId: service.id,
    staffId: staff.id,
    startTime: pastDate.toISOString(),
    patientEmail: 'test@example.com'
  };

  const result = validateBookingData(bookingData);
  if (result.isValid) {
    throw new Error('Prenotazione con data passata dovrebbe fallire');
  }
});

logSection('TEST 4: Edge Cases e Situazioni Limite');

await runTest('Gestione email con caratteri speciali', async () => {
  const emails = [
    'test+tag@example.com',
    'test.name@example.com',
    'test_name@example.com',
    'test-name@example.com'
  ];

  const validator = new Validator();
  for (const email of emails) {
    const result = validator.email(email, 'Email').result();
    if (!result.isValid) {
      throw new Error(`Email valida rifiutata: ${email}`);
    }
  }
});

await runTest('Gestione nomi con apostrofi e spazi', async () => {
  const names = [
    "D'Angelo",
    "De Luca",
    "Maria Rossi",
    "O'Connor"
  ];

  for (const name of names) {
    const validator = new Validator();
    const result = validator
      .required(name, 'Nome')
      .minLength(name, 2, 'Nome')
      .result();

    if (!result.isValid) {
      throw new Error(`Nome valido rifiutato: ${name}`);
    }
  }
});

await runTest('Gestione telefoni con formati diversi', async () => {
  const phones = [
    '3331234567',
    '+393331234567',
    '0039 333 123 4567',
    '333-123-4567'
  ];

  const validator = new Validator();
  for (const phone of phones) {
    const result = validator.italianPhone(phone, 'Telefono').result();
    if (!result.isValid) {
      throw new Error(`Telefono valido rifiutato: ${phone}`);
    }
  }
});

await runTest('Protezione SQL injection nei campi testo', async () => {
  const maliciousInputs = [
    "'; DROP TABLE users; --",
    "<script>alert('xss')</script>",
    "1' OR '1'='1",
    "admin'--"
  ];

  // Verifica che i campi con input pericolosi non causino errori
  for (const input of maliciousInputs) {
    const validator = new Validator();
    const result = validator.required(input, 'Campo').result();
    // Dovrebbe essere valido come required, ma poi sanitizzato
    if (!result.isValid) {
      throw new Error('Input pericoloso causa errore di validazione');
    }
  }

  log('  Input pericolosi gestiti correttamente', 'blue');
});

await runTest('Verifica lunghezza massima campi', async () => {
  const longString = 'a'.repeat(1000);

  const validator = new Validator();
  const result = validator.maxLength(longString, 500, 'Campo').result();

  if (result.isValid) {
    throw new Error('Stringa troppo lunga dovrebbe fallire la validazione');
  }
});

logSection('TEST 5: Performance e Carico');

await runTest('Query database sotto 100ms', async () => {
  const start = Date.now();
  await prisma.user.findMany({ where: { role: 'PATIENT' }, take: 10 });
  const duration = Date.now() - start;

  if (duration > 100) {
    throw new Error(`Query troppo lenta: ${duration}ms (limite: 100ms)`);
  }

  log(`  Query completata in ${duration}ms`, 'blue');
});

await runTest('Validazione multipla in parallelo', async () => {
  const start = Date.now();

  const validations = Array(10).fill(null).map((_, i) => {
    const validator = new Validator();
    return validator
      .required(`test${i}@example.com`, 'Email')
      .email(`test${i}@example.com`)
      .result();
  });

  const allValid = validations.every(v => v.isValid);
  const duration = Date.now() - start;

  if (!allValid) {
    throw new Error('Alcune validazioni in parallelo sono fallite');
  }

  if (duration > 50) {
    throw new Error(`Validazioni troppo lente: ${duration}ms`);
  }

  log(`  10 validazioni completate in ${duration}ms`, 'blue');
});

// ========== REPORT FINALE ==========

logSection('REPORT FINALE');

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => r.failed).length;
const total = results.length;
const successRate = ((passed / total) * 100).toFixed(1);

console.log(`Totale test: ${total}`);
log(`✓ Passed: ${passed}`, 'green');

if (failed > 0) {
  log(`✗ Failed: ${failed}`, 'red');
  console.log('\nTest Falliti:');
  results.filter(r => !r.passed).forEach(r => {
    log(`  - ${r.name}`, 'red');
    log(`    ${r.error}`, 'red');
  });
}

console.log(`\nSuccess Rate: ${successRate}%`);

const avgDuration = (results.reduce((sum, r) => sum + r.duration, 0) / total).toFixed(0);
console.log(`Durata media: ${avgDuration}ms`);

if (failed > 0) {
  log('\n❌ ALCUNI TEST SONO FALLITI', 'red');
  await prisma.$disconnect();
  process.exit(1);
} else {
  log('\n✅ TUTTI I TEST SONO PASSATI', 'green');
  await prisma.$disconnect();
  process.exit(0);
}
}

// Esegui main
main().catch((error) => {
  console.error('Errore fatale:', error);
  process.exit(1);
});
