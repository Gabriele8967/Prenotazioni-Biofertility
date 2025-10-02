// Script di test completo del sistema
const sqlite3 = require('sqlite3');
const bcrypt = require('bcryptjs');

console.log('🧪 Test Sistema Prenotazione Centro Medico\n');

// Verifica database
console.log('1️⃣  Verifico database esistente...');
const db = new sqlite3.Database('./prisma/dev.db');

db.all("SELECT * FROM users WHERE role = 'ADMIN'", [], (err, rows) => {
  if (err) {
    console.error('❌ Errore database:', err);
    return;
  }
  console.log(`✅ Admin trovati: ${rows.length}`);
  rows.forEach(u => console.log(`   - ${u.email}`));
  
  // Crea staff di test
  console.log('\n2️⃣  Creo staff di test...');
  const staffPassword = bcrypt.hashSync('staff123', 10);
  
  db.run(`INSERT OR IGNORE INTO users (id, email, password, name, role, phone) 
          VALUES (?, ?, ?, ?, ?, ?)`,
    ['staff-test-1', 'dott.rossi@test.com', staffPassword, 'Dr. Mario Rossi', 'STAFF', '+39 333 1234567'],
    function(err) {
      if (err && !err.message.includes('UNIQUE')) {
        console.error('❌ Errore creazione staff:', err);
      } else {
        console.log('✅ Staff creato: Dr. Mario Rossi (dott.rossi@test.com / staff123)');
      }
      
      // Crea servizio/visita di test
      console.log('\n3️⃣  Creo servizio di test...');
      db.run(`INSERT OR IGNORE INTO services (id, name, description, durationMinutes, price, notes, active, color) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ['service-test-1', 'Visita Cardiologica', 'Visita specialistica con ECG', 45, 80.00, 
         'Portare referti precedenti ed esami del sangue recenti', 1, '#3b82f6'],
        function(err) {
          if (err && !err.message.includes('UNIQUE')) {
            console.error('❌ Errore creazione servizio:', err);
          } else {
            console.log('✅ Servizio creato: Visita Cardiologica (€80, 45 min)');
          }
          
          // Collega staff al servizio
          db.run(`INSERT OR IGNORE INTO _ServiceToUser (A, B) VALUES (?, ?)`,
            ['service-test-1', 'staff-test-1'],
            function(err) {
              if (err && !err.message.includes('UNIQUE')) {
                console.error('⚠️  Warning collegamento staff:', err);
              } else {
                console.log('✅ Staff collegato al servizio');
              }
              
              // Crea prenotazione di test
              console.log('\n4️⃣  Creo prenotazione di test...');
              const futureDate = new Date();
              futureDate.setDate(futureDate.getDate() + 3);
              futureDate.setHours(10, 0, 0, 0);
              
              const endDate = new Date(futureDate);
              endDate.setMinutes(endDate.getMinutes() + 45);
              
              // Prima crea paziente
              const patientPassword = bcrypt.hashSync('patient123', 10);
              db.run(`INSERT OR IGNORE INTO users (id, email, password, name, role, phone) 
                      VALUES (?, ?, ?, ?, ?, ?)`,
                ['patient-test-1', 'paziente@test.com', patientPassword, 'Giovanni Bianchi', 'PATIENT', '+39 333 9876543'],
                function(err) {
                  if (err && !err.message.includes('UNIQUE')) {
                    console.error('❌ Errore creazione paziente:', err);
                  } else {
                    console.log('✅ Paziente creato: Giovanni Bianchi');
                  }
                  
                  // Crea prenotazione
                  db.run(`INSERT OR IGNORE INTO bookings 
                          (id, startTime, endTime, status, notes, paymentCompleted, paymentLink, patientId, staffId, serviceId) 
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    ['booking-test-1', futureDate.toISOString(), endDate.toISOString(), 'CONFIRMED',
                     'Prima visita cardiologica', 1, 'https://example.com/payment', 
                     'patient-test-1', 'staff-test-1', 'service-test-1'],
                    function(err) {
                      if (err && !err.message.includes('UNIQUE')) {
                        console.error('❌ Errore creazione prenotazione:', err);
                      } else {
                        console.log(`✅ Prenotazione creata per ${futureDate.toLocaleDateString('it-IT')} alle ${futureDate.toLocaleTimeString('it-IT', {hour: '2-digit', minute: '2-digit'})}`);
                      }
                      
                      // Riepilogo finale
                      console.log('\n' + '='.repeat(60));
                      console.log('📊 RIEPILOGO DATI DI TEST CREATI');
                      console.log('='.repeat(60));
                      
                      db.all("SELECT role, COUNT(*) as count FROM users GROUP BY role", [], (err, counts) => {
                        console.log('\n👥 Utenti:');
                        counts.forEach(c => console.log(`   ${c.role}: ${c.count}`));
                        
                        db.get("SELECT COUNT(*) as count FROM services", [], (err, services) => {
                          console.log(`\n💼 Servizi: ${services.count}`);
                          
                          db.get("SELECT COUNT(*) as count FROM bookings", [], (err, bookings) => {
                            console.log(`📅 Prenotazioni: ${bookings.count}`);
                            
                            console.log('\n' + '='.repeat(60));
                            console.log('🎯 CREDENZIALI DI TEST');
                            console.log('='.repeat(60));
                            console.log('\n👨‍⚕️ Admin:');
                            console.log('   Email: admin@test.com');
                            console.log('   Password: admin123');
                            console.log('\n👨‍⚕️ Staff (Dr. Rossi):');
                            console.log('   Email: dott.rossi@test.com');
                            console.log('   Password: staff123');
                            console.log('\n👤 Paziente:');
                            console.log('   Email: paziente@test.com');
                            console.log('   Password: patient123');
                            console.log('\n✅ Test setup completato!\n');
                            
                            db.close();
                          });
                        });
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});
