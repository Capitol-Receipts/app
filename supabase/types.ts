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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_log: {
        Row: {
          action: string
          admin: string
          at: string
          detail: Json | null
          id: number
        }
        Insert: {
          action: string
          admin: string
          at?: string
          detail?: Json | null
          id?: never
        }
        Update: {
          action?: string
          admin?: string
          at?: string
          detail?: Json | null
          id?: never
        }
        Relationships: []
      }
      admins: {
        Row: {
          added_at: string
          email: string
        }
        Insert: {
          added_at?: string
          email: string
        }
        Update: {
          added_at?: string
          email?: string
        }
        Relationships: []
      }
      alert_log: {
        Row: {
          last_sent: string | null
          state: Json
          user_id: string
        }
        Insert: {
          last_sent?: string | null
          state?: Json
          user_id: string
        }
        Update: {
          last_sent?: string | null
          state?: Json
          user_id?: string
        }
        Relationships: []
      }
      app_meta: {
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
      apple_tokens: {
        Row: {
          client_id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      appointees: {
        Row: {
          detail: Json
          id: string
          indexable: boolean
          light: Json
          name: string
          ord: number | null
          updated_at: string
        }
        Insert: {
          detail?: Json
          id: string
          indexable?: boolean
          light: Json
          name: string
          ord?: number | null
          updated_at?: string
        }
        Update: {
          detail?: Json
          id?: string
          indexable?: boolean
          light?: Json
          name?: string
          ord?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      billing_email_log: {
        Row: {
          event_id: string
          kind: string
          sent_at: string
          user_id: string | null
        }
        Insert: {
          event_id: string
          kind: string
          sent_at?: string
          user_id?: string | null
        }
        Update: {
          event_id?: string
          kind?: string
          sent_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bills: {
        Row: {
          became_law: string | null
          bill_type: string
          congress: number
          detail: Json
          indexable: boolean
          key: string
          light: Json
          number: number
          title: string | null
          updated_at: string
        }
        Insert: {
          became_law?: string | null
          bill_type: string
          congress: number
          detail?: Json
          indexable?: boolean
          key: string
          light: Json
          number: number
          title?: string | null
          updated_at?: string
        }
        Update: {
          became_law?: string | null
          bill_type?: string
          congress?: number
          detail?: Json
          indexable?: boolean
          key?: string
          light?: Json
          number?: number
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      careers: {
        Row: {
          detail: Json
          id: string
          light: Json
          name: string
          updated_at: string
        }
        Insert: {
          detail?: Json
          id: string
          light: Json
          name: string
          updated_at?: string
        }
        Update: {
          detail?: Json
          id?: string
          light?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      caucuses: {
        Row: {
          data: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      committees: {
        Row: {
          data: Json
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          data: Json
          id: string
          indexable: boolean
          name: string
          score: number | null
          tickers: string[] | null
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          indexable?: boolean
          name: string
          score?: number | null
          tickers?: string[] | null
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          indexable?: boolean
          name?: string
          score?: number | null
          tickers?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      congress_votes: {
        Row: {
          chamber: string
          congress: number
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          chamber: string
          congress: number
          data: Json
          id: string
          updated_at?: string
        }
        Update: {
          chamber?: string
          congress?: number
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      corrections: {
        Row: {
          after: string | null
          before: string | null
          created_at: string
          fixed_on: string
          id: number
          page: string | null
          what: string
        }
        Insert: {
          after?: string | null
          before?: string | null
          created_at?: string
          fixed_on?: string
          id?: never
          page?: string | null
          what: string
        }
        Update: {
          after?: string | null
          before?: string | null
          created_at?: string
          fixed_on?: string
          id?: never
          page?: string | null
          what?: string
        }
        Relationships: []
      }
      ethics_matters: {
        Row: {
          data: Json
          id: string
          indexable: boolean
          ord: number | null
          title: string
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          indexable?: boolean
          ord?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          indexable?: boolean
          ord?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      judges: {
        Row: {
          active: boolean | null
          conf: string | null
          court: string | null
          data: Json
          id: string
          name: string
          party: string | null
          pres: string | null
          senior: boolean | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          conf?: string | null
          court?: string | null
          data: Json
          id: string
          name: string
          party?: string | null
          pres?: string | null
          senior?: boolean | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          conf?: string | null
          court?: string | null
          data?: Json
          id?: string
          name?: string
          party?: string | null
          pres?: string | null
          senior?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      light_cache: {
        Row: {
          kind: string
          payload: Json
          payload_json: Json | null
          updated_at: string
        }
        Insert: {
          kind: string
          payload: Json
          payload_json?: Json | null
          updated_at?: string
        }
        Update: {
          kind?: string
          payload?: Json
          payload_json?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      lobby_clients: {
        Row: {
          detail: Json
          id: string
          indexable: boolean
          light: Json
          name: string
          spend: number | null
          updated_at: string
        }
        Insert: {
          detail?: Json
          id: string
          indexable?: boolean
          light: Json
          name: string
          spend?: number | null
          updated_at?: string
        }
        Update: {
          detail?: Json
          id?: string
          indexable?: boolean
          light?: Json
          name?: string
          spend?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      lobby_firms: {
        Row: {
          data: Json
          id: string
          income: number | null
          indexable: boolean
          name: string
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          income?: number | null
          indexable?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          income?: number | null
          indexable?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_extras: {
        Row: {
          data: Json
          id: string
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          chamber: string
          data: Json
          district: number | null
          id: string
          lite: Json | null
          name: string
          ord: number | null
          party: string
          state: string
          updated_at: string
        }
        Insert: {
          chamber: string
          data: Json
          district?: number | null
          id: string
          lite?: Json | null
          name: string
          ord?: number | null
          party: string
          state: string
          updated_at?: string
        }
        Update: {
          chamber?: string
          data?: Json
          district?: number | null
          id?: string
          lite?: Json | null
          name?: string
          ord?: number | null
          party?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      nominations: {
        Row: {
          confirmed_on: string | null
          data: Json
          id: string
          name: string
          ord: number | null
          position: string | null
          updated_at: string
        }
        Insert: {
          confirmed_on?: string | null
          data: Json
          id: string
          name: string
          ord?: number | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          confirmed_on?: string | null
          data?: Json
          id?: string
          name?: string
          ord?: number | null
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      outside_groups: {
        Row: {
          data: Json
          id: string
          indexable: boolean
          name: string
          total: number | null
          updated_at: string
        }
        Insert: {
          data: Json
          id: string
          indexable?: boolean
          name: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          data?: Json
          id?: string
          indexable?: boolean
          name?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      pacs: {
        Row: {
          category: string | null
          cycle_total: number | null
          detail: Json
          id: string
          indexable: boolean
          light: Json
          name: string
          total: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          cycle_total?: number | null
          detail?: Json
          id: string
          indexable?: boolean
          light: Json
          name: string
          total?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          cycle_total?: number | null
          detail?: Json
          id?: string
          indexable?: boolean
          light?: Json
          name?: string
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          detail: Json
          first_year: number | null
          id: string
          last_year: number | null
          light: Json
          name: string
          ord: number | null
          party: string | null
          updated_at: string
        }
        Insert: {
          detail?: Json
          first_year?: number | null
          id: string
          last_year?: number | null
          light: Json
          name: string
          ord?: number | null
          party?: string | null
          updated_at?: string
        }
        Update: {
          detail?: Json
          first_year?: number | null
          id?: string
          last_year?: number | null
          light?: Json
          name?: string
          ord?: number | null
          party?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      photos: {
        Row: {
          id: string
          img: string
          ord: number | null
          updated_at: string
        }
        Insert: {
          id: string
          img: string
          ord?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          img?: string
          ord?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      portfolio_goals: {
        Row: {
          metric: string
          target: number
          updated_at: string
        }
        Insert: {
          metric: string
          target: number
          updated_at?: string
        }
        Update: {
          metric?: string
          target?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_devices: {
        Row: {
          created_at: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      races: {
        Row: {
          data: Json
          district: number | null
          id: string
          office: string
          state: string
          updated_at: string
        }
        Insert: {
          data: Json
          district?: number | null
          id: string
          office: string
          state: string
          updated_at?: string
        }
        Update: {
          data?: Json
          district?: number | null
          id?: string
          office?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          email: string | null
          id: number
          message: string
          note: string | null
          page: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: never
          message: string
          note?: string | null
          page?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: never
          message?: string
          note?: string | null
          page?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          area: string | null
          check_key: string | null
          check_ok: boolean | null
          checked_at: string | null
          created_at: string
          detail: string | null
          done_at: string | null
          id: string
          lane: string
          priority: string
          sort: number
          title: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          check_key?: string | null
          check_ok?: boolean | null
          checked_at?: string | null
          created_at?: string
          detail?: string | null
          done_at?: string | null
          id?: string
          lane?: string
          priority?: string
          sort?: number
          title: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          check_key?: string | null
          check_ok?: boolean | null
          checked_at?: string | null
          created_at?: string
          detail?: string | null
          done_at?: string | null
          id?: string
          lane?: string
          priority?: string
          sort?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      roll_calls: {
        Row: {
          bill: string | null
          chamber: string
          data: Json
          id: string
          nays: number | null
          ord: number | null
          question: string | null
          result: string | null
          updated_at: string
          voted_on: string | null
          yeas: number | null
        }
        Insert: {
          bill?: string | null
          chamber: string
          data: Json
          id: string
          nays?: number | null
          ord?: number | null
          question?: string | null
          result?: string | null
          updated_at?: string
          voted_on?: string | null
          yeas?: number | null
        }
        Update: {
          bill?: string | null
          chamber?: string
          data?: Json
          id?: string
          nays?: number | null
          ord?: number | null
          question?: string | null
          result?: string | null
          updated_at?: string
          voted_on?: string | null
          yeas?: number | null
        }
        Relationships: []
      }
      service_status: {
        Row: {
          alerted: boolean
          changed_at: string
          checked_at: string
          fails: number
          label: string
          last_error: string | null
          last_ms: number | null
          ok: boolean
          service: string
        }
        Insert: {
          alerted?: boolean
          changed_at?: string
          checked_at?: string
          fails?: number
          label: string
          last_error?: string | null
          last_ms?: number | null
          ok: boolean
          service: string
        }
        Update: {
          alerted?: boolean
          changed_at?: string
          checked_at?: string
          fails?: number
          label?: string
          last_error?: string | null
          last_ms?: number | null
          ok?: boolean
          service?: string
        }
        Relationships: []
      }
      signups: {
        Row: {
          created_at: string
          email: string
          id: number
          kind: string
          name: string | null
          note: string | null
          org: string | null
          team_size: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: never
          kind: string
          name?: string | null
          note?: string | null
          org?: string | null
          team_size?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: never
          kind?: string
          name?: string | null
          note?: string | null
          org?: string | null
          team_size?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          period_end: string | null
          plan: string | null
          source: string
          status: string
          store_event_at: string | null
          store_ref: string | null
          stripe_customer: string | null
          stripe_sub: string | null
          trial_ends: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          period_end?: string | null
          plan?: string | null
          source?: string
          status: string
          store_event_at?: string | null
          store_ref?: string | null
          stripe_customer?: string | null
          stripe_sub?: string | null
          trial_ends?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          period_end?: string | null
          plan?: string | null
          source?: string
          status?: string
          store_event_at?: string | null
          store_ref?: string | null
          stripe_customer?: string | null
          stripe_sub?: string | null
          trial_ends?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_requests: {
        Row: {
          created_at: string
          email: string
          id: number
          ip_hash: string | null
          message: string
          name: string | null
          note: string | null
          page: string | null
          plan: string | null
          platform: string | null
          replies: Json
          status: string
          topic: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: never
          ip_hash?: string | null
          message: string
          name?: string | null
          note?: string | null
          page?: string | null
          plan?: string | null
          platform?: string | null
          replies?: Json
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: never
          ip_hash?: string | null
          message?: string
          name?: string | null
          note?: string | null
          page?: string | null
          plan?: string | null
          platform?: string | null
          replies?: Json
          status?: string
          topic?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      trade_feed: {
        Row: {
          asset: string | null
          chamber: string | null
          comm: string | null
          district: number | null
          first_seen: string
          hi: number | null
          key: string
          kind: string | null
          lo: number | null
          member_id: string
          name: string | null
          owner: string | null
          party: string | null
          state: string | null
          tdate: string | null
          ticker: string | null
        }
        Insert: {
          asset?: string | null
          chamber?: string | null
          comm?: string | null
          district?: number | null
          first_seen?: string
          hi?: number | null
          key: string
          kind?: string | null
          lo?: number | null
          member_id: string
          name?: string | null
          owner?: string | null
          party?: string | null
          state?: string | null
          tdate?: string | null
          ticker?: string | null
        }
        Update: {
          asset?: string | null
          chamber?: string | null
          comm?: string | null
          district?: number | null
          first_seen?: string
          hi?: number | null
          key?: string
          kind?: string | null
          lo?: number | null
          member_id?: string
          name?: string | null
          owner?: string | null
          party?: string | null
          state?: string | null
          tdate?: string | null
          ticker?: string | null
        }
        Relationships: []
      }
      user_prefs: {
        Row: {
          alerts: Json
          bills: string[]
          dist: number[] | null
          following: string[]
          home: string | null
          last_seen: string | null
          stocks: string[]
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          alerts?: Json
          bills?: string[]
          dist?: number[] | null
          following?: string[]
          home?: string | null
          last_seen?: string | null
          stocks?: string[]
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          alerts?: Json
          bills?: string[]
          dist?: number[] | null
          following?: string[]
          home?: string | null
          last_seen?: string | null
          stocks?: string[]
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      vote_index: {
        Row: {
          bill_key: string | null
          chamber: string
          congress: number
          indexable: boolean
          key: string
          roll: number
          title: string | null
          updated_at: string
          voted_on: string | null
        }
        Insert: {
          bill_key?: string | null
          chamber: string
          congress: number
          indexable?: boolean
          key: string
          roll: number
          title?: string | null
          updated_at?: string
          voted_on?: string | null
        }
        Update: {
          bill_key?: string | null
          chamber?: string
          congress?: number
          indexable?: boolean
          key?: string
          roll?: number
          title?: string | null
          updated_at?: string
          voted_on?: string | null
        }
        Relationships: []
      }
      vote_members: {
        Row: {
          cid: string
          m: Json
        }
        Insert: {
          cid: string
          m: Json
        }
        Update: {
          cid?: string
          m?: Json
        }
        Relationships: []
      }
      vote_rows: {
        Row: {
          cid: string
          i: number
          rc: Json
          roll: number | null
          v: string
        }
        Insert: {
          cid: string
          i: number
          rc: Json
          roll?: number | null
          v: string
        }
        Update: {
          cid?: string
          i?: number
          rc?: Json
          roll?: number | null
          v?: string
        }
        Relationships: []
      }
      zip_districts: {
        Row: {
          districts: number[]
          state: string
          zip: string
        }
        Insert: {
          districts: number[]
          state: string
          zip: string
        }
        Update: {
          districts?: number[]
          state?: string
          zip?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_activation: { Args: never; Returns: Json }
      admin_db_stats: { Args: never; Returns: Json }
      admin_overview: { Args: never; Returns: Json }
      admin_users: {
        Args: { p_lim?: number; p_off?: number; p_only?: string; p_q?: string }
        Returns: Json
      }
      build_light: { Args: { kind: string }; Returns: Json }
      get_light: { Args: { kind: string }; Returns: Json }
      get_light_json: { Args: { kind: string }; Returns: Json }
      is_pro: { Args: { uid: string }; Returns: boolean }
      member_lite: { Args: { d: Json }; Returns: Json }
      my_plan: { Args: never; Returns: Json }
      refresh_light_cache: { Args: never; Returns: undefined }
      refresh_seo_flags: { Args: never; Returns: undefined }
      refresh_trade_feed: { Args: { backfill?: boolean }; Returns: number }
      refresh_vote_index: { Args: never; Returns: undefined }
      refresh_vote_rows: { Args: { p_cid: string }; Returns: undefined }
      start_trial: { Args: never; Returns: Json }
      vote_slice: { Args: { cid: string; roll: number }; Returns: Json }
      vote_slice_full: { Args: { cid: string; roll: number }; Returns: Json }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
