# FloorVibes Requirements Snapshot

## Product Goal

FloorVibes is a lightweight, no-login DJ request app for live events. Audience members should submit a song request quickly, while DJs see pending requests in real time and can mark them handled.

## Current MVP Scope

- Audience route `/`
  - Select target DJ.
  - Enter audience name.
  - Keep audience name on the device for 3 hours.
  - Enter song title or artist name.
  - Submit a pending request.
  - Prevent rapid repeat submissions with a 30-second device-level cooldown.
  - Switch UI language between English and Japanese.
  - Use local mock mode automatically when Supabase env vars are missing.

- DJ route `/dj`
  - Select active DJ.
  - See pending requests for that DJ.
  - See song title as the primary information.
  - See requester name as secondary reference information.
  - Mark requests as played or dismissed.
  - Switch UI language between English and Japanese.
  - Show an audience sharing card with a target-DJ URL, copy/share actions, and QR code.

- Data
  - `requests.id`
  - `requests.created_at`
  - `requests.dj_name`
  - `requests.requested_by`
  - `requests.song_title`
  - `requests.status`

## UI Direction

- Mobile-first for the audience.
- Dark base with pink, cyan, and purple accents.
- Simple, pop, DJ/music-inspired visual language.
- Song/artist remains the most prominent item.
- Requester name should stay visually secondary.

## Known Decisions

- No audience login.
- Name is stored locally for 3 hours, not as an authenticated identity.
- Anti-spam is currently a lightweight client-side cooldown, not a security-grade rate limit.
- Local mock mode is allowed for demos and development.
- Supabase Realtime is the intended production data path.

## Production Readiness Checklist

- Configure Supabase env vars in hosting.
- Apply both SQL migrations.
- Verify Supabase insert, update, and Realtime subscription in production.
- Decide whether audience name is required or optional in production.
- Consider server-side rate limiting before larger public events.
- Decide deployment target and environment variable management.
- Verify QR/share flow against the production domain.
