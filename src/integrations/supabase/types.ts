export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event_category: string
          event_data: Json | null
          event_name: string
          id: string
          page_path: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_category: string
          event_data?: Json | null
          event_name: string
          id?: string
          page_path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_category?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          page_path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      applications: {
        Row: {
          applied_at: string | null
          company: string
          cover_letter: string | null
          created_at: string
          fit_level: string | null
          fit_score: number | null
          id: string
          interview_prep: Json | null
          job_description: string
          job_title: string
          requirements_analysis: Json | null
          resume_content: string | null
          resume_file_path: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          company: string
          cover_letter?: string | null
          created_at?: string
          fit_level?: string | null
          fit_score?: number | null
          id?: string
          interview_prep?: Json | null
          job_description: string
          job_title: string
          requirements_analysis?: Json | null
          resume_content?: string | null
          resume_file_path?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          company?: string
          cover_letter?: string | null
          created_at?: string
          fit_level?: string | null
          fit_score?: number | null
          id?: string
          interview_prep?: Json | null
          job_description?: string
          job_title?: string
          requirements_analysis?: Json | null
          resume_content?: string | null
          resume_file_path?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action_data: Json | null
          action_target: string | null
          action_type: string
          approval_hash: string | null
          approval_status: string | null
          approved_at: string | null
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          action_target?: string | null
          action_type: string
          approval_hash?: string | null
          approval_status?: string | null
          approved_at?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_data?: Json | null
          action_target?: string | null
          action_type?: string
          approval_hash?: string | null
          approval_status?: string | null
          approved_at?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      document_versions: {
        Row: {
          application_id: string | null
          content: string | null
          created_at: string
          created_by_action: string | null
          document_type: string
          id: string
          is_current: boolean | null
          structured_content: Json | null
          user_id: string
          version_name: string | null
          version_number: number
        }
        Insert: {
          application_id?: string | null
          content?: string | null
          created_at?: string
          created_by_action?: string | null
          document_type: string
          id?: string
          is_current?: boolean | null
          structured_content?: Json | null
          user_id: string
          version_name?: string | null
          version_number?: number
        }
        Update: {
          application_id?: string | null
          content?: string | null
          created_at?: string
          created_by_action?: string | null
          document_type?: string
          id?: string
          is_current?: boolean | null
          structured_content?: Json | null
          user_id?: string
          version_name?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notifications: {
        Row: {
          application_id: string | null
          id: string
          metadata: Json | null
          notification_type: string
          sent_at: string
          status: string | null
          subject: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          id?: string
          metadata?: Json | null
          notification_type: string
          sent_at?: string
          status?: string | null
          subject: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          id?: string
          metadata?: Json | null
          notification_type?: string
          sent_at?: string
          status?: string | null
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_requirements: {
        Row: {
          application_id: string
          category: string | null
          created_at: string
          id: string
          is_critical: boolean | null
          metadata: Json | null
          requirement_index: number
          requirement_text: string
        }
        Insert: {
          application_id: string
          category?: string | null
          created_at?: string
          id?: string
          is_critical?: boolean | null
          metadata?: Json | null
          requirement_index: number
          requirement_text: string
        }
        Update: {
          application_id?: string
          category?: string | null
          created_at?: string
          id?: string
          is_critical?: boolean | null
          metadata?: Json | null
          requirement_index?: number
          requirement_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_requirements_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email_notifications_enabled: boolean | null
          full_name: string | null
          id: string
          interview_reminder_days: number | null
          is_admin: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id?: string
          interview_reminder_days?: number | null
          is_admin?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email_notifications_enabled?: boolean | null
          full_name?: string | null
          id?: string
          interview_reminder_days?: number | null
          is_admin?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      requirement_matches: {
        Row: {
          chunk_id: string
          created_at: string
          id: string
          is_verified: boolean | null
          match_evidence: string | null
          requirement_id: string
          similarity_score: number
        }
        Insert: {
          chunk_id: string
          created_at?: string
          id?: string
          is_verified?: boolean | null
          match_evidence?: string | null
          requirement_id: string
          similarity_score: number
        }
        Update: {
          chunk_id?: string
          created_at?: string
          id?: string
          is_verified?: boolean | null
          match_evidence?: string | null
          requirement_id?: string
          similarity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "requirement_matches_chunk_id_fkey"
            columns: ["chunk_id"]
            isOneToOne: false
            referencedRelation: "resume_chunks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_matches_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "job_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_chunks: {
        Row: {
          application_id: string | null
          chunk_index: number
          chunk_type: string | null
          content: string
          created_at: string
          id: string
          metadata: Json | null
          original_pii_hash: string | null
          pii_redacted: boolean | null
          resume_type: string | null
          search_vector: unknown
          token_count: number | null
          user_id: string
        }
        Insert: {
          application_id?: string | null
          chunk_index: number
          chunk_type?: string | null
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          original_pii_hash?: string | null
          pii_redacted?: boolean | null
          resume_type?: string | null
          search_vector?: unknown
          token_count?: number | null
          user_id: string
        }
        Update: {
          application_id?: string | null
          chunk_index?: number
          chunk_type?: string | null
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          original_pii_hash?: string | null
          pii_redacted?: boolean | null
          resume_type?: string | null
          search_vector?: unknown
          token_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_chunks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      sanitization_log: {
        Row: {
          id: string
          input_type: string
          original_hash: string
          sanitized_at: string
          threats_detected: Json | null
          user_id: string | null
        }
        Insert: {
          id?: string
          input_type: string
          original_hash: string
          sanitized_at?: string
          threats_detected?: Json | null
          user_id?: string | null
        }
        Update: {
          id?: string
          input_type?: string
          original_hash?: string
          sanitized_at?: string
          threats_detected?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      usage_tracking: {
        Row: {
          created_at: string
          feature_type: string
          id: string
          updated_at: string
          usage_count: number
          usage_month: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_type: string
          id?: string
          updated_at?: string
          usage_count?: number
          usage_month: string
          user_id: string
        }
        Update: {
          created_at?: string
          feature_type?: string
          id?: string
          updated_at?: string
          usage_count?: number
          usage_month?: string
          user_id?: string
        }
        Relationships: []
      }
      user_cover_letter_templates: {
        Row: {
          content: string
          file_name: string | null
          file_path: string | null
          id: string
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_resumes: {
        Row: {
          content: string
          file_name: string
          file_path: string | null
          id: string
          resume_type: string
          updated_at: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          file_name: string
          file_path?: string | null
          id?: string
          resume_type: string
          updated_at?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          file_name?: string
          file_path?: string | null
          id?: string
          resume_type?: string
          updated_at?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_application_stats: {
        Args: { days_back?: number }
        Returns: {
          applications_created: number
          applications_submitted: number
          date: string
          interviews_scheduled: number
          offers_received: number
        }[]
      }
      get_admin_usage_stats: {
        Args: { days_back?: number }
        Returns: {
          active_users: number
          cover_letters_generated: number
          date: string
          interview_preps_generated: number
        }[]
      }
      get_admin_user_summary: {
        Args: never
        Returns: {
          total_applications: number
          total_users: number
          users_this_month: number
          users_with_applications: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
