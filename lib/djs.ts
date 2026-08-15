export const DJ_NAMES = ["DJ Koike", "DJ Taiyo", "Guest DJ"] as const;

export type DjName = (typeof DJ_NAMES)[number];

export const DEFAULT_DJ: DjName = "DJ Koike";
