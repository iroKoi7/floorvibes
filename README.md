# FloorVibes

Lightweight real-time DJ request app built with Next.js App Router, Tailwind CSS, shadcn-style UI components, and Supabase Realtime.

## Routes

- `/` Audience request form
- `/dj` DJ dashboard for live pending requests

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add Supabase environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Run the SQL in `supabase/migrations/0001_create_requests.sql` in your Supabase SQL editor.

4. Start the app:

   ```bash
   npm run dev
   ```

## Supabase Notes

The migration creates `public.requests`, enables RLS, grants browser roles access, adds scoped policies for anonymous audience usage, and registers the table with the `supabase_realtime` publication when it already exists.

The audience name is stored on-device for 3 hours and sent as `requested_by` with each request. It is shown as secondary reference information on the DJ dashboard.
