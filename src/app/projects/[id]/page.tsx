"use client";

import React, { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { Syllabus, CalendarEvent } from "@/types/database";
import {
  addEventToGoogleCalendar,
  getGoogleCalendars,
} from "@/utils/googleCalendar";

// Calendar component
const CalendarView = ({ events }: { events: CalendarEvent[] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [showModal, setShowModal] = useState(false);
  const [googleCalendars, setGoogleCalendars] = useState<
    Array<{ id: string; summary: string; primary: boolean }>
  >([]);
  const [selectedCalendarId, setSelectedCalendarId] =
    useState<string>("primary");
  const [isAddingToGoogleCalendar, setIsAddingToGoogleCalendar] =
    useState(false);
  const [googleCalendarResult, setGoogleCalendarResult] = useState<{
    success: boolean;
    message: string;
    eventUrl?: string;
  } | null>(null);

  // Get current month's start and end dates
  const startOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const endOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  );

  // Get start of calendar grid (previous month's days to fill first week)
  const startOfCalendar = new Date(startOfMonth);
  startOfCalendar.setDate(startOfMonth.getDate() - startOfMonth.getDay());

  // Generate calendar days
  const calendarDays = [];
  const currentDay = new Date(startOfCalendar);

  while (currentDay <= endOfMonth || currentDay.getDay() !== 0) {
    calendarDays.push(new Date(currentDay));
    currentDay.setDate(currentDay.getDate() + 1);
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    return events.filter((event) => {
      const eventDate = new Date(event.due_date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  // Navigate to previous/next month
  const goToPreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const openEventModal = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowModal(true);
    loadGoogleCalendars(); // Load Google Calendars when modal opens
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
    setGoogleCalendarResult(null);
  };

  const loadGoogleCalendars = async () => {
    try {
      const result = await getGoogleCalendars();
      setGoogleCalendars(result.calendars);
      if (result.calendars.length > 0) {
        const primaryCalendar = result.calendars.find((cal) => cal.primary);
        setSelectedCalendarId(
          primaryCalendar ? primaryCalendar.id : result.calendars[0].id
        );
      }
    } catch (error) {
      console.error("Error loading Google Calendars:", error);
    }
  };

  const addToGoogleCalendar = async () => {
    if (!selectedEvent) return;

    try {
      setIsAddingToGoogleCalendar(true);
      setGoogleCalendarResult(null);

      const eventData = {
        title: selectedEvent.title,
        description: selectedEvent.description || "",
        due_date: selectedEvent.due_date,
        due_time: selectedEvent.due_time || undefined,
      };

      const result = await addEventToGoogleCalendar(
        eventData,
        selectedCalendarId
      );

      setGoogleCalendarResult({
        success: true,
        message: "Event added to Google Calendar successfully!",
        eventUrl: result.eventUrl,
      });
    } catch (error) {
      console.error("Error adding to Google Calendar:", error);
      setGoogleCalendarResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to add event to Google Calendar",
      });
    } finally {
      setIsAddingToGoogleCalendar(false);
    }
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {/* Day Headers */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="bg-gray-50 p-3 text-center">
            <div className="text-sm font-medium text-gray-500">{day}</div>
          </div>
        ))}

        {/* Calendar Days */}
        {calendarDays.map((date, index) => {
          const isCurrentMonth = date.getMonth() === currentDate.getMonth();
          const isToday = date.toDateString() === new Date().toDateString();
          const dayEvents = getEventsForDate(date);

          return (
            <div
              key={index}
              className={`min-h-[120px] bg-white p-2 ${
                !isCurrentMonth ? "text-gray-300" : "text-gray-900"
              }`}
            >
              <div
                className={`text-sm font-medium mb-1 ${
                  isToday
                    ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                    : ""
                }`}
              >
                {date.getDate()}
              </div>

              {/* Events for this day */}
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={event.id}
                    className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${
                      event.event_type === "assignment"
                        ? "bg-blue-100 text-blue-800"
                        : event.event_type === "exam"
                        ? "bg-red-100 text-red-800"
                        : event.event_type === "reading"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                    title={event.title}
                    onClick={() => openEventModal(event)}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{dayEvents.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Modal */}
      {showModal && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Event Details
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
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <div className="space-y-4">
                {/* Event Title and Type */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-xl font-medium text-gray-900">
                      {selectedEvent.title}
                    </h4>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(
                        selectedEvent.event_type
                      )}`}
                    >
                      {selectedEvent.event_type}
                    </span>
                  </div>
                </div>

                {/* Event Description */}
                {selectedEvent.description && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      Description
                    </h5>
                    <p className="text-gray-600">{selectedEvent.description}</p>
                  </div>
                )}

                {/* Event Date and Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-1">
                      Due Date
                    </h5>
                    <div className="flex items-center gap-2 text-gray-600">
                      <svg
                        className="w-4 h-4"
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
                      <span>
                        {new Date(selectedEvent.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {selectedEvent.due_time && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-1">
                        Due Time
                      </h5>
                      <div className="flex items-center gap-2 text-gray-600">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>{selectedEvent.due_time}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Source Text */}
                {selectedEvent.source_text && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      Source Text
                    </h5>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-700">
                        {selectedEvent.source_text}
                      </p>
                    </div>
                  </div>
                )}

                {/* Google Calendar Integration */}
                <div className="border-t pt-4">
                  <h5 className="text-sm font-medium text-gray-700 mb-3">
                    Add to Google Calendar
                  </h5>

                  {/* Calendar Selection */}
                  {googleCalendars.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-xs text-gray-600 mb-1">
                        Select Calendar:
                      </label>
                      <select
                        value={selectedCalendarId}
                        onChange={(e) => setSelectedCalendarId(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                      >
                        {googleCalendars.map((calendar) => (
                          <option key={calendar.id} value={calendar.id}>
                            {calendar.summary}{" "}
                            {calendar.primary ? "(Primary)" : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Add to Google Calendar Button */}
                  <button
                    onClick={addToGoogleCalendar}
                    disabled={isAddingToGoogleCalendar}
                    className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      isAddingToGoogleCalendar
                        ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {isAddingToGoogleCalendar ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Adding...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="w-4 h-4"
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
                        Add to Google Calendar
                      </span>
                    )}
                  </button>

                  {/* Result Message */}
                  {googleCalendarResult && (
                    <div
                      className={`mt-3 p-3 rounded-md text-sm ${
                        googleCalendarResult.success
                          ? "bg-green-50 text-green-800 border border-green-200"
                          : "bg-red-50 text-red-800 border border-red-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {googleCalendarResult.success ? (
                          <svg
                            className="w-4 h-4"
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
                        ) : (
                          <svg
                            className="w-4 h-4"
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
                        <span>{googleCalendarResult.message}</span>
                      </div>
                      {googleCalendarResult.success &&
                        googleCalendarResult.eventUrl && (
                          <a
                            href={googleCalendarResult.eventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-2 text-blue-600 hover:text-blue-800 underline"
                          >
                            View in Google Calendar →
                          </a>
                        )}
                    </div>
                  )}
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
    </div>
  );
};

const getSyllabus = async (id: string) => {
  const supabase = createClient();
  const { data: syllabus, error } = await supabase
    .from("syllabi")
    .select("*")
    .eq("class_id", id);

  if (error) {
    console.error("Error fetching syllabus:", error);
    throw new Error("Error fetching syllabus:", error);
  }

  return { syllabus, error };
};

const getCalendarEvents = async (classId: string) => {
  const supabase = createClient();
  const { data: events, error } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("class_id", classId)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("Error fetching calendar events:", error);
    throw new Error("Error fetching calendar events");
  }

  return { events, error };
};

export default function SyllabusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = use(params);
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");

  useEffect(() => {
    const fetchData = async (classId: string) => {
      try {
        setLoading(true);
        setError(null);

        // Fetch syllabus data
        const { syllabus, error: syllabusError } = await getSyllabus(classId);
        console.log("Syllabus data:", syllabus);

        if (syllabusError) {
          console.error("Error fetching syllabus:", syllabusError);
          setError("Failed to fetch syllabus data");
          return;
        }

        if (!syllabus || syllabus.length === 0) {
          setError("No syllabus found for this class");
          return;
        }

        const syllabusData = syllabus[0];
        setSyllabus(syllabusData);

        // Fetch calendar events
        const { events, error: eventsError } = await getCalendarEvents(classId);
        console.log("Calendar events:", events);

        if (eventsError) {
          console.error("Error fetching calendar events:", eventsError);
          // Don't fail completely if events fail to load
          setEvents([]);
        } else {
          setEvents(events || []);
        }
      } catch (err) {
        console.error("Error in fetchData:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchData(id.id.toString());
  }, [id.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-black">Loading calendar events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg mb-4">Error: {error}</div>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Calendar Events
          </h1>
          {syllabus && (
            <p className="text-gray-600">
              Syllabus: {syllabus.original_filename}
            </p>
          )}

          {/* View Toggle */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm text-gray-600">View:</span>
            <button
              onClick={() => setViewMode("calendar")}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === "calendar"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-3 py-1 text-sm rounded ${
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Events Display */}
        {events.length > 0 ? (
          <div className="grid gap-6">
            {/* Summary Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {events.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Events</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {events.filter((e) => e.event_type === "assignment").length}
                  </div>
                  <div className="text-sm text-gray-600">Assignments</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {events.filter((e) => e.event_type === "exam").length}
                  </div>
                  <div className="text-sm text-gray-600">Exams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {events.filter((e) => e.event_type === "reading").length}
                  </div>
                  <div className="text-sm text-gray-600">Readings</div>
                </div>
              </div>
            </div>

            {/* Calendar or List View */}
            {viewMode === "calendar" ? (
              <CalendarView events={events} />
            ) : (
              <div className="bg-white rounded-lg shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">
                    All Events ({events.length})
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {event.title}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(
                                event.event_type
                              )}`}
                            >
                              {event.event_type}
                            </span>
                          </div>

                          {event.description && (
                            <p className="text-gray-600 mb-3">
                              {event.description}
                            </p>
                          )}

                          <div className="flex items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-4 h-4"
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
                              <span>
                                {new Date(event.due_date).toLocaleDateString()}
                              </span>
                            </div>
                            {event.due_time && (
                              <div className="flex items-center gap-1">
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span>{event.due_time}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {event.source_text && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-md">
                          <p className="text-xs font-medium text-gray-500 mb-1">
                            Source Text:
                          </p>
                          <p className="text-sm text-gray-700">
                            {event.source_text}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
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
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Calendar Events Found
            </h3>
            <p className="text-gray-600 mb-4">
              No calendar events have been extracted from this syllabus yet.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get event type colors
const getEventTypeColor = (eventType: string) => {
  switch (eventType) {
    case "assignment":
      return "bg-blue-100 text-blue-800";
    case "exam":
      return "bg-red-100 text-red-800";
    case "reading":
      return "bg-green-100 text-green-800";
    case "other":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};
