"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

export default function TestGoogleCalendar() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const supabase = createClient();
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const testBackendConnection = async () => {
    try {
      setLoading(true);
      setStatus("Testing backend connection...");

      const response = await fetch(`${backendUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        setStatus(`Backend is running! Status: ${data.status}`);
      } else {
        setStatus("Backend connection failed");
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testGoogleAuthUrl = async () => {
    try {
      setLoading(true);
      setStatus("Testing Google OAuth URL generation...");

      const response = await fetch(`${backendUrl}/api/auth/google/url`);
      if (response.ok) {
        const data = await response.json();
        setStatus(
          `OAuth URL generated successfully! URL: ${data.authUrl.substring(
            0,
            50
          )}...`
        );
      } else {
        setStatus("Failed to generate OAuth URL");
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testSupabaseConnection = async () => {
    try {
      setLoading(true);
      setStatus("Testing Supabase connection...");

      const response = await fetch(`${backendUrl}/api/auth/test-supabase`);
      if (response.ok) {
        const data = await response.json();
        setStatus(`Supabase connection: ${data.message}`);
      } else {
        const errorData = await response.json();
        setStatus(`Supabase connection failed: ${errorData.error}`);
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testConnectionStatus = async () => {
    if (!user) {
      setStatus("No user logged in");
      return;
    }

    try {
      setLoading(true);
      setStatus("Testing connection status...");

      const response = await fetch(
        `${backendUrl}/api/google-calendar/connection-status/${user.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setStatus(
          `Connection status: ${data.connected ? "Connected" : "Not Connected"}`
        );
      } else {
        setStatus("Failed to get connection status");
      }
    } catch (error) {
      setStatus(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Google Calendar Integration Test
        </h1>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Backend Connection Test
          </h2>

          <div className="space-y-4">
            <div>
              <p className="text-gray-600 mb-2">
                Backend URL:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {backendUrl}
                </code>
              </p>
              <p className="text-gray-600 mb-2">
                User:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {user ? user.email : "Not logged in"}
                </code>
              </p>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={testBackendConnection}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Testing..." : "Test Backend Connection"}
              </button>

              <button
                onClick={testSupabaseConnection}
                disabled={loading}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading ? "Testing..." : "Test Supabase"}
              </button>

              <button
                onClick={testGoogleAuthUrl}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Testing..." : "Test OAuth URL"}
              </button>

              <button
                onClick={testConnectionStatus}
                disabled={loading || !user}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? "Testing..." : "Test Connection Status"}
              </button>
            </div>

            {status && (
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-gray-800">{status}</p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Next Steps
            </h2>
            <div className="space-y-2 text-gray-600">
              <p>1. Make sure the backend server is running on port 3001</p>
              <p>2. Test the backend connection above</p>
              <p>
                3. Navigate to{" "}
                <a
                  href="/google-calendar"
                  className="text-blue-600 hover:underline"
                >
                  Google Calendar Integration
                </a>
              </p>
              <p>
                4. Click &quot;Connect Google Calendar&quot; to start the OAuth
                flow
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
