-- Run this in your Supabase SQL editor

-- Profiles table (must exist before tasks/research for FK references)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  avatar_url text not null default '',
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
create policy "Allow all" on profiles for all using (true) with check (true);

-- Tasks table
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  owner text not null default '',
  owner_id uuid references profiles(id) on delete set null,
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
  owner text not null default '',
  owner_id uuid references profiles(id) on delete set null,
  status text not null default 'researching' check (status in ('researching', 'promising', 'active', 'pass')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table research_entries enable row level security;
create policy "Allow all" on research_entries for all using (true) with check (true);

-- Wallet entries table
create table if not exists wallet_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_name text not null,
  coldkey text not null default '',
  hotkey text not null default '',
  subnet_id text,
  stake numeric not null default 0,
  daily_earnings numeric not null default 0,
  notes text not null default '',
  created_at timestamptz not null default now()
);

alter table wallet_entries enable row level security;
create policy "Allow all" on wallet_entries for all using (true) with check (true);

-- Agent chat messages
create table if not exists agent_messages (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_messages_agent on agent_messages(agent_id, created_at);

alter table agent_messages enable row level security;
create policy "Allow all" on agent_messages for all using (true) with check (true);

-- Agent shared memory
create table if not exists agent_memory (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null,
  key text not null unique,
  content text not null,
  category text not null default 'general',
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_memory_agent on agent_memory(agent_id);

alter table agent_memory enable row level security;
create policy "Allow all" on agent_memory for all using (true) with check (true);
