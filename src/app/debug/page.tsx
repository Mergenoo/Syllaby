"use client";

import React, { useEffect, useState } from "react";
import { testGeminiConfiguration } from "@/utils/llm";
import { CalendarEvent, Syllabus } from "@/types/database";
import { createClient } from "@/utils/supabase/client";
import {
  extractCalendarEvents,
  type ExtractionResponse,
} from "@/utils/calendarExtraction";

export default function DebugPage() {
  const [configStatus, setConfigStatus] = useState<string>("Testing...");
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [extractionResult, setExtractionResult] =
    useState<ExtractionResponse | null>(null);
  const [savedEvents, setSavedEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const testConfig = async () => {
      try {
        const result = await testGeminiConfiguration();
        setConfigStatus(result ? "✅ Configured" : "❌ Not Configured");
        setTestResult(result);
      } catch (error) {
        setConfigStatus("❌ Error");
        console.error("Configuration test error:", error);
      }
    };

    const fetchSyllabi = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("syllabi")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching syllabi:", error);
        } else {
          setSyllabi(data || []);
        }
      } catch (error) {
        console.error("Error fetching syllabi:", error);
      }
    };

    testConfig();
    fetchSyllabi();
  }, []);

  const generateCalendarEvents = async () => {
    if (syllabi.length === 0) {
      alert("No syllabi found. Please upload a syllabus first.");
      return;
    }

    const firstSyllabus = syllabi[0];
    setLoading(true);
    setProcessingStatus("Processing syllabus...");

    try {
      const supabase = createClient();

      // First, let's check the syllabus content
      console.log(
        "Syllabus content preview:",
        firstSyllabus.content_text?.substring(0, 500)
      );
      console.log(
        "Syllabus content length:",
        firstSyllabus.content_text?.length
      );

      // Call the processing API
      const response = await fetch("/api/syllabi/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          syllabusId: firstSyllabus.id,
          classId: firstSyllabus.class_id,
        }),
      });

      const result = await response.json();
      console.log("Processing API result:", result);

      if (result.success) {
        setProcessingStatus(
          `✅ Successfully generated ${result.events.length} events`
        );

        // Fetch the generated events
        const { data: eventsData, error: eventsError } = await supabase
          .from("calendar_events")
          .select("*")
          .eq("syllabus_id", firstSyllabus.id)
          .order("due_date", { ascending: true });

        if (eventsError) {
          console.error("Error fetching events:", eventsError);
        } else {
          setEvents(eventsData || []);
          console.log("Fetched events from database:", eventsData);
        }
      } else {
        setProcessingStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Error generating calendar events:", error);
      setProcessingStatus(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const testCalendarExtraction = async () => {
    if (syllabi.length === 0) {
      alert("No syllabi found. Please upload a syllabus first.");
      return;
    }

    const firstSyllabus = syllabi[0];
    if (!firstSyllabus.content_text) {
      alert("Syllabus has no content to extract from.");
      return;
    }

    setLoading(true);
    console.log("🔍 Starting calendar extraction test...");
    console.log(
      "📄 Syllabus content length:",
      firstSyllabus.content_text.length
    );
    console.log(
      "📄 Syllabus content preview:",
      firstSyllabus.content_text.substring(0, 200)
    );

    try {
      console.log("🚀 Calling calendar extraction API...");
      const result = await extractCalendarEvents(firstSyllabus.content_text);

      console.log("✅ Calendar extraction successful!");
      console.log("📊 Extraction result:", result);
      console.log("📅 Extracted events count:", result.count);
      console.log("📅 Extracted events:", result.events);

      setExtractionResult(result);

      // Log each event in detail
      result.events.forEach((event, index) => {
        console.log(`📅 Event ${index + 1}:`, {
          title: event.title,
          type: event.event_type,
          dueDate: event.due_date,
          dueTime: event.due_time,
          confidence: event.confidence_score,
          description: event.description,
          sourceText: event.source_text,
        });
      });
    } catch (error) {
      console.error("❌ Calendar extraction failed:", error);
      alert(
        `Calendar extraction failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const saveEventsToSupabase = async () => {
    if (!extractionResult || extractionResult.events.length === 0) {
      alert("No events to save. Please extract events first.");
      return;
    }

    if (syllabi.length === 0) {
      alert("No syllabus selected. Please upload a syllabus first.");
      return;
    }

    const firstSyllabus = syllabi[0];
    setLoading(true);
    console.log("💾 Starting to save events to Supabase...");

    try {
      const supabase = createClient();

      // Get current user
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error("User not authenticated");
      }

      console.log("👤 User authenticated:", user.id);
      console.log("📚 Using syllabus:", firstSyllabus.id);

      // Prepare events for database insertion
      const eventsToInsert = extractionResult.events.map((event) => ({
        syllabus_id: firstSyllabus.id,
        class_id: firstSyllabus.class_id,
        user_id: user.id,
        title: event.title,
        description: event.description,
        event_type: event.event_type,
        due_date: event.due_date,
        due_time: event.due_time,
        confidence_score: event.confidence_score,
        source_text: event.source_text,
        extraction_method: "calendar_extraction_api",
        is_exported: false,
        exported_at: null,
        ics_uid: null,
      }));

      console.log("📝 Events to insert:", eventsToInsert);

      // Insert events into Supabase
      const { data: insertedEvents, error: insertError } = await supabase
        .from("calendar_events")
        .insert(eventsToInsert)
        .select();

      if (insertError) {
        console.error("❌ Supabase insert error:", insertError);
        throw new Error(`Failed to save events: ${insertError.message}`);
      }

      console.log("✅ Successfully saved events to Supabase!");
      console.log("📊 Saved events:", insertedEvents);

      setSavedEvents(insertedEvents || []);

      // Show success message
      alert(
        `Successfully saved ${insertedEvents?.length || 0} events to database!`
      );
    } catch (error) {
      console.error("❌ Error saving events to Supabase:", error);
      alert(
        `Failed to save events: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Law Bandit Debug Page
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Gemini API Configuration
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Status: <span className="font-medium">{configStatus}</span>
            </p>
            {!testResult && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  To fix this issue, create a <code>.env.local</code> file in
                  the frontend directory with:
                </p>
                <pre className="mt-2 text-xs bg-yellow-100 p-2 rounded">
                  NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key-here
                </pre>
                <p className="text-sm text-yellow-800 mt-2">
                  Get your API key from{" "}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>
            )}
          </div>
        </div>

        {extractionResult && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Calendar Extraction API Results
            </h2>
            <div className="space-y-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-green-800 font-medium">
                  ✅ Extraction successful! Check console for detailed logs.
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Extracted {extractionResult.count} events from syllabus
                  content.
                </p>
              </div>

              {extractionResult.events.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-800 mb-2">
                    Extracted Events ({extractionResult.events.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {extractionResult.events.map((event, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-md p-3 bg-gray-50"
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-sm text-gray-600">
                          Type: {event.event_type} | Due: {event.due_date}
                          {event.due_time && ` at ${event.due_time}`} |
                          Confidence:{" "}
                          {(event.confidence_score * 100).toFixed(1)}%
                        </div>
                        {event.description && (
                          <div className="text-sm text-gray-500 mt-1">
                            {event.description}
                          </div>
                        )}
                        {event.source_text && (
                          <div className="text-xs text-gray-400 mt-2 p-2 bg-gray-100 rounded">
                            <strong>Source:</strong> {event.source_text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {extractionResult && extractionResult.events.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Save Events to Database
            </h2>
            <div className="space-y-4">
              <button
                onClick={saveEventsToSupabase}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Saving..." : "💾 Save Events to Supabase"}
              </button>
              <p className="text-sm text-gray-600">
                This will save {extractionResult.events.length} extracted events
                to the calendar_events table in Supabase.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Environment Variables
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              NEXT_PUBLIC_GEMINI_API_KEY:{" "}
              <span className="font-medium">
                {process.env.NEXT_PUBLIC_GEMINI_API_KEY
                  ? "✅ Set"
                  : "❌ Not Set"}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              NEXT_PUBLIC_SUPABASE_URL:{" "}
              <span className="font-medium">
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Not Set"}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:{" "}
              <span className="font-medium">
                {process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                  ? "✅ Set"
                  : "❌ Not Set"}
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Calendar Event Generation
          </h2>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={generateCalendarEvents}
                disabled={loading || syllabi.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Generate Calendar Events"}
              </button>
              <button
                onClick={testCalendarExtraction}
                disabled={loading || syllabi.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? "Extracting..." : "Test Calendar Extraction API"}
              </button>
              <span className="text-sm text-gray-600">
                {syllabi.length > 0
                  ? `Using syllabus: ${
                      syllabi[0].original_filename || syllabi[0].id
                    } (${syllabi[0].content_text?.length || 0} chars)`
                  : "No syllabi available"}
              </span>
            </div>

            {syllabi.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Syllabus Content Preview
                </h3>
                <div className="bg-gray-50 p-4 rounded-md max-h-32 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                    {syllabi[0].content_text?.substring(0, 1000) ||
                      "No content available"}
                  </pre>
                </div>
              </div>
            )}

            {processingStatus && (
              <div
                className={`p-3 rounded-md ${
                  processingStatus.includes("✅")
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : processingStatus.includes("❌")
                    ? "bg-red-50 text-red-800 border border-red-200"
                    : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                {processingStatus}
              </div>
            )}

            {events.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Generated Events ({events.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 rounded-md p-3 bg-gray-50"
                    >
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-gray-600">
                        Type: {event.event_type} | Due: {event.due_date}
                        {event.due_time && ` at ${event.due_time}`}
                      </div>
                      {event.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {event.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {savedEvents.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Saved Events in Database ({savedEvents.length})
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {savedEvents.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-md p-3 bg-gray-50"
                >
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-gray-600">
                    Type: {event.event_type} | Due: {event.due_date}
                    {event.due_time && ` at ${event.due_time}`} | Confidence:{" "}
                    {event.confidence_score
                      ? (event.confidence_score * 100).toFixed(1)
                      : "N/A"}
                    %
                  </div>
                  {event.description && (
                    <div className="text-sm text-gray-500 mt-1">
                      {event.description}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    ID: {event.id} | Syllabus: {event.syllabus_id}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
