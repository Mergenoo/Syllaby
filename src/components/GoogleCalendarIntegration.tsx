"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  htmlLink?: string;
}

interface Calendar {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
}

interface ConnectionStatus {
  connected: boolean;
  lastSync?: string;
  needsRefresh?: boolean;
}

export default function GoogleCalendarIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus | null>(null);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState<string>("primary");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState<number>(0);
  const [user, setUser] = useState<User | null>(null);

  const supabase = createClient();
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL;

  const checkConnectionStatus = useCallback(
    async (userId: string) => {
      try {
        setLoading(true);
        const response = await fetch(
          `${backendUrl}/api/google-calendar/connection-status/${userId}`
        );

        if (response.ok) {
          const status = await response.json();
          setConnectionStatus(status);
          setIsConnected(status.connected);
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        console.error("Error checking connection status:", error);
        setIsConnected(false);
      } finally {
        setLoading(false);
      }
    },
    [backendUrl]
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
        setConnectionStatus(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkConnectionStatus]);

  const connectGoogleCalendar = async () => {
    try {
      setLoading(true);
      setError(null);

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
      setError(
        error instanceof Error
          ? error.message
          : "Failed to connect to Google Calendar"
      );
    } finally {
      setLoading(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    try {
      setLoading(true);
      setError(null);

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
        setConnectionStatus(null);
        setCalendars([]);
        setEvents([]);
      } else {
        throw new Error("Failed to disconnect");
      }
    } catch (error) {
      console.error("Error disconnecting from Google Calendar:", error);
      setError(error instanceof Error ? error.message : "Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendars = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(
        `${backendUrl}/api/google-calendar/calendars/${user.id}`
      );

      if (response.ok) {
        const data = await response.json();
        setCalendars(data.calendars);
      } else {
        throw new Error("Failed to fetch calendars");
      }
    } catch (error) {
      console.error("Error fetching calendars:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch calendars"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async (calendarId: string = selectedCalendar) => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error("User not authenticated");
      }

      const startDate = new Date().toISOString();
      const endDate = new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await fetch(
        `${backendUrl}/api/google-calendar/events/${user.id}?calendarId=${calendarId}&startDate=${startDate}&endDate=${endDate}`
      );

      if (response.ok) {
        const data = await response.json();
        setEvents(data.events);
      } else {
        throw new Error("Failed to fetch events");
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch events"
      );
    } finally {
      setLoading(false);
    }
  };

  const syncEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      setSyncProgress(0);

      if (!user) {
        throw new Error("User not authenticated");
      }

      const startDate = new Date().toISOString();
      const endDate = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString();

      const response = await fetch(
        `${backendUrl}/api/google-calendar/sync-events/${user.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            calendarId: selectedCalendar,
            startDate,
            endDate,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSyncProgress(100);
        alert(`Successfully synced ${data.syncedCount} events!`);
      } else {
        throw new Error("Failed to sync events");
      }
    } catch (error) {
      console.error("Error syncing events:", error);
      setError(
        error instanceof Error ? error.message : "Failed to sync events"
      );
    } finally {
      setLoading(false);
      setSyncProgress(0);
    }
  };

  const addEventToCalendar = async (eventData: {
    title: string;
    description?: string;
    due_date: string;
    due_time?: string;
    location?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(
        `${backendUrl}/api/google-calendar/add-to-google-calendar/${user.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            eventData,
            calendarId: selectedCalendar,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`Event added successfully! View it here: ${data.eventUrl}`);
        // Refresh events
        await fetchEvents();
      } else {
        throw new Error("Failed to add event");
      }
    } catch (error) {
      console.error("Error adding event:", error);
      setError(error instanceof Error ? error.message : "Failed to add event");
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (event: GoogleCalendarEvent) => {
    const start = event.start.dateTime || event.start.date;
    if (!start) return "No time specified";

    const date = new Date(start);
    return date.toLocaleString();
  };

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Google Calendar Integration
          </h1>
          <p className="text-gray-600">
            Please sign in to use Google Calendar integration.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Google Calendar Integration
        </h1>

        {/* Connection Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                Connection Status
              </h2>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-red-500"
                  }`}
                ></div>
                <span className="text-gray-600">
                  {isConnected ? "Connected" : "Not Connected"}
                </span>
              </div>
              {connectionStatus?.lastSync && (
                <p className="text-sm text-gray-500 mt-1">
                  Last synced:{" "}
                  {new Date(connectionStatus.lastSync).toLocaleString()}
                </p>
              )}
            </div>
            <div className="space-x-2">
              {!isConnected ? (
                <button
                  onClick={connectGoogleCalendar}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Connecting..." : "Connect Google Calendar"}
                </button>
              ) : (
                <button
                  onClick={disconnectGoogleCalendar}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? "Disconnecting..." : "Disconnect"}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {isConnected && (
          <>
            {/* Calendar Selection */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Calendars
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={fetchCalendars}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load Calendars"}
                </button>
                <select
                  value={selectedCalendar}
                  onChange={(e) => setSelectedCalendar(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="primary">Primary Calendar</option>
                  {calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Actions
              </h2>
              <div className="flex space-x-4">
                <button
                  onClick={() => fetchEvents()}
                  disabled={loading}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? "Loading..." : "Load Events"}
                </button>
                <button
                  onClick={syncEvents}
                  disabled={loading}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? "Syncing..." : "Sync Events"}
                </button>
              </div>
              {syncProgress > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Sync progress: {syncProgress}%
                  </p>
                </div>
              )}
            </div>

            {/* Quick Add Event */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Quick Add Event
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <input
                  type="text"
                  placeholder="Event Title"
                  id="eventTitle"
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="date"
                  id="eventDate"
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="time"
                  id="eventTime"
                  className="border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={() => {
                    const title = (
                      document.getElementById("eventTitle") as HTMLInputElement
                    )?.value;
                    const date = (
                      document.getElementById("eventDate") as HTMLInputElement
                    )?.value;
                    const time = (
                      document.getElementById("eventTime") as HTMLInputElement
                    )?.value;

                    if (title && date) {
                      addEventToCalendar({
                        title,
                        due_date: date,
                        due_time: time,
                      });
                    } else {
                      alert("Please enter a title and date");
                    }
                  }}
                  disabled={loading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? "Adding..." : "Add Event"}
                </button>
              </div>
            </div>

            {/* Events List */}
            {events.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Events ({events.length})
                </h2>
                <div className="grid gap-4">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {event.summary}
                          </h3>
                          {event.description && (
                            <p className="text-gray-600 text-sm mt-1">
                              {event.description}
                            </p>
                          )}
                          {event.location && (
                            <p className="text-gray-500 text-sm mt-1">
                              📍 {event.location}
                            </p>
                          )}
                          <p className="text-gray-500 text-sm mt-2">
                            📅 {formatEventTime(event)}
                          </p>
                        </div>
                        {event.htmlLink && (
                          <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            View in Google Calendar →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
