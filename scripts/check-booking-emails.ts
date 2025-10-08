import { db } from '../lib/db';

async function checkBookingEmails() {
  console.log('🔍 Controllo prenotazioni con email sospette...\n');

  // 1. Trova tutti gli admin/staff
  const adminStaff = await db.user.findMany({
    where: {
      role: {
        in: ['ADMIN', 'STAFF']
      }
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true
    }
  });

  console.log('👥 Utenti Admin/Staff trovati:');
  adminStaff.forEach(user => {
    console.log(`  - ${user.name} (${user.email}) - ${user.role}`);
  });

  // 2. Trova prenotazioni associate a admin/staff come pazienti
  const suspiciousBookings = await db.booking.findMany({
    where: {
      patientId: {
        in: adminStaff.map(u => u.id)
      }
    },
    include: {
      patient: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      },
      service: {
        select: {
          name: true,
          price: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (suspiciousBookings.length === 0) {
    console.log('\n✅ Nessuna prenotazione sospetta trovata!');
  } else {
    console.log(`\n⚠️  Trovate ${suspiciousBookings.length} prenotazioni con pazienti Admin/Staff:\n`);
    
    suspiciousBookings.forEach(booking => {
      console.log(`📋 Booking ID: ${booking.id}`);
      console.log(`   Paziente: ${booking.patient.name} (${booking.patient.email})`);
      console.log(`   Ruolo: ${booking.patient.role}`);
      console.log(`   Servizio: ${booking.service.name} - €${booking.service.price}`);
      console.log(`   Data: ${booking.startTime.toLocaleString('it-IT')}`);
      console.log(`   Stato pagamento: ${booking.paymentStatus}`);
      console.log(`   Fattura ID: ${booking.fatturaId || 'Non generata'}`);
      console.log('');
    });
  }

  // 3. Mostra statistiche
  const totalBookings = await db.booking.count();
  console.log(`\n📊 Statistiche:`);
  console.log(`   Totale prenotazioni: ${totalBookings}`);
  console.log(`   Prenotazioni sospette: ${suspiciousBookings.length}`);
  console.log(`   Percentuale: ${((suspiciousBookings.length / totalBookings) * 100).toFixed(2)}%`);
}

checkBookingEmails()
  .then(() => {
    console.log('\n✅ Controllo completato!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Errore:', error);
    process.exit(1);
  });