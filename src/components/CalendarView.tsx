"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { CalendarEvent } from "@/types/database";

interface CalendarDay {
  date: Date;
  events: CalendarEvent[];
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface CalendarViewProps {
  classId?: string;
}

export default function CalendarView({ classId }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );

  const supabase = createClient();

  const fetchEvents = useCallback(
    async (userId: string) => {
      try {
        // Get the first and last day of the current month
        const firstDay = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          1
        );
        const lastDay = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0
        );

        let query = supabase
          .from("calendar_events")
          .select("*")
          .eq("user_id", userId)
          .gte("due_date", firstDay.toISOString().split("T")[0])
          .lte("due_date", lastDay.toISOString().split("T")[0])
          .order("due_date", { ascending: true });

        // If classId is provided, filter by class_id
        if (classId) {
          query = query.eq("class_id", classId);
        }

        const { data: eventsData, error } = await query;

        if (error) {
          console.error("Error fetching events:", error);
          return;
        }

        setEvents(eventsData || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    },
    [currentDate, supabase, classId]
  );

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        fetchEvents(user.id);
      }
    };

    getUser();
  }, [currentDate, supabase.auth, fetchEvents]);

  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days: CalendarDay[] = [];
    const today = new Date();

    for (let i = 0; i < 42; i++) {
      // 6 weeks * 7 days
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const dayEvents = events.filter((event) => {
        // Parse the event date string directly to avoid timezone issues
        const [eventYear, eventMonth, eventDay] = event.due_date
          .split("-")
          .map(Number);
        const eventDate = new Date(eventYear, eventMonth - 1, eventDay);

        // Compare year, month, and day directly
        return (
          eventDate.getFullYear() === date.getFullYear() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getDate() === date.getDate()
        );
      });

      days.push({
        date,
        events: dayEvents,
        isToday: date.toDateString() === today.toDateString(),
        isCurrentMonth: date.getMonth() === month,
      });
    }

    return days;
  };

  const getEventTypeColor = (eventType: string): string => {
    switch (eventType) {
      case "assignment":
        return "bg-blue-500";
      case "exam":
        return "bg-red-500";
      case "quiz":
        return "bg-yellow-500";
      case "project":
        return "bg-purple-500";
      case "reading":
        return "bg-green-500";
      case "deadline":
        return "bg-orange-500";
      case "google_calendar":
        return "bg-indigo-500";
      default:
        return "bg-gray-500";
    }
  };

  const getEventTypeLabel = (eventType: string): string => {
    switch (eventType) {
      case "assignment":
        return "Assignment";
      case "exam":
        return "Exam";
      case "quiz":
        return "Quiz";
      case "project":
        return "Project";
      case "reading":
        return "Reading";
      case "deadline":
        return "Deadline";
      case "google_calendar":
        return "Google";
      default:
        return eventType;
    }
  };

  const formatTime = (time: string | null): string => {
    if (!time) return "";
    return time.substring(0, 5); // HH:MM
  };

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

  const previousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const calendarDays = generateCalendarDays();
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
            onClick={previousMonth}
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
            onClick={nextMonth}
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
        {calendarDays.map((day, index) => (
          <div
            key={index}
            className={`min-h-[120px] bg-white p-2 ${
              !day.isCurrentMonth ? "text-gray-300" : "text-gray-900"
            }`}
          >
            <div
              className={`text-sm font-medium mb-1 ${
                day.isToday
                  ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  : ""
              }`}
            >
              {day.date.getDate()}
            </div>

            {/* Events for this day */}
            <div className="space-y-1">
              {day.events.slice(0, 2).map((event) => (
                <div
                  key={event.id}
                  className={`text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${
                    event.event_type === "assignment"
                      ? "bg-blue-100 text-blue-800"
                      : event.event_type === "exam"
                      ? "bg-red-100 text-red-800"
                      : event.event_type === "reading"
                      ? "bg-green-100 text-green-800"
                      : event.event_type === "google_calendar"
                      ? "bg-indigo-100 text-indigo-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                  title={event.title}
                  onClick={() => setSelectedEvent(event)}
                >
                  {event.title}
                </div>
              ))}
              {day.events.length > 2 && (
                <div className="text-xs text-gray-500">
                  +{day.events.length - 2} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <span className="font-medium w-20">Type:</span>
                <span
                  className={`px-2 py-1 rounded text-white text-sm ${getEventTypeColor(
                    selectedEvent.event_type
                  )}`}
                >
                  {getEventTypeLabel(selectedEvent.event_type)}
                </span>
              </div>

              <div className="flex items-center">
                <span className="font-medium w-20">Date:</span>
                <span>{formatDate(selectedEvent.due_date)}</span>
              </div>

              {selectedEvent.due_time && (
                <div className="flex items-center">
                  <span className="font-medium w-20">Time:</span>
                  <span>{formatTime(selectedEvent.due_time)}</span>
                </div>
              )}

              {selectedEvent.description && (
                <div>
                  <span className="font-medium">Description:</span>
                  <p className="text-gray-600 mt-1">
                    {selectedEvent.description}
                  </p>
                </div>
              )}

              <div className="flex items-center">
                <span className="font-medium w-20">Source:</span>
                <span className="text-sm text-gray-600">
                  {selectedEvent.extraction_method === "google_calendar_sync"
                    ? "Google Calendar"
                    : "Syllabus"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
