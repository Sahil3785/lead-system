-- Lead System - PostgreSQL schema (Supabase compatible)
-- Run this in Supabase SQL Editor or any PostgreSQL client

create table if not exists leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  message text not null,
  source text not null,
  priority text,
  status text,
  api_response_code integer,
  retry_count integer default 0,
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Optional: index for common filters
create index if not exists idx_leads_status on leads (status);
create index if not exists idx_leads_created_at on leads (created_at desc);

-- Optional: trigger to auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_updated_at on leads;
create trigger leads_updated_at
  before update on leads
  for each row
  execute function update_updated_at();
