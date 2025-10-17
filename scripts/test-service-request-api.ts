/**
 * Test script per verificare l'API /api/service-requests
 * Simula una richiesta di servizio "su richiesta"
 */

const testServiceRequest = async () => {
  console.log('🧪 Test API /api/service-requests\n');

  const testData = {
    serviceId: 'cmggswfvv0004117thlnerykr', // ISTEROSCOPIA (onRequest: true)
    patientName: 'Mario Rossi Test',
    patientEmail: 'test-' + Date.now() + '@example.com',
    patientPhone: '+39 333 1234567',
    luogoNascita: 'Roma',
    dataNascita: '1985-03-15',
    professione: 'Ingegnere',
    indirizzo: 'Via Test 123',
    citta: 'Roma',
    provincia: 'RM',
    cap: '00100',
    codiceFiscale: 'RSSMRA85C15H501Z',
    notes: 'Test automatico - ignorare',
  };

  console.log('📤 Invio richiesta a http://localhost:3000/api/service-requests');
  console.log('📋 Dati:', JSON.stringify(testData, null, 2));
  console.log('');

  try {
    const response = await fetch('http://localhost:3000/api/service-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    const data = await response.json();
    console.log('📦 Risposta:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Test PASSATO - API funzionante!');
      console.log('   Verifica che sia arrivata l\'email a centrimanna2@gmail.com');
    } else {
      console.log('\n❌ Test FALLITO');
      console.error('   Errore:', data.error || 'Sconosciuto');
    }
  } catch (error: any) {
    console.error('\n❌ Errore durante la chiamata API:');
    console.error('   ', error.message);
    console.log('\n⚠️  Assicurati che il server Next.js sia in esecuzione (npm run dev)');
  }
};

testServiceRequest();
