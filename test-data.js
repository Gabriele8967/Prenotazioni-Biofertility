// Script per popolare database con dati di test
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🧪 Popolamento database con dati di test...\n');

  try {
    // 1. Crea Staff
    console.log('1️⃣  Creazione staff...');
    const staff = await prisma.user.upsert({
      where: { email: 'dott.rossi@test.com' },
      update: {},
      create: {
        email: 'dott.rossi@test.com',
        password: await bcrypt.hash('staff123', 10),
        name: 'Dr. Mario Rossi',
        role: 'STAFF',
        phone: '+39 333 1234567',
      },
    });
    console.log(`✅ Staff creato: ${staff.name} (${staff.email})`);

    // 2. Crea Servizi
    console.log('\n2️⃣  Creazione servizi...');
    const service1 = await prisma.service.upsert({
      where: { id: 'service-cardio-1' },
      update: {},
      create: {
        id: 'service-cardio-1',
        name: 'Visita Cardiologica',
        description: 'Visita specialistica con ECG completo',
        durationMinutes: 45,
        price: 80.00,
        notes: 'Portare referti precedenti ed esami del sangue recenti. Presentarsi a digiuno.',
        staffMembers: {
          connect: { id: staff.id },
        },
      },
    });
    console.log(`✅ Servizio: ${service1.name} (€${service1.price}, ${service1.durationMinutes} min)`);

    const service2 = await prisma.service.upsert({
      where: { id: 'service-dermato-1' },
      update: {},
      create: {
        id: 'service-dermato-1',
        name: 'Visita Dermatologica',
        description: 'Controllo nei e patologie della pelle',
        durationMinutes: 30,
        price: 60.00,
        notes: 'Portare documentazione fotografica di eventuali nei.',
        color: '#10b981',
        staffMembers: {
          connect: { id: staff.id },
        },
      },
    });
    console.log(`✅ Servizio: ${service2.name} (€${service2.price}, ${service2.durationMinutes} min)`);

    const service3 = await prisma.service.upsert({
      where: { id: 'service-ortopedia-1' },
      update: {},
      create: {
        id: 'service-ortopedia-1',
        name: 'Visita Ortopedica',
        description: 'Valutazione problematiche muscolo-scheletriche',
        durationMinutes: 40,
        price: 70.00,
        notes: 'Portare eventuali radiografie o risonanze precedenti.',
        color: '#f59e0b',
        staffMembers: {
          connect: { id: staff.id },
        },
      },
    });
    console.log(`✅ Servizio: ${service3.name} (€${service3.price}, ${service3.durationMinutes} min)`);

    // 3. Crea Paziente di test
    console.log('\n3️⃣  Creazione paziente di test...');
    const patient = await prisma.user.upsert({
      where: { email: 'paziente@test.com' },
      update: {},
      create: {
        email: 'paziente@test.com',
        password: await bcrypt.hash('patient123', 10),
        name: 'Giovanni Bianchi',
        role: 'PATIENT',
        phone: '+39 333 9876543',
      },
    });
    console.log(`✅ Paziente: ${patient.name} (${patient.email})`);

    // 4. Crea Prenotazioni di test
    console.log('\n4️⃣  Creazione prenotazioni...');

    const futureDate1 = new Date();
    futureDate1.setDate(futureDate1.getDate() + 3);
    futureDate1.setHours(10, 0, 0, 0);
    const endDate1 = new Date(futureDate1.getTime() + 45 * 60000);

    const booking1 = await prisma.booking.upsert({
      where: { id: 'booking-test-1' },
      update: {},
      create: {
        id: 'booking-test-1',
        startTime: futureDate1,
        endTime: endDate1,
        status: 'CONFIRMED',
        notes: 'Prima visita cardiologica - paziente riferisce palpitazioni',
        paymentCompleted: true,
        paymentLink: 'https://example.com/payment/12345',
        patientId: patient.id,
        staffId: staff.id,
        serviceId: service1.id,
      },
    });
    console.log(`✅ Prenotazione: ${service1.name} - ${futureDate1.toLocaleDateString('it-IT')} ore ${futureDate1.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}`);

    const futureDate2 = new Date();
    futureDate2.setDate(futureDate2.getDate() + 5);
    futureDate2.setHours(15, 30, 0, 0);
    const endDate2 = new Date(futureDate2.getTime() + 30 * 60000);

    const booking2 = await prisma.booking.upsert({
      where: { id: 'booking-test-2' },
      update: {},
      create: {
        id: 'booking-test-2',
        startTime: futureDate2,
        endTime: endDate2,
        status: 'PENDING',
        notes: 'Controllo neo sospetto',
        paymentCompleted: false,
        paymentLink: 'https://example.com/payment/12346',
        patientId: patient.id,
        staffId: staff.id,
        serviceId: service2.id,
      },
    });
    console.log(`✅ Prenotazione: ${service2.name} - ${futureDate2.toLocaleDateString('it-IT')} ore ${futureDate2.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}`);

    // Statistiche finali
    console.log('\n' + '='.repeat(70));
    console.log('📊 RIEPILOGO DATI');
    console.log('='.repeat(70));

    const stats = await Promise.all([
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'STAFF' } }),
      prisma.user.count({ where: { role: 'PATIENT' } }),
      prisma.service.count(),
      prisma.booking.count(),
    ]);

    console.log(`
👥 Utenti:
   Admin: ${stats[0]}
   Staff: ${stats[1]}
   Pazienti: ${stats[2]}

💼 Servizi Attivi: ${stats[3]}
📅 Prenotazioni: ${stats[4]}
`);

    console.log('='.repeat(70));
    console.log('🎯 CREDENZIALI DI ACCESSO');
    console.log('='.repeat(70));
    console.log(`
👨‍💼 ADMIN:
   URL: http://localhost:3000/admin/login
   Email: admin@test.com
   Password: admin123

👨‍⚕️ STAFF (Dr. Rossi):
   URL: http://localhost:3000/staff/login
   Email: dott.rossi@test.com
   Password: staff123

👤 PAZIENTE (Test):
   Email: paziente@test.com
   Password: patient123
`);

    console.log('='.repeat(70));
    console.log('✅ Setup dati di test completato con successo!');
    console.log('='.repeat(70));
    console.log('\n🚀 Ora puoi testare il sistema su http://localhost:3000\n');

  } catch (error) {
    console.error('❌ Errore:', error);
    throw error;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
