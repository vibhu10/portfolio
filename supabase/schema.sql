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

create index if not exists visitor_events_created_at_idx on public.visitor_events(created_at desc);
create index if not exists visitor_events_visitor_id_idx on public.visitor_events(visitor_id);
create index if not exists visitor_events_event_type_idx on public.visitor_events(event_type);

alter table public.projects enable row level security;
alter table public.skills enable row level security;
alter table public.visitor_events enable row level security;

-- Public portfolio content.
drop policy if exists "public read visible projects" on public.projects;
create policy "public read visible projects" on public.projects for select to anon, authenticated using (visible = true or auth.role() = 'authenticated');

drop policy if exists "public read visible skills" on public.skills;
create policy "public read visible skills" on public.skills for select to anon, authenticated using (visible = true or auth.role() = 'authenticated');

-- Any public portfolio visitor may write anonymous analytics events.
drop policy if exists "public insert analytics" on public.visitor_events;
create policy "public insert analytics" on public.visitor_events for insert to anon, authenticated with check (length(visitor_id) between 8 and 100 and length(event_type) between 1 and 80);

-- The only authenticated account in this portfolio project is the admin account.
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
