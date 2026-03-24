-- Run this in your Supabase SQL editor

-- Tasks table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  owner text not null default '',
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at timestamptz not null default now()
);

alter table tasks enable row level security;
create policy "Allow all" on tasks for all using (true) with check (true);

-- Subnet research table
create table if not exists research_entries (
  id uuid primary key default gen_random_uuid(),
  subnet_name text not null,
  subnet_id text,
  description text not null default '',
  notes text not null default '',
  status text not null default 'researching' check (status in ('researching', 'promising', 'active', 'pass')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table research_entries enable row level security;
create policy "Allow all" on research_entries for all using (true) with check (true);
