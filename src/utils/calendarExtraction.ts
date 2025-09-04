interface CalendarEvent {
  title: string;
  description: string | null;
  event_type: "assignment" | "exam" | "reading" | "other";
  due_date: string;
  due_time: string | null;
  confidence_score: number;
  source_text: string | null;
}

interface ExtractionResponse {
  message: string;
  events: CalendarEvent[];
  count: number;
}

export async function extractCalendarEvents(
  pdfContext: string
): Promise<ExtractionResponse> {
  const response = await fetch("/api/calendar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pdf_context: pdfContext }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to extract calendar events");
  }

  return response.json();
}

export type { CalendarEvent, ExtractionResponse };
