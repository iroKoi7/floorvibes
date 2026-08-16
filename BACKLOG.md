# FloorVibes Backlog

## Before Field Test

- Admin login follow-up
  - Verify Supabase Auth email settings in production.
  - Decide whether legacy events with `owner_id = null` should be claimed by the first admin.
  - Consider Google login after the email/password flow is stable.

- Production load check
  - Validate the app can handle a real event with 100-200 concurrent audience users plus DJ/admin usage.
  - Test request bursts from many audience devices.
  - Watch Supabase Realtime behavior, request insert/update latency, and Vercel client load.
  - Confirm the DJ dashboard remains usable when many requests arrive in a short window.

## Next Features

- DJ timeline
  - Let admins assign DJs to event time ranges.
  - Auto-select the current DJ on Audience and DJ screens based on the current time.

- Event end experience
  - Close Audience and DJ event URLs automatically when the event end time passes.
  - Let admins define the post-event message, such as "Thanks for joining."
  - Replace the request form with a post-event screen after the event closes.

- Audience feedback
  - Let audience members send likes, thanks, or short feedback to the current DJ after/during the event.
  - Use this as a path toward event-wide surveys and DJ-specific feedback collection.
  - Design for smaller personal events first, not long-running club operations.

- Audience request history
  - Keep audience users login-free.
  - Preserve the audience session during the event.
  - Show the user's own request history for the current event/session.
  - Update the history when a DJ marks a request as played.
  - Make fulfilled requests feel clear and rewarding, such as "Your request was played."
  - Consider adding a lightweight feedback action from a fulfilled request.

- Request grouping
  - Group similar song requests for the same DJ.
  - Start with deterministic normalization before adding AI-assisted matching.
  - Run grouping in batches instead of on every request.
  - Trigger a grouping job after roughly 10 new pending requests for a DJ/event.
  - Only group unresolved requests, excluding played or dismissed requests.
  - If a grouping job is already running, do not enqueue another job; leave new requests for the next trigger.

## Lower Priority Ideas

- DJ accounts and profiles
  - Create accounts for participating DJs.
  - Link Instagram or other social profiles.
  - Track past event participation.
  - Track historical requests and feedback received by each DJ.
