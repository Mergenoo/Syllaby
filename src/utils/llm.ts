import { ExtractedEvent, EventType } from "@/types/database";

// Gemini API configuration
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");

    // Use local worker file
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items
      const pageText = textContent.items
        .map((item) => (item as { str: string }).str || "")
        .join(" ");

      fullText += pageText + "\n";
    }

    console.log(`Extracted ${fullText.length} characters from PDF`);
    return fullText.trim();
  } catch (error) {
    console.error("PDF text extraction failed:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

/**
 * Enhanced LLM prompt template for extracting calendar events from syllabus text
 */
const EXTRACTION_PROMPT = `
You are an AI assistant that extracts calendar events from academic syllabi. Your task is to identify assignments, exams, quizzes, projects, readings, and deadlines with their due dates.

Please analyze the following syllabus text and extract all calendar events. Return ONLY a valid JSON array with no additional text.

Each event should have these exact fields:
- title: A clear, concise title for the event
- description: Additional details about the event (optional, can be null)
- eventType: One of "assignment", "exam", "quiz", "project", "reading", or "deadline"
- dueDate: Date in ISO format (YYYY-MM-DD)
- dueTime: Time in 24-hour format (HH:MM) if specified, otherwise null
- confidenceScore: Confidence level from 0.0 to 1.0
- sourceText: The exact text snippet that generated this event

Rules:
1. Only extract events with explicit dates (e.g., "Assignment due: September 15" not "second Tuesday")
2. Be conservative with confidence scores - only high confidence for clear dates
3. Include the original text snippet that was used to create each event
4. If no clear events are found, return an empty array []
5. Handle various date formats: "Week 3", "March 15th", "Due: 3/15", "Dec 10", etc.
6. Classify events appropriately:
   - "assignment" for homework, papers, reports
   - "exam" for tests, finals, midterms
   - "quiz" for short assessments
   - "project" for major assignments
   - "reading" for required readings, chapters
   - "deadline" for other time-sensitive items

Syllabus text to analyze:
`;

/**
 * Call Gemini API to extract events
 * @param text Syllabus text content
 * @returns Array of extracted events
 */
async function callGeminiAPI(text: string): Promise<ExtractedEvent[]> {
  if (!GEMINI_API_KEY) {
    console.error(
      "Gemini API key not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable."
    );
    throw new Error("Gemini API key not configured");
  }

  const prompt = EXTRACTION_PROMPT + text;
  console.log("Calling Gemini API with prompt length:", prompt.length);

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1, // Low temperature for consistent, structured output
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 2048,
        },
      }),
    });

    console.log("Gemini API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error response:", errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Gemini API response data:", data);

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content
    ) {
      console.error("Invalid Gemini API response format:", data);
      throw new Error("Invalid response format from Gemini API");
    }

    const responseText = data.candidates[0].content.parts[0].text;
    console.log("Gemini raw response:", responseText);

    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in Gemini response:", responseText);
      throw new Error("No JSON array found in Gemini response");
    }

    const events = JSON.parse(jsonMatch[0]);
    console.log("Parsed events:", events);

    // Validate the structure
    if (!Array.isArray(events)) {
      console.error("Gemini response is not an array:", events);
      throw new Error("Gemini response is not an array");
    }

    return events.map((event) => ({
      title: event.title || "Unknown Event",
      description: event.description || null,
      eventType: event.eventType || "deadline",
      dueDate: event.dueDate,
      dueTime: event.dueTime || null,
      confidenceScore: event.confidenceScore || 0.5,
      sourceText: event.sourceText || "",
    }));
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw error;
  }
}

/**
 * Fallback regex patterns for common date formats
 */
const DATE_PATTERNS = [
  // "Assignment due: September 15, 2024"
  /(assignment|exam|quiz|project|deadline|due)[\s:]+([^:]+?)[\s:]+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/gi,

  // "Due: 9/15/2024"
  /(assignment|exam|quiz|project|deadline|due)[\s:]+([^:]+?)[\s:]+(\d{1,2})\/(\d{1,2})\/(\d{4})/gi,

  // "Final Exam - Dec 10"
  /(final\s+exam|midterm|assignment|project)[\s:-]+([^-]+?)[\s:-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/gi,
];

/**
 * Month name to number mapping
 */
const MONTH_MAP: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

/**
 * Extract events using Gemini LLM
 * @param text Syllabus text content
 * @returns Array of extracted events
 */
export async function extractEventsWithLLM(
  text: string
): Promise<ExtractedEvent[]> {
  try {
    console.log("Extracting events with Gemini LLM...");
    console.log("Text length:", text.length);
    console.log("Text preview:", text.substring(0, 200) + "...");

    const events = await callGeminiAPI(text);
    console.log("Extracted events from Gemini:", events);
    return events;
  } catch (error) {
    console.error("LLM extraction failed:", error);
    console.log("Falling back to regex patterns...");
    // Fallback to regex patterns
    const regexEvents = extractEventsWithRegex(text);
    console.log("Extracted events from regex fallback:", regexEvents);
    return regexEvents;
  }
}

/**
 * Extract events using regex patterns (fallback method)
 * @param text Syllabus text content
 * @returns Array of extracted events
 */
export function extractEventsWithRegex(text: string): ExtractedEvent[] {
  const events: ExtractedEvent[] = [];

  DATE_PATTERNS.forEach((pattern) => {
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      try {
        const event = parseRegexMatch(match, text);
        if (event) {
          events.push(event);
        }
      } catch (error) {
        console.error("Error parsing regex match:", error);
      }
    }
  });

  return events;
}

