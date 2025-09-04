"use client";

import React, { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { Syllabus, CalendarEvent } from "@/types/database";
import CalendarView from "@/components/CalendarView";

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

  const formatDate = (dateString: string): string => {
    // Parse the date string and format it consistently without timezone issues
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  useEffect(() => {
    const fetchData = async (classId: string) => {
      try {
        setLoading(true);
        setError(null);

        const { syllabus, error: syllabusError } = await getSyllabus(classId);

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

        const { events, error: eventsError } = await getCalendarEvents(classId);

        if (eventsError) {
          console.error("Error fetching calendar events:", eventsError);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Calendar Events
          </h1>
          {syllabus && (
            <p className="text-gray-600">
              Syllabus: {syllabus.original_filename}
            </p>
          )}

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

        {events.length > 0 ? (
          <div className="grid gap-6">
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

            {viewMode === "calendar" ? (
              <CalendarView classId={id.id.toString()} />
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
                              <span>{formatDate(event.due_date)}</span>
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
