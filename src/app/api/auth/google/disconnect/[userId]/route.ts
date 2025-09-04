import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const buildApiUrl = (baseUrl: string, endpoint: string): string => {
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const cleanEndpoint = endpoint.replace(/^\//, "");
  return `${cleanBaseUrl}/${cleanEndpoint}`;
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
): Promise<NextResponse> {
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

    const backendUrl =
      process.env.BACKEND_URL || "https://law-bandit-back.vercel.app";
    const response = await fetch(
      buildApiUrl(backendUrl, `api/auth/google/disconnect/${userId}`),
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error: "Failed to disconnect",
          details: errorData.error || errorData.details,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error disconnecting:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}
