import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

import { CalendarEvent } from "@/types/database";

interface ImportEvent {
  title: string;
  description?: string;
  due_date: string;
  due_time?: string;
  event_type: string;
  class_id: string;
  source_text: string;
  extraction_method: string;
}

interface ImportRequest {
  events: ImportEvent[];
  classId: string;
}

interface ImportResponse {
  message: string;
  importedCount: number;
  events: CalendarEvent[];
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<ImportResponse | { error: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ImportRequest = await request.json();
    const { events, classId } = body;

    if (!events || !Array.isArray(events) || !classId) {
      return NextResponse.json(
        {
          error: "Missing required fields: events array and classId",
        },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const response = await fetch(
      `${backendUrl}/api/calendar/import-from-google`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events, classId }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: "Failed to import events from Google Calendar",
          details: errorData.error || errorData.details,
        },
        { status: response.status }
      );
    }

    const data: ImportResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error importing events from Google Calendar:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
