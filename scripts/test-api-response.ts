import * as dateFnsTz from 'date-fns-tz';
import { formatInTimeZone } from 'date-fns-tz';

const ROME_TZ = 'Europe/Rome';

// Simula la data del 22 ottobre 2025
const inputDate = new Date('2025-10-22');
const zonedDate = dateFnsTz.toZonedTime(inputDate, ROME_TZ);

// Simula gli orari di lavoro
const dailyWorkingHours = ["09:00-13:00", "15:00-18:00"];
const duration = 90; // 90 minuti

const parsedWorkingHours = dailyWorkingHours.map(timeRange => {
  const [start, end] = timeRange.split('-');
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return { start: startH * 60 + startM, end: endH * 60 + endM };
});

const availableSlots = [];

for (const wh of parsedWorkingHours) {
  let currentTime = wh.start;
  while (currentTime + duration <= wh.end) {
    const slotStartHour = Math.floor(currentTime / 60);
    const slotStartMinute = currentTime % 60;
    const slotEndHour = Math.floor((currentTime + duration) / 60);
    const slotEndMinute = (currentTime + duration) % 60;
    
    const baseDateStr = formatInTimeZone(zonedDate, ROME_TZ, 'yyyy-MM-dd');
    const slotStartStr = `${baseDateStr}T${String(slotStartHour).padStart(2, '0')}:${String(slotStartMinute).padStart(2, '0')}:00`;
    const slotEndStr = `${baseDateStr}T${String(slotEndHour).padStart(2, '0')}:${String(slotEndMinute).padStart(2, '0')}:00`;
    
    const slotStart = dateFnsTz.toDate(slotStartStr, { timeZone: ROME_TZ });
    const slotEnd = dateFnsTz.toDate(slotEndStr, { timeZone: ROME_TZ });
    
    availableSlots.push({ start: slotStart, end: slotEnd });
    currentTime += duration;
  }
}

console.log('📅 Test API Response per il 22 ottobre 2025');
console.log('==========================================\n');

console.log('1️⃣ Date objects nel backend:');
availableSlots.forEach((slot, i) => {
  console.log(`Slot ${i + 1}:`);
  console.log(`  - Roma time: ${formatInTimeZone(slot.start, ROME_TZ, 'HH:mm')} - ${formatInTimeZone(slot.end, ROME_TZ, 'HH:mm')}`);
  console.log(`  - ISO string: ${slot.start.toISOString()} - ${slot.end.toISOString()}`);
});

console.log('\n2️⃣ JSON serializzato (come viene inviato al frontend):');
const jsonResponse = availableSlots.map(slot => ({
  start: slot.start.toISOString(),
  end: slot.end.toISOString()
}));
console.log(JSON.stringify(jsonResponse, null, 2));

console.log('\n3️⃣ Simulazione frontend - Cosa vede l\'utente:');
const frontendSlots = jsonResponse.map((slot: any) => ({
  start: new Date(slot.start),
  end: new Date(slot.end),
}));

frontendSlots.forEach((slot, i) => {
  const timeString = slot.start.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  console.log(`Slot ${i + 1}: ${timeString} (${slot.start.toISOString()})`);
});

console.log('\n✅ Test completato!');
console.log('Se vedi orari diversi da 09:00, 10:30, 15:00, 16:30, c\'è ancora un problema.');
