export type RequestStatus = "pending" | "played" | "dismissed";

export type RequestRow = {
  id: string;
  created_at: string;
  dj_name: string;
  requested_by: string | null;
  song_title: string;
  status: RequestStatus;
};

export type RequestInsert = {
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
