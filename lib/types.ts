export type RequestStatus = "pending" | "played" | "dismissed";

export type EventRow = {
  id: string;
  created_at: string;
  name: string;
  slug: string;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};

export type EventInsert = {
  name: string;
  slug: string;
  starts_at?: string | null;
  ends_at?: string | null;
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
  status: RequestStatus;
};

export type RequestInsert = {
  event_id?: string | null;
  dj_id?: string | null;
  dj_name: string;
  requested_by?: string | null;
  song_title: string;
  status?: RequestStatus;
};

export type RequestUpdate = {
  status?: RequestStatus;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
