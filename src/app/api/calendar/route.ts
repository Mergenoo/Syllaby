import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

export async function POST(
  request: NextRequest
): Promise<NextResponse<ExtractionResponse | { error: string }>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { pdf_context } = body;

    if (!pdf_context) {
      return NextResponse.json(
        { error: "Missing required field: pdf_context" },
        { status: 400 }
      );
    }

    // Call backend calendar extraction API
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3001";
    const response = await fetch(`${backendUrl}/api/calendar/extract-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pdf_context }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend API error:", errorData);
      return NextResponse.json(
        { error: errorData.error || "Failed to extract calendar events" },
        { status: response.status }
      );
    }

    const data: ExtractionResponse = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Calendar extraction error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
