import type { ProjectStatus } from "../types";

export type EntryType = "text" | "photo" | "audio";
export type EntrySubtype = "task" | "client_change" | null;

export type EntryMetadata = {
  transcript_text?: string | null;
  transcript_model?: string | null;
  transcript_language?: string | null;
  transcript_created_at?: string | null;
  transcript_error?: string | null;
} & Record<string, unknown>;

export type ProjectSummaries = {
  ai_summary_artisan: string | null;
  ai_summary_client: string | null;
  ai_summary_artisan_short?: string | null;
  ai_summary_artisan_detail?: string | null;
  ai_summary_client_short?: string | null;
  ai_summary_client_detail?: string | null;
  ai_summary_updated_at: string | null;
};

export type ClientInfo = {
  client_first_name: string | null;
  client_last_name: string | null;
  client_address: string | null;
  client_city: string | null;
  client_postal_code: string | null;
  client_phone: string | null;
  client_email: string | null;
};

export type Project = {
  id: string;
  name: string;
  status: ProjectStatus;
  description: string | null;
  created_at: string;
} & ClientInfo;

export type StatusEvent = {
  id: string;
  project_id: string;
  old_status: ProjectStatus | null;
  new_status: ProjectStatus;
  changed_at: string;
  changed_by: string | null;
};

export type TimelineItem =
  | { kind: "entry"; created_at: string; entry: Entry }
  | { kind: "status"; created_at: string; event: StatusEvent };

export type Entry = {
  id: string;
  entry_type: EntryType;
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  metadata?: EntryMetadata | null;
  created_by: string;
  created_at: string;
  entry_subtype?: EntrySubtype;
  is_active?: boolean;
  parent_entry_id?: string | null;
  superseded_at?: string | null;
  optimistic?: boolean;
};
