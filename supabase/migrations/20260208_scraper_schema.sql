-- Migration: Scraper Schema
-- Date: 2026-02-08
-- Description: Adds tables for scraping logs and extends prospect_properties for scraped data.

-- ============================================
-- 1. SCRAPING LOGS TABLE
-- ============================================
create table public.scraping_logs (
  id uuid default gen_random_uuid() primary key,
  agency_url text not null,
  properties_count int default 0,
  status text not null check (status in ('pending', 'processing', 'completed', 'failed')),
  scraped_at timestamp with time zone default timezone('utc'::text, now()) not null,
  error_message text
);

-- RLS
alter table public.scraping_logs enable row level security;

-- Admin only access
create policy "Admins can view scraping logs"
  on public.scraping_logs for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Admins can insert scraping logs"
  on public.scraping_logs for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

create policy "Admins can update scraping logs"
  on public.scraping_logs for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
    )
  );

-- ============================================
-- 2. EXTEND PROSPECT PROPERTIES
-- ============================================
-- Add fields to store more scraped data
alter table public.prospect_properties
add column if not exists title text,
add column if not exists images text[], -- Array of image URLs
add column if not exists built_area numeric, -- m2
add column if not exists land_area numeric, -- m2
add column if not exists url text; -- Specific property URL

-- Add index on url for faster lookups during upsert
create index if not exists prospect_properties_url_idx on public.prospect_properties(url);
create index if not exists prospect_properties_original_url_idx on public.prospect_properties(original_url);

-- Ensure RLS allows service role inserts (for webhook) 
-- Note: Service role bypasses RLS, so this is just for admin/agent usage
-- Existing policies cover agents/admins.