/**
 * Parse a regex match into an ExtractedEvent
 * @param match Regex match result
 * @param sourceText Original text
 * @returns ExtractedEvent or null
 */
function parseRegexMatch(
  match: RegExpMatchArray,
  sourceText: string
): ExtractedEvent | null {
  try {
    const fullMatch = match[0];
    const eventType = determineEventType(match[1]?.toLowerCase() || "");
    const title = match[2]?.trim() || "Unknown Event";

    let dueDate: string;
    const confidenceScore = 0.7; // Lower confidence for regex matches

    if (match[3] && MONTH_MAP[match[3].toLowerCase()]) {
      // Format: "September 15, 2024"
      const month = MONTH_MAP[match[3].toLowerCase()];
      const day = parseInt(match[4]);
      const year = parseInt(match[5]);
      dueDate = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;
    } else if (match[3] && match[4] && match[5]) {
      // Format: "9/15/2024"
      const month = parseInt(match[3]);
      const day = parseInt(match[4]);
      const year = parseInt(match[5]);
      dueDate = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;
    } else {
      return null;
    }

    // Validate date
    const date = new Date(dueDate);
    if (isNaN(date.getTime())) {
      return null;
    }

    return {
      title: title.length > 0 ? title : `${eventType} due`,
      description: `Extracted from syllabus text`,
      eventType,
      dueDate,
      dueTime: undefined,
      confidenceScore,
      sourceText: fullMatch,
    };
  } catch (error) {
    console.error("Error parsing regex match:", error);
    return null;
  }
}

/**
 * Determine event type from text
 * @param text Text containing event type
 * @returns EventType
 */
function determineEventType(text: string): EventType {
  const lowerText = text.toLowerCase();

  if (
    lowerText.includes("exam") ||
    lowerText.includes("final") ||
    lowerText.includes("midterm")
  ) {
    return "exam";
  }
  if (lowerText.includes("quiz")) {
    return "quiz";
  }
  if (lowerText.includes("project")) {
    return "project";
  }
  if (lowerText.includes("assignment")) {
    return "assignment";
  }

  return "deadline";
}

/**
 * Simulate LLM response (replace with actual LLM API)
 * @param prompt LLM prompt
 * @param text Original text
 * @returns Mock extracted events
 */
async function simulateLLMResponse(
  prompt: string,
  text: string
): Promise<ExtractedEvent[]> {
  // This is a mock implementation - replace with actual LLM API
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API delay

  // Simple mock extraction based on common patterns
  const events: ExtractedEvent[] = [];

  // Look for common patterns
  const duePattern =
    /(assignment|exam|quiz|project|deadline)[\s:]+([^:]+?)[\s:]+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/gi;
  const matches = text.matchAll(duePattern);

  for (const match of matches) {
    const eventType = determineEventType(match[1] || "");
    const title = match[2]?.trim() || "Unknown Event";
    const month = MONTH_MAP[match[3]?.toLowerCase() || ""];
    const day = parseInt(match[4] || "1");
    const year = parseInt(match[5] || "2024");

    if (month && day && year) {
      const dueDate = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;

      events.push({
        title: title.length > 0 ? title : `${eventType} due`,
        description: `Extracted from syllabus text`,
        eventType,
        dueDate,
        dueTime: undefined,
        confidenceScore: 0.85, // Higher confidence for LLM
        sourceText: match[0],
      });
    }
  }

  return events;
}

/**
 * Validate extracted events
 * @param events Array of extracted events
 * @returns Validated events
 */
export function validateExtractedEvents(
  events: ExtractedEvent[]
): ExtractedEvent[] {
  return events.filter((event) => {
    // Validate required fields
    if (!event.title || !event.dueDate || !event.eventType) {
      return false;
    }

    // Validate date format
    const date = new Date(event.dueDate);
    if (isNaN(date.getTime())) {
      return false;
    }

    // Validate confidence score
    if (event.confidenceScore < 0 || event.confidenceScore > 1) {
      return false;
    }

    // Validate event type
    const validTypes = ["assignment", "exam", "quiz", "project", "deadline"];
    if (!validTypes.includes(event.eventType)) {
      return false;
    }

    return true;
  });
}

/**
 * Merge duplicate events based on title and date
 * @param events Array of events
 * @returns Deduplicated events
 */
export function deduplicateEvents(events: ExtractedEvent[]): ExtractedEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = `${event.title.toLowerCase()}-${event.dueDate}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Test script to check Gemini API configuration
export async function testGeminiConfiguration() {
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const GEMINI_API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

  console.log("=== Gemini API Configuration Test ===");
  console.log("GEMINI_API_KEY configured:", !!GEMINI_API_KEY);
  console.log("GEMINI_API_URL:", GEMINI_API_URL);

  if (!GEMINI_API_KEY) {
    console.error("❌ NEXT_PUBLIC_GEMINI_API_KEY is not set!");
    console.log("Please set the environment variable in your .env.local file:");
    console.log("NEXT_PUBLIC_GEMINI_API_KEY=your-gemini-api-key-here");
    return false;
  }

  console.log("✅ Gemini API key is configured");
  return true;
}
