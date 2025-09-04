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

export default function CalendarView() {
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

        const { data: eventsData, error } = await supabase
          .from("calendar_events")
          .select("*")
          .eq("user_id", userId)
          .gte("due_date", firstDay.toISOString().split("T")[0])
          .lte("due_date", lastDay.toISOString().split("T")[0])
          .order("due_date", { ascending: true });

        if (error) {
          console.error("Error fetching events:", error);
          return;
        }

        setEvents(eventsData || []);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    },
    [currentDate, supabase]
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
    const lastDay = new Date(year, month + 1, 0);
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ←
            </button>
            <button
              onClick={goToToday}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              →
            </button>
          </div>
          <h2 className="text-xl font-semibold text-gray-700">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
        </div>

        {/* Calendar Grid */}
        <div className="p-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-gray-600 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-[120px] border border-gray-200 p-2 ${
                  day.isToday ? "bg-blue-50 border-blue-300" : ""
                } ${!day.isCurrentMonth ? "bg-gray-50 text-gray-400" : ""}`}
              >
                <div className="text-sm font-medium mb-1">
                  {day.date.getDate()}
                </div>
                <div className="space-y-1">
                  {day.events.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className={`text-xs p-1 rounded cursor-pointer text-white ${getEventTypeColor(
                        event.event_type
                      )}`}
                      title={`${event.title}${
                        event.due_time
                          ? ` at ${formatTime(event.due_time)}`
                          : ""
                      }`}
                    >
                      <div className="font-medium truncate">
                        {getEventTypeLabel(event.event_type)}
                      </div>
                      <div className="truncate text-xs opacity-90">
                        {event.title}
                      </div>
                    </div>
                  ))}
                  {day.events.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{day.events.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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

      {/* Legend */}
      <div className="mt-6 bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold mb-3">Event Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { type: "assignment", label: "Assignment" },
            { type: "exam", label: "Exam" },
            { type: "quiz", label: "Quiz" },
            { type: "project", label: "Project" },
            { type: "reading", label: "Reading" },
            { type: "deadline", label: "Deadline" },
            { type: "google_calendar", label: "Google Calendar" },
          ].map(({ type, label }) => (
            <div key={type} className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded ${getEventTypeColor(type)}`}
              ></div>
              <span className="text-sm">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
