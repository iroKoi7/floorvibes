export type RequestStatus = "pending" | "played" | "dismissed";
export type EventLikeMode = "single" | "multiple";

export type EventRow = {
  id: string;
  created_at: string;
  owner_id: string | null;
  name: string;
  slug: string;
  starts_at: string | null;
  ends_at: string | null;
  end_message: string;
  end_cta_label: string | null;
  end_cta_url: string | null;
  like_mode: EventLikeMode;
  is_active: boolean;
};

export type EventInsert = {
  owner_id?: string | null;
  name: string;
  slug: string;
  starts_at?: string | null;
  ends_at?: string | null;
  end_message?: string;
  end_cta_label?: string | null;
  end_cta_url?: string | null;
  like_mode?: EventLikeMode;
  is_active?: boolean;
};

export type EventUpdate = Partial<Omit<EventInsert, "slug">> & {
  slug?: string;
};

export type DjRow = {
  id: string;
  event_id: string;
  created_at: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export type DjInsert = {
  event_id: string;
  name: string;
  is_active?: boolean;
  sort_order?: number;
};

export type DjUpdate = Partial<Omit<DjInsert, "event_id">> & {
  event_id?: string;
};

export type RequestRow = {
  id: string;
  created_at: string;
  event_id: string | null;
  dj_id: string | null;
  dj_name: string;
  requested_by: string | null;
  song_title: string;
  song_artist: string | null;
  song_artwork_url: string | null;
  song_provider: string | null;
  song_provider_id: string | null;
  song_url: string | null;
  status: RequestStatus;
};

export type RequestInsert = {
  event_id?: string | null;
  dj_id?: string | null;
  dj_name: string;
  requested_by?: string | null;
  song_title: string;
  song_artist?: string | null;
  song_artwork_url?: string | null;
  song_provider?: string | null;
  song_provider_id?: string | null;
  song_url?: string | null;
  status?: RequestStatus;
};

export type RequestUpdate = {
  status?: RequestStatus;
};

export type EventLikeRow = {
  id: string;
  created_at: string;
  event_id: string;
  dj_id: string;
  audience_session_id: string;
  audience_name: string | null;
};

export type EventLikeInsert = {
  event_id: string;
  dj_id: string;
  audience_session_id: string;
  audience_name?: string | null;
};

export type Database = {
  public: {
    Tables: {
      events: {
        Row: EventRow;
        Insert: EventInsert;
        Update: EventUpdate;
        Relationships: [];
      };
      djs: {
        Row: DjRow;
        Insert: DjInsert;
        Update: DjUpdate;
        Relationships: [
          {
            foreignKeyName: "djs_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      requests: {
        Row: RequestRow;
        Insert: RequestInsert;
        Update: RequestUpdate;
        Relationships: [];
      };
      event_likes: {
        Row: EventLikeRow;
        Insert: EventLikeInsert;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "event_likes_event_id_fkey";
            columns: ["event_id"];
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "event_likes_dj_id_fkey";
            columns: ["dj_id"];
            referencedRelation: "djs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
