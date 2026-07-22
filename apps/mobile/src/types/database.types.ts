export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          claimed_at: string
          coins_spent: number
          coupon_id: string
          created_at: string
          id: string
          redemption_code: string
          status: Database["public"]["Enums"]["redemption_status"]
          use_expires_at: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          claimed_at?: string
          coins_spent: number
          coupon_id: string
          created_at?: string
          id?: string
          redemption_code: string
          status?: Database["public"]["Enums"]["redemption_status"]
          use_expires_at?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          claimed_at?: string
          coins_spent?: number
          coupon_id?: string
          created_at?: string
          id?: string
          redemption_code?: string
          status?: Database["public"]["Enums"]["redemption_status"]
          use_expires_at?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          benefit_type: Database["public"]["Enums"]["benefit_type"]
          category: string | null
          claim_window_end: string | null
          claim_window_start: string | null
          created_at: string
          description: string | null
          id: string
          merchant_id: string
          price_coins: number
          quota: number | null
          quota_remaining: number | null
          redemption_location: Database["public"]["Enums"]["redemption_location"]
          tier: Database["public"]["Enums"]["coupon_tier"] | null
          title: string
          use_window_days: number | null
        }
        Insert: {
          active?: boolean
          benefit_type: Database["public"]["Enums"]["benefit_type"]
          category?: string | null
          claim_window_end?: string | null
          claim_window_start?: string | null
          created_at?: string
          description?: string | null
          id?: string
          merchant_id: string
          price_coins: number
          quota?: number | null
          quota_remaining?: number | null
          redemption_location?: Database["public"]["Enums"]["redemption_location"]
          tier?: Database["public"]["Enums"]["coupon_tier"] | null
          title: string
          use_window_days?: number | null
        }
        Update: {
          active?: boolean
          benefit_type?: Database["public"]["Enums"]["benefit_type"]
          category?: string | null
          claim_window_end?: string | null
          claim_window_start?: string | null
          created_at?: string
          description?: string | null
          id?: string
          merchant_id?: string
          price_coins?: number
          quota?: number | null
          quota_remaining?: number | null
          redemption_location?: Database["public"]["Enums"]["redemption_location"]
          tier?: Database["public"]["Enums"]["coupon_tier"] | null
          title?: string
          use_window_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_members: {
        Row: {
          created_at: string
          merchant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          merchant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          merchant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_members_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          active: boolean
          address: string | null
          category: string | null
          commission_rate: number
          created_at: string
          id: string
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          category?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
        }
        Update: {
          active?: boolean
          address?: string | null
          category?: string | null
          commission_rate?: number
          created_at?: string
          id?: string
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
        }
        Relationships: []
      }
      mission_claims: {
        Row: {
          claim_day: string
          coins: number
          created_at: string
          id: string
          mission_id: string
          user_id: string
        }
        Insert: {
          claim_day: string
          coins: number
          created_at?: string
          id?: string
          mission_id: string
          user_id: string
        }
        Update: {
          claim_day?: string
          coins?: number
          created_at?: string
          id?: string
          mission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_claims_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "missions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      missions: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string
          id: string
          kind: Database["public"]["Enums"]["mission_kind"]
          reward_coins: number
          target: number
          title: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description: string
          id?: string
          kind: Database["public"]["Enums"]["mission_kind"]
          reward_coins: number
          target: number
          title: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string
          id?: string
          kind?: Database["public"]["Enums"]["mission_kind"]
          reward_coins?: number
          target?: number
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          coins: number
          created_at: string
          id: string
          total_trees_mapped: number
          total_trees_validated: number
          username: string
        }
        Insert: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          id: string
          total_trees_mapped?: number
          total_trees_validated?: number
          username: string
        }
        Update: {
          avatar_url?: string | null
          coins?: number
          created_at?: string
          id?: string
          total_trees_mapped?: number
          total_trees_validated?: number
          username?: string
        }
        Relationships: []
      }
      species: {
        Row: {
          common_name: string
          created_at: string
          default_remonitoring_days: number | null
          id: string
          scientific_name: string | null
        }
        Insert: {
          common_name: string
          created_at?: string
          default_remonitoring_days?: number | null
          id?: string
          scientific_name?: string | null
        }
        Update: {
          common_name?: string
          created_at?: string
          default_remonitoring_days?: number | null
          id?: string
          scientific_name?: string | null
        }
        Relationships: []
      }
      tree_reports: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          reason: Database["public"]["Enums"]["tree_report_reason"]
          tree_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          reason: Database["public"]["Enums"]["tree_report_reason"]
          tree_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["tree_report_reason"]
          tree_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_reports_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tree_validations: {
        Row: {
          circumference_cm: number | null
          conflicts: Database["public"]["Enums"]["tree_conflict"][] | null
          created_at: string
          gps_accuracy: number | null
          health: Database["public"]["Enums"]["tree_health"]
          height_band: Database["public"]["Enums"]["tree_height_band"] | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          photo_trunk_url: string | null
          photo_url: string
          site_context: Database["public"]["Enums"]["tree_site_context"] | null
          species_id: string | null
          species_name: string | null
          tree_id: string
          urgency: Database["public"]["Enums"]["tree_urgency"] | null
          user_id: string
        }
        Insert: {
          circumference_cm?: number | null
          conflicts?: Database["public"]["Enums"]["tree_conflict"][] | null
          created_at?: string
          gps_accuracy?: number | null
          health: Database["public"]["Enums"]["tree_health"]
          height_band?: Database["public"]["Enums"]["tree_height_band"] | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_trunk_url?: string | null
          photo_url: string
          site_context?: Database["public"]["Enums"]["tree_site_context"] | null
          species_id?: string | null
          species_name?: string | null
          tree_id: string
          urgency?: Database["public"]["Enums"]["tree_urgency"] | null
          user_id: string
        }
        Update: {
          circumference_cm?: number | null
          conflicts?: Database["public"]["Enums"]["tree_conflict"][] | null
          created_at?: string
          gps_accuracy?: number | null
          health?: Database["public"]["Enums"]["tree_health"]
          height_band?: Database["public"]["Enums"]["tree_height_band"] | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          photo_trunk_url?: string | null
          photo_url?: string
          site_context?: Database["public"]["Enums"]["tree_site_context"] | null
          species_id?: string | null
          species_name?: string | null
          tree_id?: string
          urgency?: Database["public"]["Enums"]["tree_urgency"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tree_validations_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_validations_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tree_validations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trees: {
        Row: {
          audit_reason: string | null
          circumference_cm: number | null
          conflicts: Database["public"]["Enums"]["tree_conflict"][]
          created_at: string
          dap: number
          disputed_fields: string[]
          gps_accuracy: number | null
          health: Database["public"]["Enums"]["tree_health"]
          height_band: Database["public"]["Enums"]["tree_height_band"] | null
          id: string
          latitude: number
          lifecycle_stage:
            | Database["public"]["Enums"]["tree_lifecycle_stage"]
            | null
          longitude: number
          notes: string | null
          origin: Database["public"]["Enums"]["tree_origin"]
          photo_trunk_url: string | null
          photo_url: string
          planted_date: string | null
          site_context: Database["public"]["Enums"]["tree_site_context"] | null
          source: Database["public"]["Enums"]["tree_source"]
          species_id: string | null
          species_name: string | null
          status: Database["public"]["Enums"]["tree_status"]
          under_audit: boolean
          updated_at: string
          urgency: Database["public"]["Enums"]["tree_urgency"]
          user_id: string
          validations_count: number
        }
        Insert: {
          audit_reason?: string | null
          circumference_cm?: number | null
          conflicts?: Database["public"]["Enums"]["tree_conflict"][]
          created_at?: string
          dap: number
          disputed_fields?: string[]
          gps_accuracy?: number | null
          health: Database["public"]["Enums"]["tree_health"]
          height_band?: Database["public"]["Enums"]["tree_height_band"] | null
          id?: string
          latitude: number
          lifecycle_stage?:
            | Database["public"]["Enums"]["tree_lifecycle_stage"]
            | null
          longitude: number
          notes?: string | null
          origin?: Database["public"]["Enums"]["tree_origin"]
          photo_trunk_url?: string | null
          photo_url: string
          planted_date?: string | null
          site_context?: Database["public"]["Enums"]["tree_site_context"] | null
          source?: Database["public"]["Enums"]["tree_source"]
          species_id?: string | null
          species_name?: string | null
          status?: Database["public"]["Enums"]["tree_status"]
          under_audit?: boolean
          updated_at?: string
          urgency?: Database["public"]["Enums"]["tree_urgency"]
          user_id: string
          validations_count?: number
        }
        Update: {
          audit_reason?: string | null
          circumference_cm?: number | null
          conflicts?: Database["public"]["Enums"]["tree_conflict"][]
          created_at?: string
          dap?: number
          disputed_fields?: string[]
          gps_accuracy?: number | null
          health?: Database["public"]["Enums"]["tree_health"]
          height_band?: Database["public"]["Enums"]["tree_height_band"] | null
          id?: string
          latitude?: number
          lifecycle_stage?:
            | Database["public"]["Enums"]["tree_lifecycle_stage"]
            | null
          longitude?: number
          notes?: string | null
          origin?: Database["public"]["Enums"]["tree_origin"]
          photo_trunk_url?: string | null
          photo_url?: string
          planted_date?: string | null
          site_context?: Database["public"]["Enums"]["tree_site_context"] | null
          source?: Database["public"]["Enums"]["tree_source"]
          species_id?: string | null
          species_name?: string | null
          status?: Database["public"]["Enums"]["tree_status"]
          under_audit?: boolean
          updated_at?: string
          urgency?: Database["public"]["Enums"]["tree_urgency"]
          user_id?: string
          validations_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "trees_species_id_fkey"
            columns: ["species_id"]
            isOneToOne: false
            referencedRelation: "species"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          coupon_redemption_id: string | null
          created_at: string
          description: string
          id: string
          tree_id: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
        }
        Insert: {
          amount: number
          coupon_redemption_id?: string | null
          created_at?: string
          description: string
          id?: string
          tree_id?: string | null
          type: Database["public"]["Enums"]["wallet_txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          coupon_redemption_id?: string | null
          created_at?: string
          description?: string
          id?: string
          tree_id?: string | null
          type?: Database["public"]["Enums"]["wallet_txn_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_coupon_redemption_id_fkey"
            columns: ["coupon_redemption_id"]
            isOneToOne: false
            referencedRelation: "coupon_redemptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_validation_consensus: {
        Args: { p_tree_id: string }
        Returns: undefined
      }
      claim_mission: {
        Args: { p_mission_id: string }
        Returns: {
          coins_awarded: number
          new_balance: number
        }[]
      }
      daily_missions: {
        Args: never
        Returns: {
          claimed: boolean
          code: string
          completed: boolean
          description: string
          kind: Database["public"]["Enums"]["mission_kind"]
          mission_id: string
          progress: number
          reward_coins: number
          target: number
          title: string
        }[]
      }
      distance_m: {
        Args: { lat1: number; lat2: number; lng1: number; lng2: number }
        Returns: number
      }
      is_merchant_member: { Args: { p_merchant_id: string }; Returns: boolean }
      leaderboard: {
        Args: { p_limit?: number; p_period?: string }
        Returns: {
          place: number
          points: number
          trees_mapped: number
          user_id: string
          username: string
          validations_done: number
        }[]
      }
      leaderboard_me: {
        Args: { p_period?: string }
        Returns: {
          place: number
          points: number
          total_ranked: number
          trees_mapped: number
          username: string
          validations_done: number
        }[]
      }
      majority_text: {
        Args: { p_vals: string[] }
        Returns: {
          disputed: boolean
          winner: string
        }[]
      }
      nearby_trees: {
        Args: { p_lat: number; p_lng: number; p_radius_m?: number }
        Returns: {
          created_at: string
          dap: number
          distance_meters: number
          health: Database["public"]["Enums"]["tree_health"]
          id: string
          latitude: number
          longitude: number
          photo_url: string
          species_name: string
          status: Database["public"]["Enums"]["tree_status"]
          validations_count: number
        }[]
      }
      redeem_coupon: {
        Args: { p_coupon_id: string }
        Returns: {
          claimed_at: string
          coins_spent: number
          coupon_id: string
          created_at: string
          id: string
          redemption_code: string
          status: Database["public"]["Enums"]["redemption_status"]
          use_expires_at: string | null
          used_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "coupon_redemptions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      today_start_bo: { Args: never; Returns: string }
      validate_redemption: {
        Args: { p_code: string }
        Returns: {
          code: string
          coins_spent: number
          coupon_title: string
          merchant_name: string
          redemption_id: string
          used_at: string
        }[]
      }
    }
    Enums: {
      benefit_type: "product" | "discount" | "service" | "ticket"
      coupon_tier: "short" | "medium" | "long"
      mission_kind:
        | "map_trees"
        | "map_with_species"
        | "verify_trees"
        | "close_validation"
      redemption_location: "app" | "on_site"
      redemption_status: "claimed" | "used" | "expired"
      tree_conflict:
        | "overhead_cables"
        | "sidewalk_damage"
        | "pole_or_light"
        | "small_pit"
        | "against_wall"
      tree_health: "good" | "regular" | "poor" | "dead"
      tree_height_band: "lt3" | "b3_6" | "b6_12" | "gt12"
      tree_lifecycle_stage: "seedling" | "young" | "mature"
      tree_origin: "planted" | "existing"
      tree_report_reason: "suspicious" | "damaged" | "dead" | "other"
      tree_site_context:
        | "sidewalk"
        | "median"
        | "plaza_park"
        | "riverside"
        | "private_yard"
        | "other"
      tree_source: "arbu_games" | "arbu_migration"
      tree_status:
        | "pending"
        | "stalled"
        | "validated"
        | "unverifiable"
        | "rejected"
      tree_urgency:
        | "none"
        | "dry_dead"
        | "burned"
        | "pest"
        | "mechanical_damage"
        | "being_felled"
      wallet_txn_type: "earn" | "redeem"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      benefit_type: ["product", "discount", "service", "ticket"],
      coupon_tier: ["short", "medium", "long"],
      mission_kind: [
        "map_trees",
        "map_with_species",
        "verify_trees",
        "close_validation",
      ],
      redemption_location: ["app", "on_site"],
      redemption_status: ["claimed", "used", "expired"],
      tree_conflict: [
        "overhead_cables",
        "sidewalk_damage",
        "pole_or_light",
        "small_pit",
        "against_wall",
      ],
      tree_health: ["good", "regular", "poor", "dead"],
      tree_height_band: ["lt3", "b3_6", "b6_12", "gt12"],
      tree_lifecycle_stage: ["seedling", "young", "mature"],
      tree_origin: ["planted", "existing"],
      tree_report_reason: ["suspicious", "damaged", "dead", "other"],
      tree_site_context: [
        "sidewalk",
        "median",
        "plaza_park",
        "riverside",
        "private_yard",
        "other",
      ],
      tree_source: ["arbu_games", "arbu_migration"],
      tree_status: [
        "pending",
        "stalled",
        "validated",
        "unverifiable",
        "rejected",
      ],
      tree_urgency: [
        "none",
        "dry_dead",
        "burned",
        "pest",
        "mechanical_damage",
        "being_felled",
      ],
      wallet_txn_type: ["earn", "redeem"],
    },
  },
} as const
