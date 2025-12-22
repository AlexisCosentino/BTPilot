export type EntryType = "text" | "photo" | "audio";
export type EntrySubtype = "task" | "client_change" | null;

export type Project = {
  id: string;
  name: string;
  status: string;
  description: string | null;
  created_at: string;
};

export type Entry = {
  id: string;
  entry_type: EntryType;
  text_content: string | null;
  photo_url: string | null;
  audio_url: string | null;
  created_by: string;
  created_at: string;
  entry_subtype?: EntrySubtype;
  is_active?: boolean;
  parent_entry_id?: string | null;
  superseded_at?: string | null;
  optimistic?: boolean;
};
