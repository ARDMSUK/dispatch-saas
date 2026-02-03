-- Enable PostGIS for location features
create extension if not exists postgis;

-- 1. COMPANIES (Multi-Tenancy)
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  settings jsonb default '{}'::jsonb, -- Pricing, SMS keys, Branding
  created_at timestamptz default now()
);

-- 2. USERS / PROFILES (Linked to Supabase Auth)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id),
  role text check (role in ('admin', 'operator', 'driver', 'customer')),
  full_name text,
  email text,
  phone text,
  avatar_url text,
  created_at timestamptz default now()
);

-- 3. CUSTOMERS (Company Scoped)
create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  phone_number text not null,
  name text,
  email text,
  notes text,
  is_blocked boolean default false,
  created_at timestamptz default now(),
  unique(company_id, phone_number)
);

-- 4. DRIVERS
create table drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  profile_id uuid references profiles(id), -- If they have a login
  call_sign text not null, -- Unique ID like "D-01"
  vehicle_type text check (vehicle_type in ('Saloon', 'Estate', 'Executive', '6-seater MPV', '8-seater MPV', 'Minibus', 'Coach')),
  vehicle_reg text,
  current_location geography(Point, 4326),
  status text check (status in ('active', 'inactive', 'on_job', 'break')) default 'inactive',
  last_active_at timestamptz,
  created_at timestamptz default now(),
  unique(company_id, call_sign)
);

-- 5. PRICING RULES
create table pricing_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  name text not null, -- e.g., "Standard Tariff"
  base_fare decimal(10,2) default 0,
  rate_per_mile decimal(10,2) default 0,
  min_charge decimal(10,2) default 0,
  vehicle_multiplier jsonb default '{}'::jsonb, -- e.g. {"Estate": 1.2}
  is_active boolean default true,
  created_at timestamptz default now()
);

-- 6. BOOKINGS
create table bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) not null,
  customer_id uuid references customers(id),
  driver_id uuid references drivers(id),
  
  -- Journey Details
  pickup_address text not null,
  pickup_location geography(Point, 4326),
  destination_address text not null,
  destination_location geography(Point, 4326),
  vias jsonb default '[]'::jsonb, -- Array of intermediate stops
  
  -- Schedule
  scheduled_at timestamptz not null, -- "Pickup Time"
  expected_duration_minutes int,
  
  -- Passengers & Luggage
  passengers int default 1,
  luggage int default 0,
  
  -- Flight Tracking
  flight_number text, -- Compulsory if airport
  flight_data jsonb, -- Live tracking info
  
  -- Status
  status text check (status in ('to_dispatch', 'pre_booked', 'on_route', 'pob', 'completed', 'cancelled', 'no_show', 'arrived')) default 'to_dispatch',
  
  -- Financials
  quoted_price decimal(10,2),
  final_price decimal(10,2),
  payment_status text check (payment_status in ('pending', 'paid', 'invoice')) default 'pending',
  
  -- Recurring & Linking
  return_booking_id uuid references bookings(id),
  recurring_rule jsonb, -- { "frequency": "weekly", "end_date": "2024-12-31" }
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS POLICIES (Simplified for initial build)
alter table companies enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table drivers enable row level security;
alter table pricing_rules enable row level security;
alter table bookings enable row level security;

-- Policy: Users can only see data belonging to their company
-- Note: This requires a helper function `auth.uid()` lookup in `profiles` to find `company_id`.
-- For simplicity in this SQL dump, we are setting up the structure. 
-- You would typically add:
-- create policy "Users can view own company data" on customers
-- using (company_id in (select company_id from profiles where id = auth.uid()));

-- Indexes
create index bookings_company_status_idx on bookings(company_id, status);
create index drivers_location_idx on drivers using gist(current_location);
