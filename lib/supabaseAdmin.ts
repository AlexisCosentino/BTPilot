import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string;
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_user_id: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_user_id?: string;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
          status: string;
          location: string | null;
          client_first_name: string | null;
          client_last_name: string | null;
          client_address: string | null;
          client_city: string | null;
          client_postal_code: string | null;
          client_phone: string | null;
          client_email: string | null;
          created_by: string;
          starts_on: string | null;
          ends_on: string | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
          status?: string;
          location?: string | null;
          client_first_name?: string | null;
          client_last_name?: string | null;
          client_address?: string | null;
          client_city?: string | null;
          client_postal_code?: string | null;
          client_phone?: string | null;
          client_email?: string | null;
          created_by: string;
          starts_on?: string | null;
          ends_on?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          location?: string | null;
          client_first_name?: string | null;
          client_last_name?: string | null;
          client_address?: string | null;
          client_city?: string | null;
          client_postal_code?: string | null;
          client_phone?: string | null;
          client_email?: string | null;
          created_by?: string;
          starts_on?: string | null;
          ends_on?: string | null;
          metadata?: Record<string, unknown> | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_status_events: {
        Row: {
          id: string;
          project_id: string;
          old_status: string | null;
          new_status: string;
          changed_at: string;
          changed_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          old_status?: string | null;
          new_status: string;
          changed_at?: string;
          changed_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          old_status?: string | null;
          new_status?: string;
          changed_at?: string;
          changed_by?: string | null;
        };
        Relationships: [];
      };
      company_members: {
        Row: {
          id: string;
          company_id: string;
          user_id: string;
          supabase_user_id: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          user_id: string;
          supabase_user_id?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          user_id?: string;
          supabase_user_id?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_entries: {
        Row: {
          id: string;
          project_id: string;
          company_id: string;
          entry_type: Database["public"]["Enums"]["project_entry_type"];
          text_content: string | null;
          photo_url: string | null;
          audio_url: string | null;
          metadata: Record<string, unknown> | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          entry_subtype: "task" | "client_change" | null;
          is_active: boolean;
          parent_entry_id: string | null;
          superseded_at: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          company_id: string;
          entry_type: Database["public"]["Enums"]["project_entry_type"];
          text_content?: string | null;
          photo_url?: string | null;
          audio_url?: string | null;
          metadata?: Record<string, unknown> | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          entry_subtype?: "task" | "client_change" | null;
          is_active?: boolean;
          parent_entry_id?: string | null;
          superseded_at?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          company_id?: string;
          entry_type?: Database["public"]["Enums"]["project_entry_type"];
          text_content?: string | null;
          photo_url?: string | null;
          audio_url?: string | null;
          metadata?: Record<string, unknown> | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          entry_subtype?: "task" | "client_change" | null;
          is_active?: boolean;
          parent_entry_id?: string | null;
          superseded_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_entry_type: "text" | "photo" | "audio";
      project_status:
        | "draft"
        | "planned"
        | "in_progress"
        | "on_hold"
        | "completed"
        | "canceled";
      quote_status: "draft" | "sent" | "accepted" | "rejected" | "expired";
      task_status: "open" | "in_progress" | "blocked" | "completed" | "canceled";
    };
    CompositeTypes: Record<string, never>;
  };
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const globalForSupabase = globalThis as unknown as {
  supabaseAdmin?: SupabaseClient<Database>;
};

if (!supabaseUrl) {
  throw new Error("Missing env NEXT_PUBLIC_SUPABASE_URL");
}

if (!serviceRoleKey) {
  throw new Error("Missing env SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin =
  globalForSupabase.supabaseAdmin ??
  createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

if (process.env.NODE_ENV !== "production") {
  globalForSupabase.supabaseAdmin = supabaseAdmin;
}
