# FloorVibes 2026-08-23 Test-Day Runbook

## Goal

Confirm that the production FloorVibes event flow works before the real test starts.

## Morning Connection Test

Run this from the project root on a normal local terminal:

```bash
node scripts/connection-smoke-test.mjs
```

Expected result:

```txt
OK   events: HTTP 200
OK   djs: HTTP 200
OK   requests: HTTP 200
OK   dj_timeline_slots: HTTP 200
```

If this fails, check Vercel environment variables and Supabase table grants/RLS first.

## Production Smoke Test

Use production URLs, not localhost.

1. Open `/about`.
2. Open Owner Console from the LP.
3. Sign in as the event owner.
4. Create or confirm the test event.
5. Confirm event date, start/end time, DJs, and DJ timeline.
6. Copy the Audience URL from the event list.
7. Copy the DJ URL from the event list.
8. Open the Audience URL on a mobile device.
9. Open the DJ URL on a desktop device.
10. Send one request from mobile.
11. Confirm the request appears on the DJ screen without reload.
12. Mark it `Played`.
13. Confirm it disappears from pending requests.
14. Confirm the Audience request history shows `Played!`.
15. Send another request and mark it `Dismissed`.
16. Confirm the Audience request history updates.

## Timeline Check

1. Set one DJ timeline slot that includes the current time.
2. Set the next DJ slot after it.
3. Open the Audience URL.
4. Confirm the top-left area shows the current DJ and current time range.
5. Confirm it also shows the next DJ and next time range.
6. Tap `Timeline`.
7. Confirm the full timeline modal opens.
8. Confirm `Now` and `Next` labels are correct.

## Contact Form Check

1. Open `/about`.
2. Send a short Contact message.
3. Open Supabase Table Editor.
4. Confirm the row exists in `contact_messages`.

## Load Sanity Check

Before the event starts:

1. Open the Audience URL on 3-5 phones.
2. Send requests from each phone within the same minute.
3. Confirm the DJ screen receives all requests.
4. Confirm request cooldown prevents repeated sends from the same browser session.
5. Keep the DJ screen open for 5 minutes and confirm it stays live.

## Fallback

If Realtime is unstable:

1. Ask the DJ to refresh the DJ URL.
2. Keep accepting requests if inserts still work.
3. If inserts fail, switch to direct verbal/DM requests.
4. Export or inspect requests later from Supabase.
