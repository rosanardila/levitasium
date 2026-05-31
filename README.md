# Levitasium

A community events map + calendar. Built with React, Leaflet, and Supabase.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/eventful-app&env=VITE_SUPABASE_URL,VITE_SUPABASE_ANON_KEY)

## Features

- 🗺 Interactive map with color-coded event pins (OpenStreetMap)
- 📅 Monthly calendar view
- 🔍 Search and category filters
- ➕ Add events with map location picker
- 🌙 Dark mode support

## Quick start

```bash
npm install
cp .env.example .env   # add your Supabase credentials
npm run dev
```

The app works with mock data out of the box. Add Supabase env vars to go live.

## Supabase setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Run this SQL in the **SQL Editor**:

```sql
create table events (
  id bigint generated always as identity primary key,
  title text not null,
  date date not null,
  cat text not null check (cat in ('book', 'novel', 'short story', 'article', 'author')),
  lat double precision not null,
  lng double precision not null,
  desc text,
  created_at timestamptz default now()
);

-- Allow anyone to read events
alter table events enable row level security;
create policy "Public read" on events for select using (true);
create policy "Public insert" on events for insert with check (true);
```

3. Copy your **Project URL** and **anon key** from Settings → API
4. Add them to `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Deploy to Vercel

1. Push to GitHub
2. Go to [vercel.com/new](https://vercel.com/new), import the repo
3. Add the two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
4. Deploy — done ✓
