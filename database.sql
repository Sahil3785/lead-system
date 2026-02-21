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

