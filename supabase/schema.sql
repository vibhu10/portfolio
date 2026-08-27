-- Portfolio CMS + analytics + asset management
-- Run this in the Supabase SQL Editor for the portfolio project.

create extension if not exists pgcrypto;

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
  category text not null default 'Other',
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

-- Team access request + RBAC tables
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  job_title text,
  experience text,
  skills text[] not null default '{}',
  bio text,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  avatar_url text,
  reason text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

create unique index if not exists access_requests_email_pending_idx
  on public.access_requests(lower(email)) where status='pending';

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  job_title text,
  role text not null default 'viewer' check (role in ('owner','admin','manager','developer','content_manager','viewer')),
  status text not null default 'active' check (status in ('active','suspended')),
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists visitor_events_created_at_idx on public.visitor_events(created_at desc);
create index if not exists visitor_events_visitor_id_idx on public.visitor_events(visitor_id);
create index if not exists visitor_events_event_type_idx on public.visitor_events(event_type);
create index if not exists access_requests_created_at_idx on public.access_requests(created_at desc);
create index if not exists activity_logs_created_at_idx on public.activity_logs(created_at desc);

alter table public.projects enable row level security;
alter table public.skills enable row level security;
alter table public.visitor_events enable row level security;
alter table public.access_requests enable row level security;
alter table public.profiles enable row level security;
alter table public.activity_logs enable row level security;

-- Public portfolio content.
drop policy if exists "public read visible projects" on public.projects;
create policy "public read visible projects" on public.projects for select to anon, authenticated using (visible = true or auth.role() = 'authenticated');

drop policy if exists "public read visible skills" on public.skills;
create policy "public read visible skills" on public.skills for select to anon, authenticated using (visible = true or auth.role() = 'authenticated');

-- Any public portfolio visitor may write anonymous analytics events.
drop policy if exists "public insert analytics" on public.visitor_events;
create policy "public insert analytics" on public.visitor_events for insert to anon, authenticated with check (length(visitor_id) between 8 and 100 and length(event_type) between 1 and 80);

-- Public may submit an access request; only authenticated users may review it.
drop policy if exists "public submit access request" on public.access_requests;
create policy "public submit access request" on public.access_requests for insert to anon, authenticated with check (status='pending' and length(full_name) between 2 and 120 and position('@' in email) > 1);

drop policy if exists "authenticated read access requests" on public.access_requests;
create policy "authenticated read access requests" on public.access_requests for select to authenticated using (true);

drop policy if exists "authenticated update access requests" on public.access_requests;
create policy "authenticated update access requests" on public.access_requests for update to authenticated using (true) with check (true);

-- Profiles: authenticated users can read team records; users can update themselves.
drop policy if exists "authenticated read profiles" on public.profiles;
create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);

drop policy if exists "self update profile" on public.profiles;
create policy "self update profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Admin dashboard can insert/update team profiles after auth account exists.
drop policy if exists "authenticated manage profiles" on public.profiles;
create policy "authenticated manage profiles" on public.profiles for all to authenticated using (true) with check (true);

-- Activity log: authenticated users may write; authenticated users may read.
drop policy if exists "authenticated read activity" on public.activity_logs;
create policy "authenticated read activity" on public.activity_logs for select to authenticated using (true);

drop policy if exists "authenticated insert activity" on public.activity_logs;
create policy "authenticated insert activity" on public.activity_logs for insert to authenticated with check (actor_user_id = auth.uid() or actor_user_id is null);

-- Existing authenticated CMS policies.
drop policy if exists "authenticated manage projects" on public.projects;
create policy "authenticated manage projects" on public.projects for all to authenticated using (true) with check (true);

drop policy if exists "authenticated manage skills" on public.skills;
create policy "authenticated manage skills" on public.skills for all to authenticated using (true) with check (true);

drop policy if exists "authenticated read analytics" on public.visitor_events;
create policy "authenticated read analytics" on public.visitor_events for select to authenticated using (true);

drop policy if exists "authenticated delete analytics" on public.visitor_events;
create policy "authenticated delete analytics" on public.visitor_events for delete to authenticated using (true);

-- Public Supabase Storage bucket used for project screenshots, profile photo and resume.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio','portfolio',true,10485760,array['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public read portfolio assets" on storage.objects;
create policy "public read portfolio assets" on storage.objects for select to anon, authenticated using (bucket_id='portfolio');

drop policy if exists "authenticated upload portfolio assets" on storage.objects;
create policy "authenticated upload portfolio assets" on storage.objects for insert to authenticated with check (bucket_id='portfolio');

drop policy if exists "authenticated update portfolio assets" on storage.objects;
create policy "authenticated update portfolio assets" on storage.objects for update to authenticated using (bucket_id='portfolio') with check (bucket_id='portfolio');

drop policy if exists "authenticated delete portfolio assets" on storage.objects;
create policy "authenticated delete portfolio assets" on storage.objects for delete to authenticated using (bucket_id='portfolio');

-- Optional starter skills. Safe to run more than once.
insert into public.skills(category,name,sort_order,visible)
select 'Frontend',v.name,v.ord,true
from (values
 ('HTML5',1),('CSS3',2),('JavaScript',3),('TypeScript',4),('React',5),('Next.js',6),('Node.js',7),('Express.js',8),('Python',9),('FastAPI',10),('MongoDB',11),('PostgreSQL',12),('Supabase',13),('Docker',14),('Playwright',15),('n8n',16)
) as v(name,ord)
where not exists(select 1 from public.skills s where lower(s.name)=lower(v.name));
