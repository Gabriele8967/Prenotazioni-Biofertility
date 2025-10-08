import { toZonedTime } from 'date-fns-tz';

async function main() {
  try {
    const date = new Date();
    const timeZone = 'Europe/Rome';
    const zonedDate = toZonedTime(date, timeZone);
    console.log('utcToZonedTime imported and working:', zonedDate);
  } catch (error: any) {
    console.error('Error testing utcToZonedTime import:', error.message);
  }
}

main();
