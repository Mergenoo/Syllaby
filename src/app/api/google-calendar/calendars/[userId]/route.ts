import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const buildApiUrl = (baseUrl: string, endpoint: string): string => {
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const cleanEndpoint = endpoint.replace(/^\//, "");
  return `${cleanBaseUrl}/${cleanEndpoint}`;
};

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
}

interface CalendarsResponse {
  calendars: Calendar[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse<CalendarsResponse | { error: string }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.BACKEND_URL || "https://law-bandit-back.vercel.app";
    const endpoint = buildApiUrl(
      backendUrl,
      `api/google-calendar/calendars/${userId}`
    );

    const response = await fetch(endpoint, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: "Failed to fetch Google Calendars",
          details: errorData.error || errorData.details,
        },
        { status: response.status }
      );
    }

    const data: CalendarsResponse = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching Google Calendars:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
