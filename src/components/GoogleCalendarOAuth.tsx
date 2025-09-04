"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

interface GoogleCalendarOAuthProps {
  classId: string;
}

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

export default function GoogleCalendarOAuth({
  classId,
}: GoogleCalendarOAuthProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<
    Array<{ id: string; summary: string; primary: boolean }>
  >([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>("");
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        console.log("User ID:", user.id);

        // Check if user has Google Calendar connected
        const { data: tokenData, error: tokenError } = await supabase
          .from("google_calendar_tokens")
          .select("email")
          .eq("user_id", user.id)
          .single();

        console.log("Token data:", tokenData);
        console.log("Token error:", tokenError);

        if (tokenError) {
          console.error(
            "Error checking Google Calendar connection:",
            tokenError
          );
          // Don't set error state here as this is just a check
          return;
        }

        if (tokenData) {
          setIsConnected(true);
          setUserEmail(tokenData.email);
        }
      }
    } catch (error) {
      console.error("Error checking connection status:", error);
    }
  };

  const openModal = async () => {
    setIsOpen(true);
    setError(null);
    setSuccess(null);

    if (!isConnected) {
      // Start OAuth flow
      await startOAuthFlow();
    } else {
      // Load calendars
      await loadCalendars();
    }
  };

  const startOAuthFlow = async () => {
    if (!userId) {
      setError("User not authenticated");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Starting OAuth flow for user:", userId);

      // Get OAuth URL from backend
      const response = await fetch(
        `/api/auth/google?type=auth-url&user_id=${userId}`
      );
      const data = await response.json();
      console.log("OAuth URL response:", data);

      if (response.ok) {
        // Redirect to Google OAuth
        console.log("Redirecting to Google OAuth:", data.authUrl);
        window.location.href = data.authUrl;
      } else {
        setError(data.error || "Failed to start OAuth flow");
      }
    } catch (error) {
      setError("Failed to start OAuth flow");
      console.error("OAuth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCalendars = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/auth/google?type=calendars&user_id=${userId}`
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
      setIsLoading(false);
    }
  };

  const loadGoogleEvents = async () => {
    if (!selectedCalendarId || !userId) return;

    try {
      setIsLoading(true);
      setError(null);

      const startDate = new Date().toISOString();
      const endDate = new Date(
        Date.now() + 6 * 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await fetch(
        `/api/auth/google?type=events&user_id=${userId}&calendarId=${selectedCalendarId}&startDate=${startDate}&endDate=${endDate}`
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
      setIsLoading(false);
    }
  };

  const importEvents = async () => {
    if (!selectedCalendarId || googleEvents.length === 0 || !userId) return;

    try {
      setIsLoading(true);
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
        class_id: classId === "global" ? null : classId, // Handle global case
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
      setIsLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);

      // Remove tokens from database
      const { error } = await supabase
        .from("google_calendar_tokens")
        .delete()
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      setIsConnected(false);
      setUserEmail(null);
      setCalendars([]);
      setSuccess("Google Calendar disconnected successfully");
    } catch (error) {
      setError("Failed to disconnect Google Calendar");
      console.error("Error disconnecting:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsOpen(false);
    setCalendars([]);
    setSelectedCalendarId("");
    setGoogleEvents([]);
    setError(null);
    setSuccess(null);
  };

  return (
    <>
      <button
        onClick={openModal}
        className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
          isConnected
            ? "border-green-300 text-green-700 bg-green-50 hover:bg-green-100"
            : "border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
        }`}
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {isConnected
          ? "Google Calendar Connected"
          : classId === "global"
          ? "Sync Google Calendar"
          : "Connect Google Calendar"}
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isConnected
                    ? "Google Calendar Connected"
                    : "Connect to Google Calendar"}
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
              {isLoading && !isConnected ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">
                    Connecting to Google Calendar...
                  </p>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
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
              ) : !isConnected ? (
                <div className="text-center py-8">
                  <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                    <svg
                      className="h-full w-full"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">
                    Connect Your Google Calendar
                  </h4>
                  <p className="text-gray-600 mb-6">
                    Connect your Google Calendar to import events and sync your
                    class schedule.
                  </p>
                  <button
                    onClick={startOAuthFlow}
                    disabled={isLoading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Connecting..." : "Connect Google Calendar"}
                  </button>
                </div>
              ) : (
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
                          onChange={(e) =>
                            setSelectedCalendarId(e.target.value)
                          }
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
                          disabled={!selectedCalendarId || isLoading}
                          className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                          {isLoading ? "Loading..." : "Load Events"}
                        </button>
                      </div>
                    ) : (
                      <p className="text-gray-600">
                        No Google Calendars found.
                      </p>
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
                                ? new Date(
                                    event.start.dateTime
                                  ).toLocaleString()
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
                        disabled={isLoading}
                        className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isLoading
                          ? "Importing..."
                          : `Import ${googleEvents.length} Events`}
                      </button>
                    </div>
                  )}

                  {/* Disconnect Option */}
                  <div className="border-t pt-4">
                    <button
                      onClick={disconnectGoogleCalendar}
                      disabled={isLoading}
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
                      <li>
                        • Select your Google Calendar to import events from
                      </li>
                      <li>• Events from the next 6 months will be loaded</li>
                      <li>
                        • Review the events and import them to your class
                        calendar
                      </li>
                      <li>
                        • You can also add your class events to Google Calendar
                        from the calendar view
                      </li>
                    </ul>
                  </div>
                </div>
              )}
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
