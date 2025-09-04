"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState(
    "Processing Google Calendar connection..."
  );

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const error = searchParams.get("error");

        console.log("Full authorization code:", code); // Debug log
        console.log("Code length:", code?.length); // Debug log

        if (error) {
          setStatus("error");
          setMessage("Google Calendar connection was cancelled or failed.");
          return;
        }

        if (!code) {
          setStatus("error");
          setMessage("Missing authorization code.");
          return;
        }

        // Get user ID from Supabase
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setStatus("error");
          setMessage("User not authenticated.");
          return;
        }

        // Call backend to exchange code for tokens
        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;
        const response = await fetch(
          `${backendUrl}/api/auth/google/callback?code=${code}&state=${user.id}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to complete OAuth flow");
        }

        const result = await response.json();
        console.log("Result:", result);

        if (result.success) {
          setStatus("success");
          setMessage("Google Calendar connected successfully!");

          // Redirect to the URL provided by the backend
          setTimeout(() => {
            window.location.href = result.redirectUrl;
          }, 2000);
        } else {
          throw new Error(
            result.message || "Failed to connect Google Calendar"
          );
        }
      } catch (error) {
        console.error("OAuth callback error:", error);
        setStatus("error");
        setMessage("Failed to connect Google Calendar. Please try again.");
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
            {status === "loading" && (
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
            )}
            {status === "success" && (
              <svg
                className="h-full w-full text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            {status === "error" && (
              <svg
                className="h-full w-full text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status === "loading" && "Connecting..."}
            {status === "success" && "Success!"}
            {status === "error" && "Error"}
          </h2>

          <p className="text-gray-600">{message}</p>

          {status === "error" && (
            <button
              onClick={() => router.push("/projects")}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Back to Projects
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoogleAuthCallback() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
