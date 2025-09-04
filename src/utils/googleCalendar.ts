interface GoogleCalendarEvent {
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
}

interface GoogleCalendarResponse {
  message: string;
  eventId?: string;
  eventUrl?: string;
  data?: Record<string, unknown>;
}

interface CalendarListResponse {
  message: string;
  calendars: Array<{
    id: string;
    summary: string;
    primary: boolean;
  }>;
}

interface EventsResponse {
  message: string;
  events: Array<{
    id: string;
    summary: string;
    description?: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
    location?: string;
    status?: string;
  }>;
}

export async function addEventToGoogleCalendar(
  eventData: GoogleCalendarEvent,
  calendarId?: string
): Promise<GoogleCalendarResponse> {
  const response = await fetch("/api/google-calendar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventData, calendarId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error ||
        errorData.details ||
        "Failed to add event to Google Calendar"
    );
  }

  return response.json();
}

export async function getGoogleCalendars(): Promise<CalendarListResponse> {
  const response = await fetch("/api/google-calendar?type=calendars", {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || errorData.details || "Failed to fetch calendars"
    );
  }

  return response.json();
}

export async function getGoogleCalendarEvents(
  startDate: string,
  endDate: string,
  calendarId?: string
): Promise<EventsResponse> {
  const params = new URLSearchParams({
    type: "events",
    startDate,
    endDate,
  });

  if (calendarId) {
    params.append("calendarId", calendarId);
  }

  const response = await fetch(`/api/google-calendar?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || errorData.details || "Failed to fetch events"
    );
  }

  return response.json();
}

export type {
  GoogleCalendarEvent,
  GoogleCalendarResponse,
  CalendarListResponse,
  EventsResponse,
};
