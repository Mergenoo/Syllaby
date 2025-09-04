// Database types for Law Bandit MVP
export interface Database {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          code: string | null;
          instructor: string | null;
          semester: string | null;
          academic_year: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          code?: string | null;
          instructor?: string | null;
          semester?: string | null;
          academic_year?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          code?: string | null;
          instructor?: string | null;
          semester?: string | null;
          academic_year?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      syllabi: {
        Row: {
          id: string;
          class_id: string;
          original_filename: string | null;
          file_path: string | null;
          content_text: string | null;
          file_type: string | null;
          file_size: number | null;
          processing_status: string;
          processing_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          class_id: string;
          original_filename?: string | null;
          file_path?: string | null;
          content_text?: string | null;
          file_type?: string | null;
          file_size?: number | null;
          processing_status?: string;
          processing_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          class_id?: string;
          original_filename?: string | null;
          file_path?: string | null;
          content_text?: string | null;
          file_type?: string | null;
          file_size?: number | null;
          processing_status?: string;
          processing_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          syllabus_id: string | null;
          class_id: string;
          user_id: string;
          title: string;
          description: string | null;
          event_type: string;
          due_date: string;
          due_time: string | null;
          confidence_score: number | null;
          source_text: string | null;
          extraction_method: string | null;
          is_exported: boolean;
          exported_at: string | null;
          ics_uid: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          syllabus_id?: string | null;
          class_id: string;
          user_id: string;
          title: string;
          description?: string | null;
          event_type: string;
          due_date: string;
          due_time?: string | null;
          confidence_score?: number | null;
          source_text?: string | null;
          extraction_method?: string | null;
          is_exported?: boolean;
          exported_at?: string | null;
          ics_uid?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          syllabus_id?: string | null;
          class_id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          event_type?: string;
          due_date?: string;
          due_time?: string | null;
          confidence_score?: number | null;
          source_text?: string | null;
          extraction_method?: string | null;
          is_exported?: boolean;
          exported_at?: string | null;
          ics_uid?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          class_id: string;
          event_id: string | null;
          title: string | null;
          content: string;
          note_type: string;
          priority: string;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          class_id: string;
          event_id?: string | null;
          title?: string | null;
          content: string;
          note_type?: string;
          priority?: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          class_id?: string;
          event_id?: string | null;
          title?: string | null;
          content?: string;
          note_type?: string;
          priority?: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_user_calendar_events: {
        Args: {
          user_uuid: string;
        };
        Returns: {
          event_id: string;
          title: string;
          description: string | null;
          event_type: string;
          due_date: string;
          due_time: string | null;
          class_name: string;
          class_code: string | null;
          confidence_score: number | null;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Type aliases for easier use
export type Class = Database["public"]["Tables"]["classes"]["Row"];
export type Syllabus = Database["public"]["Tables"]["syllabi"]["Row"];
export type CalendarEvent =
  Database["public"]["Tables"]["calendar_events"]["Row"];
export type Note = Database["public"]["Tables"]["notes"]["Row"];

// Event types
export const EVENT_TYPES = {
  ASSIGNMENT: "assignment",
  EXAM: "exam",
  QUIZ: "quiz",
  PROJECT: "project",
  READING: "reading",
  DEADLINE: "deadline",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

// File types
export const FILE_TYPES = {
  PDF: "pdf",
  DOCX: "docx",
  TXT: "txt",
  PASTED: "pasted",
} as const;

export type FileType = (typeof FILE_TYPES)[keyof typeof FILE_TYPES];

// Processing status
export const PROCESSING_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type ProcessingStatus =
  (typeof PROCESSING_STATUS)[keyof typeof PROCESSING_STATUS];

// Note types
export const NOTE_TYPES = {
  GENERAL: "general",
  REMINDER: "reminder",
  STUDY_NOTE: "study_note",
  TODO: "todo",
} as const;

export type NoteType = (typeof NOTE_TYPES)[keyof typeof NOTE_TYPES];

// Priority levels
export const PRIORITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export type PriorityLevel =
  (typeof PRIORITY_LEVELS)[keyof typeof PRIORITY_LEVELS];

// Extracted event interface for LLM processing
export interface ExtractedEvent {
  title: string;
  description?: string;
  eventType: EventType;
  dueDate: string; // ISO date string
  dueTime?: string; // HH:MM format
  confidenceScore: number; // 0-1
  sourceText: string; // Original text snippet
}

// Upload response interface
export interface UploadResponse {
  success: boolean;
  syllabusId?: string;
  error?: string;
  message?: string;
}

// Processing response interface
export interface ProcessingResponse {
  success: boolean;
  events?: ExtractedEvent[];
  error?: string;
  processingTime?: number;
}

// Calendar export interface
export interface CalendarExport {
  success: boolean;
  icsContent?: string;
  filename?: string;
  error?: string;
}
