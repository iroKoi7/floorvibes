# FloorVibes Backlog

## High Priority

- Request history and event reports
  - Keep audience users login-free.
  - Preserve the audience session during the event.
  - Show the user's own request history for the current event/session.
  - Update the history when a DJ marks a request as played.
  - Make fulfilled requests feel clear and rewarding, such as "Your request was played."
  - Consider adding a lightweight feedback action from a fulfilled request.
  - Let DJs review requests they already marked as played or dismissed during the event.
  - Let Admin review all event requests across DJs as a post-event report.

- Production load check
  - Validate the app can handle a real event with 100-200 concurrent audience users plus DJ/admin usage.
  - Test request bursts from many audience devices.
  - Watch Supabase Realtime behavior, request insert/update latency, and Vercel client load.
  - Confirm the DJ dashboard remains usable when many requests arrive in a short window.

## Medium Priority

- Request grouping
  - Group similar song requests for the same DJ.
  - Start with deterministic normalization and search-selected metadata before adding AI-assisted matching.
  - MVP: group pending DJ requests by search-selected provider ID, with exact normalized text fallback.
  - MVP: show event-level Waiting/Played signals on audience song search results.
  - Run grouping in batches instead of on every request.
  - Trigger a grouping job after roughly 10 new pending requests for a DJ/event.
  - Only group unresolved requests, excluding played or dismissed requests.
  - If a grouping job is already running, do not enqueue another job; leave new requests for the next trigger.

- DJ timeline
  - Let admins assign DJs to event time ranges.
  - Auto-select the current DJ on Audience and DJ screens based on the current time.
  - Keep manual DJ selection available as an override for irregular event operations.

- Admin login follow-up
  - Verify Supabase Auth email settings in production.
  - Decide whether legacy events with `owner_id = null` should be claimed by the first admin.
  - Consider Google login after the email/password flow is stable.

## Lower Priority Ideas

- DJ accounts and profiles
  - Create accounts for participating DJs.
  - Link Instagram or other social profiles.
  - Track past event participation.
  - Track historical requests and feedback received by each DJ.

## Shipped

- Song search and autocomplete
  - Let audience members search songs inside FloorVibes instead of opening another music app.
  - Show candidate results from partial song, artist, or mixed input.
  - Store normalized song metadata when available, such as title, artist, artwork, provider ID, and song URL.
  - Keep manual free-text input as a fallback when search results are missing.
  - Show artwork and artist metadata on the DJ dashboard for search-selected requests.

- Event end experience
  - Close Audience and DJ event URLs automatically when the event end time passes.
  - Let admins define the post-event message.
  - Show CTA links on the post-event screen.
  - Collect DJ likes after the event.
  - Show event status and DJ like results in Admin.
