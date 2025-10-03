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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      process_1: {
        Row: {
          f1_index: string
          f1_name: string
          is_active: boolean | null
          level1_id: number
          note: string | null
          sort: string | null
        }
        Insert: {
          f1_index: string
          f1_name: string
          is_active?: boolean | null
          level1_id?: number
          note?: string | null
          sort?: string | null
        }
        Update: {
          f1_index?: string
          f1_name?: string
          is_active?: boolean | null
          level1_id?: number
          note?: string | null
          sort?: string | null
        }
        Relationships: []
      }
      process_2: {
        Row: {
          f1_index: string | null
          f2_index: string
          f2_name: string | null
          is_active: boolean | null
          note: string | null
          sort: string | null
        }
        Insert: {
          f1_index?: string | null
          f2_index: string
          f2_name?: string | null
          is_active?: boolean | null
          note?: string | null
          sort?: string | null
        }
        Update: {
          f1_index?: string | null
          f2_index?: string
          f2_name?: string | null
          is_active?: boolean | null
          note?: string | null
          sort?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_2_f1_index_fkey"
            columns: ["f1_index"]
            isOneToOne: false
            referencedRelation: "process_1"
            referencedColumns: ["f1_index"]
          },
        ]
      }
      process_3: {
        Row: {
          f2_index: string | null
          f3_index: string
          f3_name: string | null
          is_active: boolean | null
          note: string | null
          sort: string | null
        }
        Insert: {
          f2_index?: string | null
          f3_index: string
          f3_name?: string | null
          is_active?: boolean | null
          note?: string | null
          sort?: string | null
        }
        Update: {
          f2_index?: string | null
          f3_index?: string
          f3_name?: string | null
          is_active?: boolean | null
          note?: string | null
          sort?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_3_f2_index_fkey"
            columns: ["f2_index"]
            isOneToOne: false
            referencedRelation: "process_2"
            referencedColumns: ["f2_index"]
          },
        ]
      }
      process_4: {
        Row: {
          f3_index: string | null
          f4_index: string
          f4_name: string | null
          is_active: boolean | null
          note: string | null
          sort: string | null
        }
        Insert: {
          f3_index?: string | null
          f4_index: string
          f4_name?: string | null
          is_active?: boolean | null
          note?: string | null
          sort?: string | null
        }
        Update: {
          f3_index?: string | null
          f4_index?: string
          f4_name?: string | null
          is_active?: boolean | null
          note?: string | null
          sort?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_4_f3_index_fkey"
            columns: ["f3_index"]
            isOneToOne: false
            referencedRelation: "process_3"
            referencedColumns: ["f3_index"]
          },
        ]
      }
      systems: {
        Row: {
          created_at: string | null
          is_active: boolean | null
          system_id: number
          system_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          is_active?: boolean | null
          system_id?: number
          system_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          is_active?: boolean | null
          system_id?: number
          system_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_responses: {
        Row: {
          created_at: string
          f4_index: string | null
          id: number
          notes: string | null
          system_id: number | null
        }
        Insert: {
          created_at?: string
          f4_index?: string | null
          id?: number
          notes?: string | null
          system_id?: number | null
        }
        Update: {
          created_at?: string
          f4_index?: string | null
          id?: number
          notes?: string | null
          system_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_responses_f4_index_fkey"
            columns: ["f4_index"]
            isOneToOne: false
            referencedRelation: "process_4"
            referencedColumns: ["f4_index"]
          },
          {
            foreignKeyName: "user_responses_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["system_id"]
          },
        ]
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
