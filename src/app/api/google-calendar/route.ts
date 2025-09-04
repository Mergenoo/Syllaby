import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface GoogleCalendarResponse {
  message: string;
  eventId?: string;
  eventUrl?: string;
  data?: Record<string, unknown>;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<GoogleCalendarResponse | { error: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { eventData, calendarId } = body;

    if (!eventData || !eventData.title || !eventData.due_date) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: eventData.title and eventData.due_date",
        },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const response = await fetch(
      `${backendUrl}/api/google-calendar/add-to-google-calendar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventData, calendarId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: "Failed to add event to Google Calendar",
          details: errorData.error || errorData.details,
        },
        { status: response.status }
      );
    }

    const data: GoogleCalendarResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding event to Google Calendar:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<Record<string, unknown>>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'calendars' or 'events'
    const calendarId = searchParams.get("calendarId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    let endpoint = "";

    if (type === "calendars") {
      endpoint = `${backendUrl}/api/google-calendar/calendars`;
    } else if (type === "events") {
      if (!startDate || !endDate) {
        return NextResponse.json(
          {
            error: "Missing required parameters: startDate and endDate",
          },
          { status: 400 }
        );
      }
      endpoint = `${backendUrl}/api/google-calendar/events?startDate=${startDate}&endDate=${endDate}${
        calendarId ? `&calendarId=${calendarId}` : ""
      }`;
    } else {
      return NextResponse.json(
        {
          error: "Invalid type parameter. Must be 'calendars' or 'events'",
        },
        { status: 400 }
      );
    }

    const response = await fetch(endpoint, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: "Failed to fetch Google Calendar data",
          details: errorData.error || errorData.details,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Google Calendar data:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
