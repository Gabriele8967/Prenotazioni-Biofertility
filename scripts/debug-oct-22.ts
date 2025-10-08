import * as dateFnsTz from 'date-fns-tz';
import { formatInTimeZone } from 'date-fns-tz';
import { setHours, setMinutes } from 'date-fns';

const ROME_TZ = 'Europe/Rome';

// Simula il 22 ottobre 2025
const date = new Date('2025-10-22');

// Orari di lavoro per Via Velletri (mercoledì)
const dailyWorkingHours = ["09:00-13:00", "15:00-18:00"];

const parsedWorkingHours = dailyWorkingHours.map(timeRange => {
  const [start, end] = timeRange.split('-');
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return { start: startH * 60 + startM, end: endH * 60 + endM };
});

console.log('Data:', date.toLocaleDateString('it-IT'));
console.log('Orari di lavoro:', dailyWorkingHours);
console.log('');

// Test con durata 30 minuti
const duration = 30;
console.log(`Test con durata: ${duration} minuti`);
console.log('---');

const availableSlots = [];
for (const wh of parsedWorkingHours) {
  console.log(`Processing working hours: ${wh.start} - ${wh.end} (${Math.floor(wh.start/60)}:${String(wh.start%60).padStart(2,'0')} - ${Math.floor(wh.end/60)}:${String(wh.end%60).padStart(2,'0')})`);
  let currentTime = wh.start;
  while (currentTime + duration <= wh.end) {
    const zonedDate = dateFnsTz.toZonedTime(date, ROME_TZ);
    let slotStart = setHours(zonedDate, Math.floor(currentTime / 60));
    slotStart = setMinutes(slotStart, currentTime % 60);

    let slotEnd = setHours(zonedDate, Math.floor((currentTime + duration) / 60));
    slotEnd = setMinutes(slotEnd, (currentTime + duration) % 60);
    
    console.log(`  Generated slot: ${slotStart.toLocaleTimeString()} - ${slotEnd.toLocaleTimeString()}. CurrentTime: ${currentTime}, Duration: ${duration}, wh.end: ${wh.end}`);
    
    availableSlots.push({ start: slotStart, end: slotEnd });
    currentTime += duration;
  }
}

console.log('');
console.log('Slot generati totali:', availableSlots.length);
availableSlots.forEach((slot, i) => {
  console.log(`${i+1}. ${slot.start.toLocaleTimeString('it-IT')} - ${slot.end.toLocaleTimeString('it-IT')}`);
});
