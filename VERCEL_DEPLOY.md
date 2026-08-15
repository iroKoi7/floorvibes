# FloorVibes Vercel Deploy Guide

## What Vercel Will Do

Vercel hosts this Next.js app directly. The app runs in the browser and talks to Supabase using the public Supabase URL and publishable key.

## 1. Push This Project To GitHub

Create a GitHub repository, then push this project to it. Do not commit `.env.local`.

```bash
git init
git add .
git commit -m "Deploy FloorVibes MVP"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/floorvibes.git
git push -u origin main
```

## 2. Create A Vercel Project

1. Open Vercel.
2. Click "Add New..." then "Project".
3. Import the GitHub repository.
4. Framework Preset should be "Next.js".
5. Leave Build Command as `next build`.

## 3. Add Environment Variables

In Vercel Project Settings, add these variables for Production, Preview, and Development:

```env
NEXT_PUBLIC_SUPABASE_URL=https://vjgjrglwonbpmfgcslrp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_dzXXuCXA2N-oS4pzCvEqrw_laQAJB-C
```

Do not add Supabase service role keys or database passwords.

## 4. Deploy

Click "Deploy". After deployment finishes, open:

- `/` for Audience
- `/dj` for DJ Dashboard

## 5. Smoke Test

1. Open `/dj` on desktop.
2. Open `/` on mobile.
3. Select the same DJ.
4. Send a request.
5. Confirm it appears on `/dj`.
6. Click "Played" or "Dismiss" and confirm the card disappears.
