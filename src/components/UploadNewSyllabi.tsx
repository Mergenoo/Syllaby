"use client";
import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { extractTextFromPDF } from "@/utils/llm";
import { extractCalendarEvents } from "@/utils/calendarExtraction";

interface UploadNewSyllabiProps {
  classId: string;
  className?: string;
}

const uploadSyllabi = async (file: File, classId: string) => {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error("User not authenticated");
  }

  let contentText = null;
  if (file.type === "application/pdf") {
    try {
      contentText = await extractTextFromPDF(file);
    } catch (error) {
      console.error("❌ PDF text extraction failed:", error);
      throw new Error("Failed to extract text from PDF");
    }
  } else {
    throw new Error("Only PDF files are supported for automatic processing");
  }

  let extractedEvents = null;
  try {
    const extractionResult = await extractCalendarEvents(contentText);
    extractedEvents = extractionResult.events;
  } catch (error) {
    console.error("❌ Calendar event extraction failed:", error);
    throw new Error("Failed to extract calendar events from syllabus");
  }

  const fileName = `${user.id}/${classId}/${Date.now()}_${file.name}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("syllabi")
    .upload(fileName, file);

  if (uploadError) {
    console.error("❌ Error uploading file:", uploadError);
    throw new Error("Error uploading file to storage");
  }

  const { data: syllabusData, error: syllabusError } = await supabase
    .from("syllabi")
    .insert({
      class_id: classId,
      original_filename: file.name,
      file_path: uploadData.path,
      content_text: contentText,
      file_type: file.type || "pdf",
      file_size: file.size,
      processing_status: "completed",
      processing_error: null,
    })
    .select()
    .single();

  if (syllabusError) {
    console.error("❌ Error creating syllabus record:", syllabusError);
    throw new Error("Error creating syllabus record");
  }

  if (extractedEvents && extractedEvents.length > 0) {
    const eventsToInsert = extractedEvents.map((event) => ({
      syllabus_id: syllabusData.id,
      class_id: classId,
      user_id: user.id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      due_date: event.due_date,
      due_time: event.due_time,
      confidence_score: event.confidence_score,
      source_text: event.source_text,
      extraction_method: "upload_workflow",
      is_exported: false,
      exported_at: null,
      ics_uid: null,
    }));

    const { data: insertedEvents, error: eventsError } = await supabase
      .from("calendar_events")
      .insert(eventsToInsert)
      .select();

    if (eventsError) {
      console.error("❌ Error saving events to database:", eventsError);
      throw new Error("Failed to save calendar events to database");
    }
  } else {
    console.log("⚠️ No calendar events found to save");
  }

  return {
    data: syllabusData,
    events: extractedEvents,
    savedEvents: extractedEvents?.length || 0,
  };
};

export default function UploadNewSyllabi({
  classId,
  className = "",
}: UploadNewSyllabiProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("syllabi") as File;

    if (!file) {
      setError("Please select a file");
      setIsLoading(false);
      return;
    }

    try {
      const result = await uploadSyllabi(file, classId);
      setSuccessMessage(
        `✅ Syllabus uploaded successfully! Extracted ${result.savedEvents} calendar events.`
      );
      setIsModalOpen(false);
      setTimeout(() => {
        setSuccessMessage(null);
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Upload error:", error);
      setError(
        error instanceof Error ? error.message : "Failed to upload syllabus"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`bg-black text-white px-3 py-1 rounded-md text-sm hover:bg-black/90 transition-colors ${className}`}
      >
        Upload Syllabus
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border border-black w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-black">Upload Syllabus</h1>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-black/60 hover:text-black"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
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

            {error && (
              <div className="mb-4 p-3 bg-white border border-black text-black rounded">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3 bg-white border border-black text-black rounded">
                {successMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="syllabi"
                  className="block text-sm font-medium text-black"
                >
                  Select Syllabus File
                </label>
                <input
                  type="file"
                  id="syllabi"
                  name="syllabi"
                  accept=".pdf,.docx,.txt"
                  required
                  className="mt-1 block w-full border border-black rounded-md px-3 py-2 text-black focus:outline-none focus:border-black bg-white"
                />
                <p className="mt-1 text-sm text-black/60">
                  Supported formats: PDF (recommended for automatic processing)
                </p>
                <p className="mt-1 text-xs text-black/60">
                  This will automatically extract text, generate calendar
                  events, and save them to your database.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-black bg-white border border-black rounded-md hover:bg-black/5 focus:outline-none focus:border-black"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-black border border-transparent rounded-md hover:bg-black/90 focus:outline-none focus:border-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Processing..." : "Upload & Process"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
