import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

export function getGoogleCalendarClient() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + '/api/auth/callback/google'
  );

  // Per ora usiamo un service account o OAuth2 con refresh token
  // In produzione dovresti configurare un service account
  return google.calendar({ version: 'v3', auth });
}

export async function getAvailableSlots(
  date: Date,
  durationMinutes: number,
  staffEmail?: string
) {
  try {
    const calendar = getGoogleCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Recupera eventi esistenti
    const response = await calendar.events.list({
      calendarId,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    // Orario di lavoro: 9:00 - 19:00
    const workStart = 9;
    const workEnd = 19;

    const availableSlots: { start: Date; end: Date }[] = [];

    // Genera slot ogni 30 minuti
    for (let hour = workStart; hour < workEnd; hour++) {
      for (let minute of [0, 30]) {
        const slotStart = new Date(date);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + durationMinutes);

        // Controlla se lo slot è nel futuro
        if (slotStart < new Date()) continue;

        // Controlla se lo slot supera l'orario di lavoro
        if (slotEnd.getHours() >= workEnd) continue;

        // Controlla sovrapposizioni con eventi esistenti
        const hasConflict = events.some(event => {
          const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
          const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');

          return (
            (slotStart >= eventStart && slotStart < eventEnd) ||
            (slotEnd > eventStart && slotEnd <= eventEnd) ||
            (slotStart <= eventStart && slotEnd >= eventEnd)
          );
        });

        if (!hasConflict) {
          availableSlots.push({ start: slotStart, end: slotEnd });
        }
      }
    }

    return availableSlots;
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return [];
  }
}

export async function createCalendarEvent(
  summary: string,
  description: string,
  startTime: Date,
  endTime: Date,
  attendeeEmail?: string
) {
  try {
    const calendar = getGoogleCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

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
      sendUpdates: 'all',
    });

    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

export async function updateCalendarEvent(
  eventId: string,
  summary?: string,
  description?: string,
  startTime?: Date,
  endTime?: Date
) {
  try {
    const calendar = getGoogleCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

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
      sendUpdates: 'all',
    });

    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

export async function deleteCalendarEvent(eventId: string) {
  try {
    const calendar = getGoogleCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    await calendar.events.delete({
      calendarId,
      eventId,
      sendUpdates: 'all',
    });

    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}
