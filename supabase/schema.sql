-- Portfolio CMS + private analytics
-- Run this once in Supabase SQL Editor.
-- 1) Create your email/password user in Authentication > Users.
-- 2) Copy that user's UUID into the INSERT below.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  summary text not null default '',
  impact text not null default '',
  role text[] not null default '{}',
  tech text[] not null default '{}',
  screenshots text[] not null default '{}',
  live_url text,
  github_url text,
  featured boolean not null default false,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.visitor_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  event_type text not null default 'page_view',
  page text not null default '/',
  referrer text,
  user_agent text,
  language text,
  timezone text,
  created_at timestamptz not null default now()
);

create index if not exists visitor_events_created_at_idx on public.visitor_events(created_at desc);
create index if not exists visitor_events_visitor_id_idx on public.visitor_events(visitor_id);

alter table public.admin_users enable row level security;
alter table public.projects enable row level security;
alter table public.skills enable row level security;
alter table public.visitor_events enable row level security;

-- Public visitors can read only visible portfolio content.
drop policy if exists "public read visible projects" on public.projects;
create policy "public read visible projects" on public.projects for select using (visible = true);

drop policy if exists "public read visible skills" on public.skills;
create policy "public read visible skills" on public.skills for select using (visible = true);

-- Anyone may record an anonymized analytics event. No raw IP is stored.
drop policy if exists "public insert analytics" on public.visitor_events;
create policy "public insert analytics" on public.visitor_events for insert with check (length(visitor_id) between 8 and 100);

-- Only your authenticated admin user may manage CMS content and analytics.
drop policy if exists "admin read admin users" on public.admin_users;
create policy "admin read admin users" on public.admin_users for select using (auth.uid() = user_id);

drop policy if exists "admin manage projects" on public.projects;
create policy "admin manage projects" on public.projects for all using (exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admin manage skills" on public.skills;
create policy "admin manage skills" on public.skills for all using (exists (select 1 from public.admin_users a where a.user_id = auth.uid())) with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admin read analytics" on public.visitor_events;
create policy "admin read analytics" on public.visitor_events for select using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admin delete analytics" on public.visitor_events;
create policy "admin delete analytics" on public.visitor_events for delete using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- Storage bucket for project screenshots.
insert into storage.buckets (id, name, public) values ('portfolio', 'portfolio', true) on conflict (id) do nothing;

drop policy if exists "public read portfolio images" on storage.objects;
create policy "public read portfolio images" on storage.objects for select using (bucket_id = 'portfolio');

drop policy if exists "admin upload portfolio images" on storage.objects;
create policy "admin upload portfolio images" on storage.objects for insert with check (bucket_id = 'portfolio' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admin update portfolio images" on storage.objects;
create policy "admin update portfolio images" on storage.objects for update using (bucket_id = 'portfolio' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "admin delete portfolio images" on storage.objects;
create policy "admin delete portfolio images" on storage.objects for delete using (bucket_id = 'portfolio' and exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

-- After creating your Auth user, run:
-- insert into public.admin_users(user_id) values ('YOUR-AUTH-USER-UUID');
