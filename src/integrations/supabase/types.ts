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
      admin_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      appointment_messages: {
        Row: {
          appointment_id: string | null
          id: string
          message_type: string
          notes: string | null
          patient_id: string
          sent_at: string
          sent_by: string | null
          status: string
        }
        Insert: {
          appointment_id?: string | null
          id?: string
          message_type: string
          notes?: string | null
          patient_id: string
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Update: {
          appointment_id?: string | null
          id?: string
          message_type?: string
          notes?: string | null
          patient_id?: string
          sent_at?: string
          sent_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_messages_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_type: string
          created_at: string
          date: string
          duration: number
          id: string
          notes: string | null
          patient_id: string
          professional: string | null
          schedule_sent: boolean
          schedule_sent_at: string | null
          schedule_sent_by: string | null
          status: string
          time: string
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          created_at?: string
          date: string
          duration?: number
          id?: string
          notes?: string | null
          patient_id: string
          professional?: string | null
          schedule_sent?: boolean
          schedule_sent_at?: string | null
          schedule_sent_by?: string | null
          status?: string
          time: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          date?: string
          duration?: number
          id?: string
          notes?: string | null
          patient_id?: string
          professional?: string | null
          schedule_sent?: boolean
          schedule_sent_at?: string | null
          schedule_sent_by?: string | null
          status?: string
          time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          reason: string | null
          status: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          reason?: string | null
          status: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      content: {
        Row: {
          body: string | null
          category: string
          created_at: string
          description: string | null
          featured: boolean
          id: string
          image_url: string | null
          notify: boolean
          published: boolean
          published_at: string | null
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          notify?: boolean
          published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          notify?: boolean
          published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      content_views: {
        Row: {
          content_id: string
          id: string
          patient_id: string
          viewed_at: string
        }
        Insert: {
          content_id: string
          id?: string
          patient_id: string
          viewed_at?: string
        }
        Update: {
          content_id?: string
          id?: string
          patient_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_views_content_id_fkey"
            columns: ["content_id"]
            isOneToOne: false
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_views_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_read: boolean
          link: string | null
          message: string
          patient_id: string
          related_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          link?: string | null
          message: string
          patient_id: string
          related_id?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_read?: boolean
          link?: string | null
          message?: string
          patient_id?: string
          related_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_accounts: {
        Row: {
          account_status: string
          created_at: string
          email: string | null
          id: string
          patient_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          email?: string | null
          id?: string
          patient_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          created_at?: string
          email?: string | null
          id?: string
          patient_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_accounts_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          patient_id: string
          previous_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          patient_id: string
          previous_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          patient_id?: string
          previous_data?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_audit_log_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_status_history: {
        Row: {
          created_at: string
          id: string
          new_status: string
          notes: string | null
          patient_id: string
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_status: string
          notes?: string | null
          patient_id: string
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_status?: string
          notes?: string | null
          patient_id?: string
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_status_history_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          abandonment_date: string | null
          abandonment_reason: string | null
          address: string | null
          archived: boolean
          birth_date: string | null
          city: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          document_number: string | null
          email: string | null
          first_consultation_date: string | null
          first_name: string
          full_name: string | null
          id: string
          last_name: string
          next_review_date: string | null
          next_review_reason: string | null
          next_review_time: string | null
          notes: string | null
          origin: string
          phone: string | null
          registration_source: string
          status: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          abandonment_date?: string | null
          abandonment_reason?: string | null
          address?: string | null
          archived?: boolean
          birth_date?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          document_number?: string | null
          email?: string | null
          first_consultation_date?: string | null
          first_name: string
          full_name?: string | null
          id?: string
          last_name: string
          next_review_date?: string | null
          next_review_reason?: string | null
          next_review_time?: string | null
          notes?: string | null
          origin?: string
          phone?: string | null
          registration_source?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          abandonment_date?: string | null
          abandonment_reason?: string | null
          address?: string | null
          archived?: boolean
          birth_date?: string | null
          city?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          document_number?: string | null
          email?: string | null
          first_consultation_date?: string | null
          first_name?: string
          full_name?: string | null
          id?: string
          last_name?: string
          next_review_date?: string | null
          next_review_reason?: string | null
          next_review_time?: string | null
          notes?: string | null
          origin?: string
          phone?: string | null
          registration_source?: string
          status?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          active: boolean
          created_at: string
          device_token: string
          id: string
          patient_id: string
          platform: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          device_token: string
          id?: string
          patient_id: string
          platform?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          device_token?: string
          id?: string
          patient_id?: string
          platform?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_devices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          professional: string | null
          reminder_sent: boolean
          reminder_sent_at: string | null
          review_date: string
          review_time: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          professional?: string | null
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          review_date: string
          review_time?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          professional?: string | null
          reminder_sent?: boolean
          reminder_sent_at?: string | null
          review_date?: string
          review_time?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_patient_id: { Args: never; Returns: string }
      generate_appointment_reminders: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      patient_exists: {
        Args: { _document: string; _phone: string }
        Returns: boolean
      }
      register_patient_portal: {
        Args: {
          _address?: string
          _birth_date: string
          _document_number: string
          _email?: string
          _first_name: string
          _last_name: string
          _phone?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "recepcion" | "paciente"
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
    Enums: {
      app_role: ["admin", "recepcion", "paciente"],
    },
  },
} as const
