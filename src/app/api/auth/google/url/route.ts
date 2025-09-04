import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Helper function to ensure proper URL construction
const buildApiUrl = (baseUrl: string, endpoint: string): string => {
  const cleanBaseUrl = baseUrl.replace(/\/$/, ""); // Remove trailing slash
  const cleanEndpoint = endpoint.replace(/^\//, ""); // Remove leading slash
  return `${cleanBaseUrl}/${cleanEndpoint}`;
};

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

    // Call backend to get OAuth URL
    const backendUrl = process.env.BACKEND_URL || "https://law-bandit-back.vercel.app";
    const response = await fetch(
      buildApiUrl(backendUrl, "api/auth/google/url")
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: "Failed to get OAuth URL",
          details: errorData.error || errorData.details,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error getting OAuth URL:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
