import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  extractEventsWithLLM,
  validateExtractedEvents,
  deduplicateEvents,
} from "@/utils/llm";
import { convertToCalendarEvent } from "@/utils/calendar";
import { ProcessingResponse } from "@/types/database";

export async function POST(
  request: NextRequest
): Promise<NextResponse<ProcessingResponse>> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { syllabusId, classId } = body;

    if (!syllabusId || !classId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get syllabus content
    const { data: syllabus, error: syllabusError } = await supabase
      .from("syllabi")
      .select("content_text, processing_status")
      .eq("id", syllabusId)
      .eq("class_id", classId)
      .single();

    if (syllabusError || !syllabus) {
      return NextResponse.json(
        { success: false, error: "Syllabus not found" },
        { status: 404 }
      );
    }

    if (syllabus.processing_status === "processing") {
      return NextResponse.json(
        { success: false, error: "Syllabus is already being processed" },
        { status: 409 }
      );
    }

    if (!syllabus.content_text) {
      return NextResponse.json(
        { success: false, error: "No content to process" },
        { status: 400 }
      );
    }

    // Update processing status
    await supabase
      .from("syllabi")
      .update({ processing_status: "processing" })
      .eq("id", syllabusId);

    const startTime = Date.now();

    try {
      // Extract events using LLM
      console.log("Starting LLM extraction for syllabus:", syllabusId);
      const extractedEvents = await extractEventsWithLLM(syllabus.content_text);
      console.log("Extracted events count:", extractedEvents.length);

      // Validate and deduplicate events
      const validEvents = validateExtractedEvents(extractedEvents);
      console.log("Valid events count:", validEvents.length);
      const uniqueEvents = deduplicateEvents(validEvents);
      console.log("Unique events count:", uniqueEvents.length);

      // Convert to database format and insert
      const calendarEvents = uniqueEvents.map((event) =>
        convertToCalendarEvent(event, classId, user.id, syllabusId)
      );
      console.log("Calendar events to insert:", calendarEvents.length);

      if (calendarEvents.length > 0) {
        const { error: insertError } = await supabase
          .from("calendar_events")
          .insert(calendarEvents);

        if (insertError) {
          console.error("Failed to insert calendar events:", insertError);
          throw new Error(`Failed to insert events: ${insertError.message}`);
        }
        console.log("Successfully inserted calendar events");
      } else {
        console.log("No calendar events to insert");
      }

      // Update syllabus status to completed
      await supabase
        .from("syllabi")
        .update({
          processing_status: "completed",
          processing_error: null,
        })
        .eq("id", syllabusId);

      const processingTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        events: uniqueEvents,
        processingTime,
      });
    } catch (processingError) {
      console.error("Processing error occurred:", processingError);
      // Update syllabus status to failed
      await supabase
        .from("syllabi")
        .update({
          processing_status: "failed",
          processing_error:
            processingError instanceof Error
              ? processingError.message
              : "Unknown error",
        })
        .eq("id", syllabusId);

      throw processingError;
    }
  } catch (error) {
    console.error("Processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const syllabusId = searchParams.get("syllabusId");

    if (!syllabusId) {
      return NextResponse.json(
        { success: false, error: "Missing syllabusId parameter" },
        { status: 400 }
      );
    }

    // Get processing status
    const { data: syllabus, error: syllabusError } = await supabase
      .from("syllabi")
      .select("processing_status, processing_error")
      .eq("id", syllabusId)
      .single();

    if (syllabusError || !syllabus) {
      return NextResponse.json(
        { success: false, error: "Syllabus not found" },
        { status: 404 }
      );
    }

    // If processing is complete, get the extracted events
    if (syllabus.processing_status === "completed") {
      const { data: events, error: eventsError } = await supabase
        .from("calendar_events")
        .select("*")
        .eq("syllabus_id", syllabusId)
        .order("due_date", { ascending: true });

      if (eventsError) {
        return NextResponse.json(
          { success: false, error: "Failed to fetch events" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        status: syllabus.processing_status,
        events: events || [],
      });
    }

    // Return processing status
    return NextResponse.json({
      success: true,
      status: syllabus.processing_status,
      error: syllabus.processing_error,
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
