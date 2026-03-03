-- Migration: Create Sniper and Outreach tables
-- Date: 2024-02-05
-- Description: Adds tables for storing scraped leads and managing communication flows.

-- ============================================
-- 1. PROSPECT PROPERTIES (Leads from Scraper)
-- ============================================
create table public.prospect_properties (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Scraper Info
  source text not null check (source in ('google_maps', 'mercadolibre', 'facebook', 'infocasas', 'gallito', 'other')),
  original_url text,
  external_id text, -- ID in the source platform
  
  -- Property Details
  address text,
  neighborhood text,
  city text,
  property_type text check (property_type in ('casa', 'apartamento', 'terreno', 'local', 'ph', 'other')),
  description text,
  
  -- Price Analysis
  listed_price numeric,
  currency text default 'USD',
  market_price_estimate numeric,
  price_gap_percentage numeric, -- (listed - market) / market * 100
  days_on_market int,
  
  -- Contact Info (Enriched)
  owner_name text,
  owner_phone text,
  owner_email text,
  owner_whatsapp text,
  
  -- Scoring & Status
  quality_score int default 0, -- 0-100
  status text default 'new' check (status in ('new', 'qualified', 'disqualified', 'contacted', 'converted')),
  disqualification_reason text,
  
  -- Metadata
  meta jsonb default '{}'::jsonb
);

-- Indexes
create index prospect_properties_source_idx on public.prospect_properties(source);
create index prospect_properties_status_idx on public.prospect_properties(status);
create index prospect_properties_score_idx on public.prospect_properties(quality_score desc);

-- ============================================
-- 2. OUTREACH QUEUE (Messages to send)
-- ============================================
create table public.outreach_queue (
  id uuid default gen_random_uuid() primary key,
  lead_id uuid references public.prospect_properties(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Flow Control
  stage text default 'initial' check (stage in ('initial', 'followup_1', 'followup_2', 'final', 'manual')),
  channel text not null check (channel in ('whatsapp', 'email', 'sms')),
  status text default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  scheduled_for timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Content
  template_id text,
  message_body text, -- The actual generated message
  personalization_data jsonb default '{}'::jsonb,
  
  -- Execution
  attempts int default 0,
  last_error text
);

-- Indexes
create index outreach_queue_status_scheduled_idx on public.outreach_queue(status, scheduled_for);

-- ============================================
-- 3. OUTREACH LOG (History)
-- ============================================
create table public.outreach_log (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  lead_id uuid references public.prospect_properties(id) on delete set null,
  queue_id uuid references public.outreach_queue(id) on delete set null,
  
  channel text not null,
  direction text check (direction in ('outbound', 'inbound')),
  content text,
  
  metadata jsonb default '{}'::jsonb
);

-- Index
create index outreach_log_lead_id_idx on public.outreach_log(lead_id);

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Enable RLS
alter table public.prospect_properties enable row level security;
alter table public.outreach_queue enable row level security;
alter table public.outreach_log enable row level security;

-- Policies (Simplified for Agent/Admin access only)
-- Ideally should link to agency_users, but for this "Growth Engine" tool, 
-- we'll restrict to authenticated users with role 'agent' or 'admin' in profiles.

-- Helper: Check if user is agent/admin
-- Using existing profiles table based on schema.sql logic
-- (Assuming auth.uid() maps to id in profiles)

create policy "Agents can view prospects"
  on public.prospect_properties for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'agent')
    )
  );

create policy "Agents can insert prospects"
  on public.prospect_properties for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'agent')
    )
  );

create policy "Agents can update prospects"
  on public.prospect_properties for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'agent')
    )
  );

-- Repeat for Outreach Queue
create policy "Agents can manage outreach queue"
  on public.outreach_queue for all
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'agent')
    )
  );

-- Repeat for Outreach Log
create policy "Agents can view outreach logs"
  on public.outreach_log for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'agent')
    )
  );

create policy "Agents can insert outreach logs"
  on public.outreach_log for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('admin', 'agent')
    )
  );
