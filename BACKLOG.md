# FloorVibes Backlog

## High Priority

- DJ timeline and current turn
  - Let event owners assign DJs to event time ranges.
  - Auto-select the current DJ on Audience and DJ screens based on the current time.
  - Show the current turn clearly in the top-left "Now playing" area.
  - Show the current DJ time range and the next DJ time range on the Audience screen.
  - Add a lightweight timeline button/modal on the Audience screen so participants can view the event DJ timeline without leaving the request flow.
  - Keep manual DJ selection available as an override for irregular event operations.
  - For event-specific Audience/DJ links, avoid forcing users to choose an event manually.
  - Test priority for 2026-08-23.

- Production load check
  - Validate the app can handle a real event with 100-200 concurrent audience users plus DJ/owner usage.
  - Test request bursts from many audience devices.
  - Watch Supabase Realtime behavior, request insert/update latency, and Vercel client load.
  - Confirm the DJ dashboard remains usable when many requests arrive in a short window.

- Test-day runbook
  - Prepare one checklist for the 2026-08-23 test event.
  - Confirm Supabase migrations are applied before deploy.
  - Confirm production URLs for Audience, DJ, and Owner Console.
  - Confirm QR/share links open the intended event.
  - Prepare fallback operation if realtime or song search becomes unstable.

- Public service LP
  - Publish a lightweight FloorVibes service page separate from the Owner Console.
  - Explain what the service does, who it is for, and the basic flow.
  - Split the "Play" and "Review" steps in How it works so playing requests and post-event reflection are separate benefits.
  - Include a simple contact path for event use, collaboration, or questions.
  - Keep product feedback collection as a separate feature, not the LP's main purpose.
  - Store LP contact messages in Supabase for the developer to review.

## Medium Priority

- Brand consistency
  - Standardize the FloorVibes logo and service-name treatment across Audience, DJ, Owner Console, login, and LP screens.
  - Decide one compact lockup for tight mobile headers.
  - Keep the visual identity consistent while preserving each screen's task-focused layout.

- Request grouping
  - Group similar song requests for the same DJ.
  - Start with deterministic normalization and search-selected metadata before adding AI-assisted matching.
  - Run grouping in batches instead of on every request.
  - Trigger a grouping job after roughly 10 new pending requests for a DJ/event.
  - Only group unresolved requests, excluding played or dismissed requests.
  - If a grouping job is already running, do not enqueue another job; leave new requests for the next trigger.

- Event owner login follow-up
  - Verify Supabase Auth email settings in production.
  - Treat `/admin` as the event owner console rather than a service-wide admin area.
  - Decide whether legacy events with `owner_id = null` should be claimed by the first owner.
  - Consider Google login after the email/password flow is stable.

- Feedback and contact experience
  - Add event-end feedback collection separate from the public LP.
  - Let audience members send event feedback after the event closes.
  - Consider DJ-specific feedback and overall event feedback.
  - Add a lightweight developer/contact path for beta testers and event organizers.

- Operator/developer console
  - Add a separate service-operator role when service-wide management is needed.
  - Keep LP contact messages, cross-event diagnostics, and global usage views out of the event owner console.
  - Consider a future `/operator` route guarded by operator-only authorization.

- Owner Console URL cleanup after the 2026-08-23 test
  - Keep `/admin` unchanged before the test event to avoid routing/deploy risk.
  - Revisit whether `/admin` should become `/owner` or another event-owner-facing URL.
  - If the URL changes, add redirects so existing owner links keep working.

## Lower Priority Ideas

- DJ accounts and profiles
  - Create accounts for participating DJs.
  - Link Instagram or other social profiles.
  - Track past event participation.
  - Track historical requests and feedback received by each DJ.

## Shipped

- Request history and event reports
  - Keep audience users login-free.
  - Preserve the audience session during the event.
  - Show the user's own request history for the current event/session.
  - Update the history when a DJ marks a request as played.
  - Let DJs review requests they already marked as played or dismissed during the event.
  - Let event owners review all event requests across DJs as a post-event report.
  - Align request status UI across Audience, DJ, and Owner Console.

- Request grouping MVP
  - Group pending DJ requests by search-selected provider ID, with exact normalized text fallback.
  - Show event-level Waiting/Played signals on audience song search results.
  - Let DJs mark grouped matching requests as played or dismissed together.

- Song search and autocomplete
  - Let audience members search songs inside FloorVibes instead of opening another music app.
  - Show candidate results from partial song, artist, or mixed input.
  - Store normalized song metadata when available, such as title, artist, artwork, provider ID, and song URL.
  - Keep manual free-text input as a fallback when search results are missing.
  - Show artwork and artist metadata on the DJ dashboard for search-selected requests.

- Event end experience
  - Close Audience and DJ event URLs automatically when the event end time passes.
  - Let event owners define the post-event message.
  - Show CTA links on the post-event screen.
  - Collect DJ likes after the event.
  - Show event status and DJ like results in Owner Console.
