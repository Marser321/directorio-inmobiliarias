-- Create Service Tiers table (The "Packs")
create table if not exists service_tiers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price integer not null, -- stored in cents
  currency text default 'usd', -- or 'uyu'
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  stripe_price_id text, -- For Stripe integration
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for service_tiers
alter table service_tiers enable row level security;
create policy "Public can view active tiers" on service_tiers for select using (is_active = true);

-- Create Subscriptions table
create table if not exists subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  tier_id uuid references service_tiers not null,
  status text check (status in ('active', 'past_due', 'canceled', 'trialing')) default 'active',
  stripe_subscription_id text,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for subscriptions
alter table subscriptions enable row level security;
create policy "Users can view own subscription" on subscriptions for select using (auth.uid() = user_id);

-- Create Service Requests table (The "Orders")
create table if not exists service_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  subscription_id uuid references subscriptions, -- Optional, if linked to a sub
  type text not null, -- e.g. 'property_photos', 'video_tour', 'copywriting'
  status text check (status in ('pending', 'in_progress', 'review', 'delivered', 'rejected')) default 'pending',
  details jsonb default '{}'::jsonb, -- dynamic input form data (urls, notes)
  deliverable_url text, -- link to folder/file
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS for service_requests
alter table service_requests enable row level security;
create policy "Users can view own requests" on service_requests for select using (auth.uid() = user_id);
create policy "Users can insert own requests" on service_requests for insert with check (auth.uid() = user_id);

-- Seed some initial data for Tiers
insert into service_tiers (name, description, price, features) values
('Pack Básico', 'Fotos IA y Descripción Mejorada', 4900, '["Mejora de fotos IA", "Descripción persuasiva", "1 Propiedad"]'),
('Pack Pro', 'Video Tour + Fotos + Social Media', 9900, '["Todo lo del Básico", "Video Reel 30s", "Post para Instagram", "3 Propiedades"]'),
('Agencia Partner', 'Contenido Ilimitado y Gestión Ads', 29900, '["Contenido Ilimitado", "Gestión de Ads", "Soporte Prioritario"]');
