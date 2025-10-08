import { google } from 'googleapis';
import { db } from './db';
import * as dateFnsTz from 'date-fns-tz';
import { formatInTimeZone } from 'date-fns-tz';
import { setHours, setMinutes } from 'date-fns';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Crea client OAuth2 autenticato per uno staff member
export async function getAuthenticatedCalendarClient(staffEmail: string) {
  const staff = await db.user.findUnique({
    where: { email: staffEmail },
    select: {
      googleAccessToken: true,
      googleRefreshToken: true,
      googleTokenExpiry: true,
      id: true,
    },
  });

  if (!staff || !staff.googleRefreshToken) {
    throw new Error('Staff member not authenticated with Google');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  );

  oauth2Client.setCredentials({
    access_token: staff.googleAccessToken,
    refresh_token: staff.googleRefreshToken,
    expiry_date: staff.googleTokenExpiry?.getTime(),
  });

  // Auto-refresh del token
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      await db.user.update({
        where: { id: staff.id },
        data: {
          googleAccessToken: tokens.access_token!,
          googleRefreshToken: tokens.refresh_token,
          googleTokenExpiry: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
        },
      });
    } else if (tokens.access_token) {
      await db.user.update({
        where: { id: staff.id },
        data: {
          googleAccessToken: tokens.access_token,
          googleTokenExpiry: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
        },
      });
    }
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export async function getAvailableSlots(
  date: Date,
  duration: number,
  staffEmail?: string,
  locationId?: string
) {
  const ROME_TZ = 'Europe/Rome';

  // Convert input date to Rome timezone
  const zonedDate = dateFnsTz.toZonedTime(date, ROME_TZ);

  const startOfDay = dateFnsTz.toZonedTime(date, ROME_TZ);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = dateFnsTz.toZonedTime(date, ROME_TZ);
  endOfDay.setHours(23, 59, 59, 999);

  let staffMember = null;
  if (staffEmail) {
    staffMember = await db.user.findUnique({
      where: { email: staffEmail },
      select: { id: true, name: true, googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true, email: true },
    });

    if (!staffMember) {
      throw new Error("Staff member not found");
    }
  }

  let calendarEvents: any[] = [];
  if (staffMember) {
    const calendar = await getAuthenticatedCalendarClient(staffMember.email);
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    calendarEvents = res.data.items || [];
  }

  // Fetch location working hours
  let locationWorkingHours: Record<string, string[]> = {};
  if (locationId) {
    const locationSetting = await db.settings.findUnique({
      where: { key: `location_${locationId}_hours` },
    });
    if (locationSetting) {
      locationWorkingHours = JSON.parse(locationSetting.value);
      console.log('locationWorkingHours', locationWorkingHours);
    }
  }

  const dayOfWeek = formatInTimeZone(date, ROME_TZ, 'EEEE').toLowerCase();
  const dailyWorkingHours = locationWorkingHours[dayOfWeek] || [];
  console.log('dayOfWeek', dayOfWeek);
  console.log('dailyWorkingHours', dailyWorkingHours);

  const parsedWorkingHours = dailyWorkingHours.map(timeRange => {
    const [start, end] = timeRange.split('-');
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return { start: startH * 60 + startM, end: endH * 60 + endM };
  });

  const availableSlots = [];
  for (const wh of parsedWorkingHours) {
    console.log(`Processing working hours: ${wh.start} - ${wh.end}`);
    let currentTime = wh.start;
    while (currentTime + duration <= wh.end) {
      // Costruisci le ore e minuti per start e end
      const slotStartHour = Math.floor(currentTime / 60);
      const slotStartMinute = currentTime % 60;
      const slotEndHour = Math.floor((currentTime + duration) / 60);
      const slotEndMinute = (currentTime + duration) % 60;
      
      // Ottieni la data base nel timezone di Roma (senza ore)
      const baseDateStr = formatInTimeZone(zonedDate, ROME_TZ, 'yyyy-MM-dd');
      
      // Crea stringhe ISO complete con timezone
      const slotStartStr = `${baseDateStr}T${String(slotStartHour).padStart(2, '0')}:${String(slotStartMinute).padStart(2, '0')}:00`;
      const slotEndStr = `${baseDateStr}T${String(slotEndHour).padStart(2, '0')}:${String(slotEndMinute).padStart(2, '0')}:00`;
      
      // Converti in Date objects nel timezone corretto
      const slotStart = dateFnsTz.toDate(slotStartStr, { timeZone: ROME_TZ });
      const slotEnd = dateFnsTz.toDate(slotEndStr, { timeZone: ROME_TZ });
      
      console.log(`  Generated slot: ${formatInTimeZone(slotStart, ROME_TZ, 'HH:mm')} - ${formatInTimeZone(slotEnd, ROME_TZ, 'HH:mm')}. CurrentTime: ${currentTime}, Duration: ${duration}, wh.end: ${wh.end}`);

      const isPastSlot = slotStart < new Date();
      const isBooked = calendarEvents.some((event) => {
        if (event.summary === 'APPUNTAMENTI A BIOFERTILITY') {
          return false;
        }
        const eventStart = new Date(event.start?.dateTime || event.start?.date!); 
        const eventEnd = new Date(event.end?.dateTime || event.end?.date!); 
        const overlap = slotStart < eventEnd && eventStart < slotEnd;
        return overlap;
      });

      if (!isBooked && !isPastSlot) {
        availableSlots.push({ start: slotStart, end: slotEnd });
      }

      currentTime += duration; // Sposta al prossimo slot
    }
  }

  return availableSlots;
}

