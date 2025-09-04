import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
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
    const type = searchParams.get("type");
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";

    if (type === "auth-url") {
      // Get OAuth URL
      const response = await fetch(
        `${backendUrl}/api/auth/google/auth-url?user_id=${userId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          {
            error: "Failed to generate OAuth URL",
            details: errorData.error || errorData.details,
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } else if (type === "calendars") {
      // Get user's calendars
      const response = await fetch(
        `${backendUrl}/api/auth/google/calendars?user_id=${userId}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          {
            error: "Failed to retrieve calendars",
            details: errorData.error || errorData.details,
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    } else if (type === "events") {
      // Get events from user's calendar
      const calendarId = searchParams.get("calendarId");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");

      if (!calendarId || !startDate || !endDate) {
        return NextResponse.json(
          {
            error: "Calendar ID, start date, and end date are required",
          },
          { status: 400 }
        );
      }

      const response = await fetch(
        `${backendUrl}/api/auth/google/events?user_id=${userId}&calendarId=${calendarId}&startDate=${startDate}&endDate=${endDate}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          {
            error: "Failed to retrieve events",
            details: errorData.error || errorData.details,
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: "Invalid request type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error in Google OAuth API:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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
    const { user_id, eventData, calendarId } = body;

    if (!user_id || !eventData) {
      return NextResponse.json(
        {
          error: "User ID and event data are required",
        },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/api/auth/google/add-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, eventData, calendarId }),
    });

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

    const data = await response.json();
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
