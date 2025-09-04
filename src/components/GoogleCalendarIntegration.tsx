"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    date?: string;
  };
  end: {
    dateTime: string;
    date?: string;
  };
}

interface GoogleCalendarOAuthProps {
  classId?: string;
}

export default function GoogleCalendarIntegration({
  classId,
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
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
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

          // If connected, get user email
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
  }, [checkConnectionStatus]);

  const connectGoogleCalendar = async () => {
    try {
      setLoading(true);

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get OAuth URL
      const response = await fetch("/api/auth/google/url");
      if (!response.ok) {
        throw new Error("Failed to get OAuth URL");
      }

      const { authUrl } = await response.json();

      // Redirect to Google OAuth with user ID as state
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

  const openModal = async () => {
    setIsModalOpen(true);
    setError(null);
    setSuccess(null);

    if (isConnected) {
      await loadCalendars();
    }
  };

  const loadCalendars = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/auth/google?type=calendars&user_id=${user.id}`
      );
      const data = await response.json();

      if (response.ok) {
        setCalendars(data.calendars);
        if (data.calendars.length > 0) {
          const primaryCalendar = data.calendars.find(
            (cal: { primary?: boolean }) => cal.primary
          );
          setSelectedCalendarId(
            primaryCalendar ? primaryCalendar.id : data.calendars[0].id
          );
        }
      } else {
        setError(data.error || "Failed to load calendars");
      }
    } catch (error) {
      setError("Failed to load calendars");
      console.error("Error loading calendars:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadGoogleEvents = async () => {
    if (!selectedCalendarId || !user) return;

    try {
      setLoading(true);
      setError(null);

      const startDate = new Date().toISOString();
      const endDate = new Date(
        Date.now() + 6 * 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await fetch(
        `/api/auth/google?type=events&user_id=${user.id}&calendarId=${selectedCalendarId}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();

      if (response.ok) {
        setGoogleEvents(data.events || []);
      } else {
        setError(data.error || "Failed to load events");
      }
    } catch (error) {
      setError("Failed to load events");
      console.error("Error loading events:", error);
    } finally {
      setLoading(false);
    }
  };

  const importEvents = async () => {
    if (!selectedCalendarId || googleEvents.length === 0 || !user) return;

    try {
      setLoading(true);
      setError(null);

      const eventsToImport = googleEvents.map((event) => ({
        title: event.summary,
        description: event.description || "",
        due_date: event.start.dateTime
          ? new Date(event.start.dateTime).toISOString().split("T")[0]
          : event.start.date,
        due_time: event.start.dateTime
          ? new Date(event.start.dateTime).toTimeString().split(" ")[0]
          : null,
        event_type: "other",
        class_id: classId === "global" ? null : classId,
        source_text: `Imported from Google Calendar: ${event.summary}`,
        extraction_method: "google_calendar_import",
      }));

      const response = await fetch("/api/calendar/import-from-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: eventsToImport,
          classId: classId === "global" ? null : classId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to import events");
      }

      const result = await response.json();
      setSuccess(
        `Successfully imported ${result.importedCount} events from Google Calendar!`
      );

      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to import events"
      );
      console.error("Error importing events:", error);
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCalendars([]);
    setSelectedCalendarId("");
    setGoogleEvents([]);
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
        className={`px-4 py-2 rounded-md text-white font-medium transition-colors ${
          isConnected
            ? "bg-green-600 hover:bg-green-700 disabled:bg-green-400"
            : "bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Google Calendar Integration
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
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
                <p className="text-sm text-gray-600 mt-2">
                  Connected as: {userEmail}
                </p>
              )}
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {error ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <svg
                      className="w-5 h-5 text-red-400"
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
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              ) : success ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                  <div className="flex">
                    <svg
                      className="w-5 h-5 text-green-400"
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
                      <p className="text-sm text-green-800">{success}</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-6">
                {/* Step 1: Select Calendar */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Step 1: Select Google Calendar
                  </h4>
                  {calendars.length > 0 ? (
                    <div>
                      <select
                        value={selectedCalendarId}
                        onChange={(e) => setSelectedCalendarId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-md"
                      >
                        {calendars.map((calendar) => (
                          <option key={calendar.id} value={calendar.id}>
                            {calendar.summary}{" "}
                            {calendar.primary ? "(Primary)" : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={loadGoogleEvents}
                        disabled={!selectedCalendarId || loading}
                        className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {loading ? "Loading..." : "Load Events"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-600">No Google Calendars found.</p>
                  )}
                </div>

                {/* Step 2: Review Events */}
                {googleEvents.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-3">
                      Step 2: Review Events ({googleEvents.length} found)
                    </h4>
                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                      {googleEvents.map((event, index) => (
                        <div
                          key={index}
                          className="p-3 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">
                            {event.summary}
                          </div>
                          <div className="text-sm text-gray-600">
                            {event.start.dateTime
                              ? new Date(event.start.dateTime).toLocaleString()
                              : event.start.date}
                          </div>
                          {event.description && (
                            <div className="text-sm text-gray-500 mt-1">
                              {event.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={importEvents}
                      disabled={loading}
                      className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading
                        ? "Importing..."
                        : `Import ${googleEvents.length} Events`}
                    </button>
                  </div>
                )}

                {/* Disconnect Option */}
                <div className="border-t pt-4">
                  <button
                    onClick={disconnectGoogleCalendar}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Disconnect Google Calendar
                  </button>
                </div>

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    How it works:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Select your Google Calendar to import events from</li>
                    <li>• Events from the next 6 months will be loaded</li>
                    <li>
                      • Review the events and import them to your class calendar
                    </li>
                    <li>
                      • You can also add your class events to Google Calendar
                      from the calendar view
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
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
