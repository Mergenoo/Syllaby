"use client";

import React, { useEffect, useState, use } from "react";
import { createClient } from "@/utils/supabase/client";
import { Syllabus, CalendarEvent } from "@/types/database";
import CalendarView from "@/components/CalendarView";
import Navbar from "@/components/Navbar";

const getEventTypeColor = (eventType: string) => {
  switch (eventType) {
    case "assignment":
      return "bg-blue-100 text-blue-800 border border-blue-200";
    case "exam":
      return "bg-red-100 text-red-800 border border-red-200";
    case "reading":
      return "bg-green-100 text-green-800 border border-green-200";
    case "other":
      return "bg-gray-100 text-gray-800 border border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
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
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-lg text-black">Loading calendar events...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="text-center">
            <div className="text-black text-lg mb-4">Error: {error}</div>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-black text-white rounded hover:bg-black/90"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-black mb-2">
              Calendar Events
            </h1>
            {syllabus && (
              <p className="text-black/60">
                Syllabus: {syllabus.original_filename}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-black/60">View:</span>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === "calendar"
                    ? "bg-black text-white"
                    : "bg-white border border-black text-black hover:bg-black/5"
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1 text-sm rounded ${
                  viewMode === "list"
                    ? "bg-black text-white"
                    : "bg-white border border-black text-black hover:bg-black/5"
                }`}
              >
                List
              </button>
            </div>
          </div>

          {events.length > 0 ? (
            <div className="grid gap-6">
              <div className="bg-white border border-black rounded-lg p-6">
                <h2 className="text-xl font-semibold text-black mb-4">
                  Summary
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">
                      {events.length}
                    </div>
                    <div className="text-sm text-black/60">Total Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">
                      {
                        events.filter((e) => e.event_type === "assignment")
                          .length
                      }
                    </div>
                    <div className="text-sm text-black/60">Assignments</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">
                      {events.filter((e) => e.event_type === "exam").length}
                    </div>
                    <div className="text-sm text-black/60">Exams</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-black">
                      {events.filter((e) => e.event_type === "reading").length}
                    </div>
                    <div className="text-sm text-black/60">Readings</div>
                  </div>
                </div>
              </div>

              {viewMode === "calendar" ? (
                <CalendarView classId={id.id.toString()} />
              ) : (
                <div className="bg-white border border-black rounded-lg">
                  <div className="p-6 border-b border-black">
                    <h2 className="text-xl font-semibold text-black">
                      All Events ({events.length})
                    </h2>
                  </div>
                  <div className="divide-y divide-black">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="p-6 hover:bg-black/5 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-medium text-black">
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
                              <p className="text-black/60 mb-3">
                                {event.description}
                              </p>
                            )}

                            <div className="flex items-center gap-6 text-sm text-black/60">
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
                          <div className="mt-4 p-3 bg-white border border-black rounded-md">
                            <p className="text-xs font-medium text-black/60 mb-1">
                              Source Text:
                            </p>
                            <p className="text-sm text-black">
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
            <div className="bg-white border border-black rounded-lg p-12 text-center">
              <div className="text-black/40 mb-4">
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
              <h3 className="text-lg font-medium text-black mb-2">
                No Calendar Events Found
              </h3>
              <p className="text-black/60 mb-4">
                No calendar events have been extracted from this syllabus yet.
              </p>
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-black text-white rounded hover:bg-black/90"
              >
                Go Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
