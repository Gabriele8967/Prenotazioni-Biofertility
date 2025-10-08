/**
 * Script per testare la conversione timezone che avviene nel frontend
 * Simula esattamente cosa fa il browser quando riceve gli slot dall'API
 */

// Simula una risposta dall'API
const mockAPIResponse = [
  {
    start: "2025-10-09T17:30:00.000Z", // 17:30 UTC
    end: "2025-10-09T18:00:00.000Z"    // 18:00 UTC
  },
  {
    start: "2025-10-09T15:30:00.000Z", // 15:30 UTC  
    end: "2025-10-09T16:00:00.000Z"    // 16:00 UTC
  }
];

console.log('🧪 TEST CONVERSIONE TIMEZONE');
console.log('===========================\n');

console.log('📡 Risposta API (stringhe ISO):');
console.log(JSON.stringify(mockAPIResponse, null, 2));
console.log('');

// Simula la conversione che fa il frontend (linea 234 di prenotazioni/page.tsx)
const convertedSlots = mockAPIResponse.map((slot: any) => ({
  start: new Date(slot.start),
  end: new Date(slot.end),
}));

console.log('🖥️  Dopo conversione new Date() (oggetti JavaScript):');
convertedSlots.forEach((slot, index) => {
  console.log(`\nSlot ${index + 1}:`);
  console.log('  Start ISO:', slot.start.toISOString());
  console.log('  Start locale:', slot.start.toLocaleString('it-IT'));
  console.log('  Start orario:', slot.start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
  console.log('  End ISO:', slot.end.toISOString());
  console.log('  End locale:', slot.end.toLocaleString('it-IT'));
  console.log('  End orario:', slot.end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
});

console.log('\n');
console.log('🌍 INFO SISTEMA:');
console.log('  Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
const now = new Date();
console.log('  Offset UTC:', -now.getTimezoneOffset() / 60, 'ore');
console.log('  DST attivo:', now.getTimezoneOffset() !== new Date(2025, 0, 1).getTimezoneOffset());

console.log('\n');
console.log('💡 SPIEGAZIONE:');
console.log('  Se vedi orari "strani" (es. 19:30 invece di 17:30),');
console.log('  il problema è che l\'API restituisce date in UTC');
console.log('  ma il browser le interpreta nel timezone locale.');
console.log('');
console.log('  Italia (UTC+1/+2) → se API dice "17:30 UTC",');
console.log('  il browser mostra "18:30" o "19:30" in ora locale!');
