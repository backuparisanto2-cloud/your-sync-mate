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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      reminder_attachments: {
        Row: {
          created_at: string
          filename: string
          id: string
          mime_type: string
          path: string
          reminder_id: string
          size_bytes: number
        }
        Insert: {
          created_at?: string
          filename: string
          id?: string
          mime_type?: string
          path: string
          reminder_id: string
          size_bytes?: number
        }
        Update: {
          created_at?: string
          filename?: string
          id?: string
          mime_type?: string
          path?: string
          reminder_id?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "reminder_attachments_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_schedules: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          kind: string
          reminder_id: string
          send_time: string
          start_date: string | null
          weekdays: number[]
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          kind?: string
          reminder_id: string
          send_time?: string
          start_date?: string | null
          weekdays?: number[]
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          kind?: string
          reminder_id?: string
          send_time?: string
          start_date?: string | null
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "reminder_schedules_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          bcc_emails: string[]
          body: string
          cc_emails: string[]
          created_at: string
          enabled: boolean
          id: string
          smtp_profile_id: string | null
          subject: string
          timezone: string
          title: string
          to_emails: string[]
          updated_at: string
        }
        Insert: {
          bcc_emails?: string[]
          body?: string
          cc_emails?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          smtp_profile_id?: string | null
          subject: string
          timezone?: string
          title: string
          to_emails?: string[]
          updated_at?: string
        }
        Update: {
          bcc_emails?: string[]
          body?: string
          cc_emails?: string[]
          created_at?: string
          enabled?: boolean
          id?: string
          smtp_profile_id?: string | null
          subject?: string
          timezone?: string
          title?: string
          to_emails?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_smtp_profile_id_fkey"
            columns: ["smtp_profile_id"]
            isOneToOne: false
            referencedRelation: "smtp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      send_logs: {
        Row: {
          error: string | null
          id: string
          occurrence_at: string | null
          recipients: string | null
          reminder_id: string | null
          reminder_title: string | null
          sent_at: string
          status: string
          trigger_source: string
        }
        Insert: {
          error?: string | null
          id?: string
          occurrence_at?: string | null
          recipients?: string | null
          reminder_id?: string | null
          reminder_title?: string | null
          sent_at?: string
          status?: string
          trigger_source?: string
        }
        Update: {
          error?: string | null
          id?: string
          occurrence_at?: string | null
          recipients?: string | null
          reminder_id?: string | null
          reminder_title?: string | null
          sent_at?: string
          status?: string
          trigger_source?: string
        }
        Relationships: [
          {
            foreignKeyName: "send_logs_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      smtp_profiles: {
        Row: {
          created_at: string
          from_email: string
          from_name: string | null
          host: string
          id: string
          last_status: string | null
          last_tested_at: string | null
          name: string
          password: string
          port: number
          tls: boolean
          updated_at: string
          username: string
          verify_cert: boolean
        }
        Insert: {
          created_at?: string
          from_email: string
          from_name?: string | null
          host: string
          id?: string
          last_status?: string | null
          last_tested_at?: string | null
          name: string
          password?: string
          port?: number
          tls?: boolean
          updated_at?: string
          username: string
          verify_cert?: boolean
        }
        Update: {
          created_at?: string
          from_email?: string
          from_name?: string | null
          host?: string
          id?: string
          last_status?: string | null
          last_tested_at?: string | null
          name?: string
          password?: string
          port?: number
          tls?: boolean
          updated_at?: string
          username?: string
          verify_cert?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
