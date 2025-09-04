import { CalendarEvent, ExtractedEvent } from "@/types/database";

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

    const dateStr = startDate.toISOString().slice(0, 10).replace(/-/g, "");

    let timeStr = "";
    if (event.due_time) {
      timeStr = event.due_time.replace(/:/g, "") + "00";
    }

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

export function getConfidenceColor(score: number): string {
  if (score >= 0.8) return "text-green-600";
  if (score >= 0.6) return "text-yellow-600";
  return "text-red-600";
}

export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function parseTimeString(timeString: string): string | null {
  try {
    const date = new Date(`2000-01-01 ${timeString}`);
    if (isNaN(date.getTime())) return null;

    return date.toTimeString().slice(0, 5);
  } catch {
    return null;
  }
}
