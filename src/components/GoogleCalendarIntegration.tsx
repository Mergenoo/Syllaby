"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface GoogleCalendarOAuthProps {
  classId?: string;
}

export default function GoogleCalendarIntegration({
  classId, // TODO: Use classId for class-specific calendar sync
}: GoogleCalendarOAuthProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<
    Array<{ id: string; summary: string; primary: boolean }>
  >([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const checkConnectionStatus = useCallback(
    async (userId: string) => {
      try {
        const response = await fetch(
          `/api/google-calendar/connection-status/${userId}`
        );

        if (response.ok) {
          const status = await response.json();
          setIsConnected(status.connected);

          if (status.connected) {
            const { data: tokenData } = await supabase
              .from("google_calendar_tokens")
              .select("email")
              .eq("user_id", userId)
              .single();

            if (tokenData) {
              setUserEmail(tokenData.email);
            }
          }
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error("Error checking connection status:", error);
        setIsConnected(false);
      }
    },
    [supabase]
  );

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
  }, [checkConnectionStatus, supabase.auth]);

  const connectGoogleCalendar = async () => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(
        `/api/auth/google?type=auth-url&user_id=${user.id}`
      );
      if (!response.ok) {
        throw new Error("Failed to get OAuth URL");
      }

      const { authUrl } = await response.json();

      const oauthUrl = `${authUrl}&state=${user.id}`;
      window.location.href = oauthUrl;
    } catch (error) {
      console.error("Error connecting to Google Calendar:", error);
      setError("Failed to connect to Google Calendar");
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

      const response = await fetch(`/api/auth/google/disconnect/${user.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setIsConnected(false);
        setUserEmail(null);
        setSuccess("Google Calendar disconnected successfully");
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting from Google Calendar:", error);
      setError("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendars = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/google-calendar/calendars/${user.id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch calendars");
      }

      const data = await response.json();
      setCalendars(data.calendars || []);

      if (data.calendars && data.calendars.length > 0) {
        const primaryCalendar = data.calendars.find(
          (cal: { id: string; summary: string; primary: boolean }) =>
            cal.primary
        );
        setSelectedCalendarId(primaryCalendar?.id || data.calendars[0].id);
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to fetch calendars"
      );
      console.error("Error fetching calendars:", error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = async () => {
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);

    if (isConnected) {
      await fetchCalendars();
    }
  };

  const syncEvents = async (options = {}) => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/google-calendar/sync-events/${user.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calendarId: selectedCalendarId,
            ...options,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to sync events");
      }

      const result = await response.json();
      setSuccess(
        `Successfully synced events from Google Calendar! ${
          result.message || ""
        }`
      );

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to sync events"
      );
      console.error("Error syncing events:", error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCalendars([]);
    setSelectedCalendarId("");
    setError(null);
    setSuccess(null);
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <button
        onClick={isConnected ? openModal : connectGoogleCalendar}
        disabled={loading}
        className={`px-4 py-2 rounded-md text-white font-medium transition-colors cursor-pointer ${
          isConnected
            ? "bg-black hover:bg-black/90 disabled:bg-black/50"
            : "bg-black hover:bg-black/90 disabled:bg-black/50"
        }`}
      >
        {loading
          ? isConnected
            ? "Loading..."
            : "Connecting..."
          : isConnected
          ? "Import from Google Calendar"
          : "Connect Google Calendar"}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-black rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-black">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-black">
                  Google Calendar Integration
                </h3>
                <button
                  onClick={closeModal}
                  className="text-black/60 hover:text-black cursor-pointer"
                >
                  <svg
                    className="w-6 h-6"
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
                </button>
              </div>
              {isConnected && userEmail && (
                <p className="text-sm text-black/60 mt-2">
                  Connected as: {userEmail}
                </p>
              )}
            </div>

            <div className="p-6">
              {error ? (
                <div className="bg-white border border-black rounded-md p-4 mb-4">
                  <div className="flex">
                    <svg
                      className="w-5 h-5 text-black/60"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="ml-3">
                      <p className="text-sm text-black">{error}</p>
                    </div>
                  </div>
                </div>
              ) : success ? (
                <div className="bg-white border border-black rounded-md p-4 mb-4">
                  <div className="flex">
                    <svg
                      className="w-5 h-5 text-black/60"
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
                    <div className="ml-3">
                      <p className="text-sm text-black">{success}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-medium text-black mb-3">
                    Step 1: Select Google Calendar
                  </h4>
                  {calendars.length > 0 ? (
                    <div>
                      <div className="mb-3">
                        <label className="block text-sm font-medium text-black mb-2">
                          Choose which calendar to sync with:
                        </label>
                        <select
                          value={selectedCalendarId}
                          onChange={(e) =>
                            setSelectedCalendarId(e.target.value)
                          }
                          className="w-full p-3 border border-black rounded-md focus:outline-none focus:border-black cursor-pointer bg-white text-black"
                        >
                          {calendars.map((calendar) => (
                            <option key={calendar.id} value={calendar.id}>
                              {calendar.summary}{" "}
                              {calendar.primary ? "(Primary)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-3">
                        <button
                          onClick={() =>
                            syncEvents({
                              syncAll: true,
                            })
                          }
                          disabled={!selectedCalendarId || loading}
                          className="w-full px-4 py-2 bg-black text-white rounded-md hover:bg-black/90 disabled:bg-black/50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                        >
                          {loading ? "Syncing..." : "Sync Selected Calendar"}
                        </button>
                        <p className="text-sm text-black/60 text-center">
                          This will sync all events from your selected Google
                          Calendar to your class calendar.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-black/40 mb-2">
                        <svg
                          className="w-12 h-12 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p className="text-black/60 mb-4">
                        No Google Calendars found.
                      </p>
                      <button
                        onClick={fetchCalendars}
                        disabled={loading}
                        className="px-4 py-2 bg-black text-white rounded-md hover:bg-black/90 disabled:bg-black/50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        {loading ? "Loading..." : "Refresh Calendars"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="border-t border-black pt-4">
                  <button
                    onClick={disconnectGoogleCalendar}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-black text-white rounded-md hover:bg-black/90 disabled:bg-black/50 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    Disconnect Google Calendar
                  </button>
                </div>

                <div className="bg-white border border-black rounded-md p-4">
                  <h4 className="text-sm font-medium text-black mb-2">
                    How it works:
                  </h4>
                  <ul className="text-sm text-black/60 space-y-1">
                    <li>• Select your Google Calendar to sync events from</li>
                    <li>
                      • Click &quot;Sync Selected Calendar&quot; to import all
                      events
                    </li>
                    <li>
                      • Events will be automatically added to your class
                      calendar
                    </li>
                    <li>
                      • You can also add your class events to Google Calendar
                      from the calendar view
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-black">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 bg-black text-white rounded-md hover:bg-black/90 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
