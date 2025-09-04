"use client";

import { useState } from "react";
import {
  extractCalendarEvents,
  type CalendarEvent,
} from "@/utils/calendarExtraction";

export default function CalendarExtractionTest() {
  const [pdfContext, setPdfContext] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtractEvents = async () => {
    if (!pdfContext.trim()) {
      setError("Please enter syllabus content");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await extractCalendarEvents(pdfContext);
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        Calendar Event Extraction Test
      </h1>

      <div className="mb-6">
        <label htmlFor="pdfContext" className="block text-sm font-medium mb-2">
          Syllabus Content
        </label>
        <textarea
          id="pdfContext"
          value={pdfContext}
          onChange={(e) => setPdfContext(e.target.value)}
          placeholder="Paste your syllabus content here..."
          className="w-full h-48 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <button
        onClick={handleExtractEvents}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Extracting..." : "Extract Calendar Events"}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">
            Extracted Events ({events.length})
          </h2>
          <div className="space-y-4">
            {events.map((event, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg shadow-sm"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-medium">{event.title}</h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeColor(
                      event.event_type
                    )}`}
                  >
                    {event.event_type}
                  </span>
                </div>

                {event.description && (
                  <p className="text-gray-600 mb-2">{event.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Due Date:</span>{" "}
                    {new Date(event.due_date).toLocaleDateString()}
                  </div>
                  {event.due_time && (
                    <div>
                      <span className="font-medium">Due Time:</span>{" "}
                      {event.due_time}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Confidence:</span>{" "}
                    {(event.confidence_score * 100).toFixed(1)}%
                  </div>
                </div>

                {event.source_text && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-md">
                    <span className="text-xs font-medium text-gray-500">
                      Source Text:
                    </span>
                    <p className="text-sm text-gray-700 mt-1">
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
  );
}
