import { CalendarEvent, ExtractedEvent } from "@/types/database";

/**
 * Generate ICS calendar content from calendar events
 * @param events Array of calendar events
 * @param calendarName Name for the calendar
 * @returns ICS formatted string
 */
export function generateICSContent(
  events: CalendarEvent[],
  calendarName: string = "Law Bandit Calendar"
): string {
  const now = new Date();
  const calendarId = `law-bandit-${now.getTime()}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Law Bandit//Syllabus Calendar//EN",
    `X-WR-CALNAME:${calendarName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((event, index) => {
    const eventId = `${calendarId}-event-${index}`;
    const startDate = new Date(event.due_date);

    // Format date as YYYYMMDD
    const dateStr = startDate.toISOString().slice(0, 10).replace(/-/g, "");

    // Format time if available (HHMMSS)
    let timeStr = "";
    if (event.due_time) {
      timeStr = event.due_time.replace(/:/g, "") + "00";
    }

    // Create event entry
    ics.push(
      "BEGIN:VEVENT",
      `UID:${eventId}`,
      `DTSTAMP:${now.toISOString().slice(0, 15).replace(/[-:]/g, "")}Z`,
      `DTSTART:${dateStr}${timeStr ? "T" + timeStr + "Z" : ""}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description || event.title}`,
      `CATEGORIES:${event.event_type}`,
      "END:VEVENT"
    );
  });

  ics.push("END:VCALENDAR");

  return ics.join("\r\n");
}

/**
 * Download ICS file
 * @param icsContent ICS calendar content
 * @param filename Filename for download
 */
export function downloadICSFile(
  icsContent: string,
  filename: string = "calendar.ics"
): void {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Convert ExtractedEvent to CalendarEvent format
 * @param extractedEvent Extracted event from LLM
 * @param classId Class ID
 * @param userId User ID
 * @param syllabusId Syllabus ID (optional)
 * @returns CalendarEvent insert object
 */
export function convertToCalendarEvent(
  extractedEvent: ExtractedEvent,
  classId: string,
  userId: string,
  syllabusId?: string
): Omit<CalendarEvent, "id" | "created_at" | "updated_at"> {
  return {
    syllabus_id: syllabusId || null,
    class_id: classId,
    user_id: userId,
    title: extractedEvent.title,
    description: extractedEvent.description || null,
    event_type: extractedEvent.eventType,
    due_date: extractedEvent.dueDate,
    due_time: extractedEvent.dueTime || null,
    confidence_score: extractedEvent.confidenceScore,
    source_text: extractedEvent.sourceText,
    extraction_method: "llm",
    is_exported: false,
    exported_at: null,
    ics_uid: null,
  };
}

/**
 * Format date for display
 * @param dateString ISO date string
 * @param includeTime Whether to include time
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  includeTime: boolean = false
): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return date.toLocaleDateString("en-US", options);
}

/**
 * Get event type display name
 * @param eventType Event type
 * @returns Display name
 */
export function getEventTypeDisplayName(eventType: string): string {
  const displayNames: Record<string, string> = {
    assignment: "Assignment",
    exam: "Exam",
    quiz: "Quiz",
    project: "Project",
    deadline: "Deadline",
  };

  return displayNames[eventType] || eventType;
}

/**
 * Get confidence score color
 * @param score Confidence score (0-1)
 * @returns Tailwind CSS color class
 */
export function getConfidenceColor(score: number): string {
  if (score >= 0.8) return "text-green-600";
  if (score >= 0.6) return "text-yellow-600";
  return "text-red-600";
}

/**
 * Validate date string
 * @param dateString Date string to validate
 * @returns Whether date is valid
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Parse time string to 24-hour format
 * @param timeString Time string (e.g., "2:30 PM")
 * @returns Time in HH:MM format
 */
export function parseTimeString(timeString: string): string | null {
  try {
    const date = new Date(`2000-01-01 ${timeString}`);
    if (isNaN(date.getTime())) return null;

    return date.toTimeString().slice(0, 5);
  } catch {
    return null;
  }
}