// Funzione di fallback per generare slot disponibili senza Google Calendar
function generateDefaultSlots(date: Date, durationMinutes: number) {
  // Orario di lavoro: Lun-Ven 9:00-12:00 e 15:00-18:00, Sab 9:00-12:00
  const dayOfWeek = date.getDay(); // 0=domenica, 1=lunedì, ..., 6=sabato
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;

  // Nessun orario disponibile la domenica
  if (isSunday) {
    return [];
  }

  const morningStart = 9;
  const morningEnd = 12;
  const afternoonStart = 15;
  const afternoonEnd = 18;
  const availableSlots: { start: Date; end: Date }[] = [];

  // Genera slot ogni 30 minuti per la mattina (9-13)
  for (let hour = morningStart; hour < morningEnd; hour++) {
    for (let minute of [0, 30]) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, minute, 0, 0);

      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

      if (slotStart < new Date()) continue;
      if (slotEnd.getHours() > morningEnd || (slotEnd.getHours() === morningEnd && slotEnd.getMinutes() > 0)) continue;

      availableSlots.push({ start: slotStart, end: slotEnd });
    }
  }

  // Genera slot ogni 30 minuti per il pomeriggio (15-18) solo se non è sabato
  if (!isSaturday) {
    for (let hour = afternoonStart; hour < afternoonEnd; hour++) {
      for (let minute of [0, 30]) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        if (slotStart < new Date()) continue;
        if (slotEnd.getHours() > afternoonEnd || (slotEnd.getHours() === afternoonEnd && slotEnd.getMinutes() > 0)) continue;

        availableSlots.push({ start: slotStart, end: slotEnd });
      }
    }
  }

  return availableSlots;
}

export async function createGoogleCalendarEvent(
  summary: string,
  description: string,
  startTime: Date,
  endTime: Date,
  staffEmail: string,
  attendeeEmail?: string
) {
  const ROME_TZ = 'Europe/Rome';

  try {
    const calendar = await getAuthenticatedCalendarClient(staffEmail);
    const calendarId = 'primary';

    const event = {
      summary,
      description,
      start: {
        dateTime: formatInTimeZone(startTime, ROME_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        timeZone: ROME_TZ,
      },
      end: {
        dateTime: formatInTimeZone(endTime, ROME_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        timeZone: ROME_TZ,
      },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 giorno prima
          { method: 'popup', minutes: 60 }, // 1 ora prima
        ],
      },
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: 'none',
    });

    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

export async function updateCalendarEvent(
  eventId: string,
  staffEmail: string,
  summary?: string,
  description?: string,
  startTime?: Date,
  endTime?: Date
) {
  const ROME_TZ = 'Europe/Rome';

  try {
    const calendar = await getAuthenticatedCalendarClient(staffEmail);
    const calendarId = 'primary';

    const event: any = {};
    if (summary) event.summary = summary;
    if (description) event.description = description;
    if (startTime) {
      event.start = {
        dateTime: formatInTimeZone(startTime, ROME_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        timeZone: ROME_TZ,
      };
    }
    if (endTime) {
      event.end = {
        dateTime: formatInTimeZone(endTime, ROME_TZ, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        timeZone: ROME_TZ,
      };
    }

    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: event,
      sendUpdates: 'none',
    });

    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

export async function deleteCalendarEvent(eventId: string, staffEmail: string) {
  try {
    const calendar = await getAuthenticatedCalendarClient(staffEmail);
    const calendarId = 'primary';

    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'none',
    });

    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}
