import { ExtractedEvent, EventType } from "@/types/database";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist");

    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

    const arrayBuffer = await file.arrayBuffer();

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item) => (item as { str: string }).str || "")
        .join(" ");

      fullText += pageText + "\n";
    }

    return fullText.trim();
  } catch (error) {
    console.error("PDF text extraction failed:", error);
    throw new Error("Failed to extract text from PDF");
  }
}

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

async function callGeminiAPI(text: string): Promise<ExtractedEvent[]> {
  if (!GEMINI_API_KEY) {
    console.error(
      "Gemini API key not configured. Please set NEXT_PUBLIC_GEMINI_API_KEY environment variable."
    );
    throw new Error("Gemini API key not configured");
  }

  const prompt = EXTRACTION_PROMPT + text;

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
          temperature: 0.1,
          topK: 1,
          topP: 0.8,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error response:", errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content
    ) {
      console.error("Invalid Gemini API response format:", data);
      throw new Error("Invalid response format from Gemini API");
    }

    const responseText = data.candidates[0].content.parts[0].text;

    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in Gemini response:", responseText);
      throw new Error("No JSON array found in Gemini response");
    }

    const events = JSON.parse(jsonMatch[0]);

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

const DATE_PATTERNS = [
  /(assignment|exam|quiz|project|deadline|due)[\s:]+([^:]+?)[\s:]+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/gi,

  /(assignment|exam|quiz|project|deadline|due)[\s:]+([^:]+?)[\s:]+(\d{1,2})\/(\d{1,2})\/(\d{4})/gi,

  /(final\s+exam|midterm|assignment|project)[\s:-]+([^-]+?)[\s:-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/gi,
];

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

export async function extractEventsWithLLM(
  text: string
): Promise<ExtractedEvent[]> {
  try {
    const events = await callGeminiAPI(text);

    return events;
  } catch (error) {
    console.error("LLM extraction failed:", error);

    const regexEvents = extractEventsWithRegex(text);

    return regexEvents;
  }
}

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

function parseRegexMatch(
  match: RegExpMatchArray,
  sourceText: string
): ExtractedEvent | null {
  try {
    const fullMatch = match[0];
    const eventType = determineEventType(match[1]?.toLowerCase() || "");
    const title = match[2]?.trim() || "Unknown Event";

    let dueDate: string;
    const confidenceScore = 0.7;

    if (match[3] && MONTH_MAP[match[3].toLowerCase()]) {
      const month = MONTH_MAP[match[3].toLowerCase()];
      const day = parseInt(match[4]);
      const year = parseInt(match[5]);
      dueDate = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;
    } else if (match[3] && match[4] && match[5]) {
      const month = parseInt(match[3]);
      const day = parseInt(match[4]);
      const year = parseInt(match[5]);
      dueDate = `${year}-${month.toString().padStart(2, "0")}-${day
        .toString()
        .padStart(2, "0")}`;
    } else {
      return null;
    }

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

async function simulateLLMResponse(
  prompt: string,
  text: string
): Promise<ExtractedEvent[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const events: ExtractedEvent[] = [];

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
        confidenceScore: 0.85,
        sourceText: match[0],
      });
    }
  }

  return events;
}

export function validateExtractedEvents(
  events: ExtractedEvent[]
): ExtractedEvent[] {
  return events.filter((event) => {
    if (!event.title || !event.dueDate || !event.eventType) {
      return false;
    }

    const date = new Date(event.dueDate);
    if (isNaN(date.getTime())) {
      return false;
    }

    if (event.confidenceScore < 0 || event.confidenceScore > 1) {
      return false;
    }

    const validTypes = ["assignment", "exam", "quiz", "project", "deadline"];
    if (!validTypes.includes(event.eventType)) {
      return false;
    }

    return true;
  });
}

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

export async function testGeminiConfiguration() {
  const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    console.error("❌ NEXT_PUBLIC_GEMINI_API_KEY is not set!");

    return false;
  }

  return true;
}
