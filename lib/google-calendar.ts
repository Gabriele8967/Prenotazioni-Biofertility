import { google } from 'googleapis';
import { db } from './db';

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
  durationMinutes: number,
  staffEmail?: string
) {
  try {
    if (!staffEmail) {
      throw new Error('Staff email is required');
    }

    const calendar = await getAuthenticatedCalendarClient(staffEmail);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Usa l'API freebusy per ottenere gli intervalli occupati
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDay.toISOString(),
        timeMax: endOfDay.toISOString(),
        items: [{ id: 'primary' }], // Calendario primario dello staff
      },
    });

    const busySlots = response.data.calendars?.primary?.busy || [];

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

        // Controlla se lo slot è nel futuro
        if (slotStart < new Date()) continue;

        // Controlla se lo slot supera l'orario di lavoro mattutino
        if (slotEnd.getHours() > morningEnd || (slotEnd.getHours() === morningEnd && slotEnd.getMinutes() > 0)) continue;

        // Controlla sovrapposizioni con intervalli occupati
        const hasConflict = busySlots.some((busy) => {
          const busyStart = new Date(busy.start!);
          const busyEnd = new Date(busy.end!);

          return (
            (slotStart >= busyStart && slotStart < busyEnd) ||
            (slotEnd > busyStart && slotEnd <= busyEnd) ||
            (slotStart <= busyStart && slotEnd >= busyEnd)
          );
        });

        if (!hasConflict) {
          availableSlots.push({ start: slotStart, end: slotEnd });
        }
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

          // Controlla se lo slot è nel futuro
          if (slotStart < new Date()) continue;

          // Controlla se lo slot supera l'orario di lavoro pomeridiano
          if (slotEnd.getHours() > afternoonEnd || (slotEnd.getHours() === afternoonEnd && slotEnd.getMinutes() > 0)) continue;

          // Controlla sovrapposizioni con intervalli occupati
          const hasConflict = busySlots.some((busy) => {
            const busyStart = new Date(busy.start!);
            const busyEnd = new Date(busy.end!);

            return (
              (slotStart >= busyStart && slotStart < busyEnd) ||
              (slotEnd > busyStart && slotEnd <= busyEnd) ||
              (slotStart <= busyStart && slotEnd >= busyEnd)
            );
          });

          if (!hasConflict) {
            availableSlots.push({ start: slotStart, end: slotEnd });
          }
        }
      }
    }

    return availableSlots;
  } catch (error) {
    console.error('Error fetching available slots:', error);
    // Se lo staff non è autenticato, restituisci comunque degli slot disponibili
    // basati solo sull'orario di lavoro
    return generateDefaultSlots(date, durationMinutes);
  }
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

export async function createCalendarEvent(
  summary: string,
  description: string,
  startTime: Date,
  endTime: Date,
  staffEmail: string,
  attendeeEmail?: string
) {
  try {
    const calendar = await getAuthenticatedCalendarClient(staffEmail);
    const calendarId = 'primary';

    const event = {
      summary,
      description,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Rome',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Rome',
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
  try {
    const calendar = await getAuthenticatedCalendarClient(staffEmail);
    const calendarId = 'primary';

    const event: any = {};
    if (summary) event.summary = summary;
    if (description) event.description = description;
    if (startTime) {
      event.start = {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Rome',
      };
    }
    if (endTime) {
      event.end = {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Rome',
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
