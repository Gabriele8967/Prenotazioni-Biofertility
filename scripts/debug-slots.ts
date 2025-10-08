import { getAvailableSlots } from '../lib/google-calendar';

/**
 * Script di debug per verificare gli slot disponibili generati
 * 
 * Uso: npx tsx scripts/debug-slots.ts [data] [durata] [locationId]
 * Esempio: npx tsx scripts/debug-slots.ts 2025-10-09 30 via_velletri
 */

async function debugSlots() {
  const args = process.argv.slice(2);
  
  // Parametri da linea di comando o valori di default
  const dateStr = args[0] || new Date(Date.now() + 86400000).toISOString().split('T')[0]; // domani
  const duration = parseInt(args[1] || '30');
  const locationId = args[2] || 'via_velletri';
  
  const date = new Date(dateStr);
  
  console.log('🔍 DEBUG SLOT DISPONIBILI');
  console.log('========================\n');
  console.log('📅 Data:', date.toLocaleDateString('it-IT', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }));
  console.log('⏱️  Durata servizio:', duration, 'minuti');
  console.log('🏢 Sede:', locationId);
  console.log('');
  
  try {
    const slots = await getAvailableSlots(date, duration, undefined, locationId);
    
    console.log('✅ Slot totali generati:', slots.length);
    console.log('');
    
    if (slots.length === 0) {
      console.log('❌ Nessuno slot disponibile per questa data/sede');
      process.exit(0);
    }
    
    // Analizza gli slot
    let morningSlots = 0;
    let afternoonSlots = 0;
    let eveningSlots = 0;
    let invalidSlots: any[] = [];
    
    slots.forEach((slot, index) => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      const startHour = start.getHours();
      const endHour = end.getHours();
      const endMinutes = end.getMinutes();
      
      // Categorizza
      if (startHour < 13) {
        morningSlots++;
      } else if (startHour >= 15 && startHour < 18) {
        afternoonSlots++;
      } else {
        eveningSlots++;
      }
      
      // Verifica validità (non dovrebbe finire dopo le 18:00 o dopo le 13:00 per mattina)
      const isInvalid = 
        (endHour > 18 || (endHour === 18 && endMinutes > 0)) ||
        (startHour < 13 && (endHour > 13 || (endHour === 13 && endMinutes > 0)));
      
      if (isInvalid) {
        invalidSlots.push({
          index: index + 1,
          start: start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          end: end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          startISO: slot.start,
          endISO: slot.end
        });
      }
    });
    
    console.log('📊 STATISTICHE:');
    console.log('  Mattina (9:00-13:00):', morningSlots, 'slot');
    console.log('  Pomeriggio (15:00-18:00):', afternoonSlots, 'slot');
    console.log('  Sera (dopo 18:00):', eveningSlots, 'slot');
    console.log('');
    
    // Mostra tutti gli slot
    console.log('📋 TUTTI GLI SLOT:');
    slots.forEach((slot, index) => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      console.log(
        `  ${(index + 1).toString().padStart(2, ' ')}. ` +
        start.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + 
        ' - ' + 
        end.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
      );
    });
    console.log('');
    
    // Avvisi su slot invalidi
    if (invalidSlots.length > 0) {
      console.log('⚠️  ATTENZIONE: SLOT INVALIDI TROVATI!');
      console.log('=================================');
      invalidSlots.forEach(slot => {
        console.log(`  Slot #${slot.index}: ${slot.start} - ${slot.end}`);
        console.log(`    ISO Start: ${slot.startISO}`);
        console.log(`    ISO End: ${slot.endISO}`);
      });
      console.log('');
      console.log('❌ Questi slot NON dovrebbero essere disponibili!');
    } else {
      console.log('✅ Tutti gli slot sono validi (entro gli orari lavorativi)');
    }
    
    // Verifica timezone
    console.log('');
    console.log('🌍 TIMEZONE INFO:');
    const now = new Date();
    console.log('  Timezone sistema:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('  Offset attuale:', -now.getTimezoneOffset() / 60, 'ore da UTC');
    console.log('  Esempio slot JSON:', JSON.stringify(slots[0], null, 2));
    
  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

debugSlots();
