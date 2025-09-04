"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

export default function GoogleCalendarIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const supabase = createClient();
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;

  // Get current user on component mount
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        checkConnectionStatus(user.id);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkConnectionStatus(session.user.id);
      } else {
        setIsConnected(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkConnectionStatus = async (userId: string) => {
    try {
      const response = await fetch(
        `${backendUrl}/api/google-calendar/connection-status/${userId}`
      );

      if (response.ok) {
        const status = await response.json();
        setIsConnected(status.connected);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error("Error checking connection status:", error);
      setIsConnected(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get OAuth URL
      const response = await fetch(`${backendUrl}/api/auth/google/url`);
      if (!response.ok) {
        throw new Error("Failed to get OAuth URL");
      }

      const { authUrl } = await response.json();

      // Redirect to Google OAuth with user ID as state
      const oauthUrl = `${authUrl}&state=${user.id}`;
      window.location.href = oauthUrl;
    } catch (error) {
      console.error("Error connecting to Google Calendar:", error);
      alert("Failed to connect to Google Calendar");
    } finally {
      setLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(
        `${backendUrl}/api/auth/google/disconnect/${user.id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setIsConnected(false);
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting from Google Calendar:", error);
      alert("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <button
      onClick={isConnected ? disconnectGoogleCalendar : connectGoogleCalendar}
      disabled={loading}
      className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
        isConnected
          ? "bg-red-600 hover:bg-red-700 disabled:bg-red-400"
          : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
      }`}
    >
      {loading
        ? isConnected
          ? "Disconnecting..."
          : "Connecting..."
        : isConnected
        ? "Disconnect Google Calendar"
        : "Connect Google Calendar"}
    </button>
  );
}
