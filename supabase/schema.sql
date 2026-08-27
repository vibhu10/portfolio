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

create table if not exists public.site_content (
  id integer primary key default 1 check (id=1),
  display_name text not null default 'Kumar Vibhu',
  short_name text not null default 'Vibhu',
  headline text not null default 'I build modern, responsive and high-performance web products.',
  hero_text text not null default 'Full-Stack Developer focused on production-ready applications, APIs, automation and data-driven platforms — from interface to infrastructure.',
  role_title text not null default 'Full-Stack Developer',
  location text not null default 'India · Remote',
  email text not null default 'kumar.vibhu.id@gmail.com',
  phone text not null default '+91 98163 99109',
  github_url text not null default 'https://github.com/vibhu10',
  linkedin_url text not null default '',
  portfolio_url text not null default 'https://vibhu10.github.io/portfolio/',
  about_one text not null default 'I build production web applications and enjoy owning the complete engineering flow: translating requirements into interfaces, designing APIs and data models, integrating external services, automating repetitive work and shipping applications to the cloud.',
  about_two text not null default 'My strongest stack is JavaScript/TypeScript with React, Next.js and Node.js, plus Python/FastAPI, browser automation and modern databases when the product needs them.',
  contact_heading text not null default 'Let’s build something useful.',
  contact_text text not null default 'I’m open to full-stack, React/Next.js and product engineering opportunities.',
  experience_years text not null default '3+',
  footer_text text not null default '© 2026 Kumar Vibhu · Built with Next.js + Supabase',
  updated_at timestamptz not null default now()
);

create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
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
alter table public.access_requests add column if not exists user_id uuid;

create unique index if not exists access_requests_email_pending_idx on public.access_requests(lower(email)) where status='pending';

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
alter table public.site_content enable row level security;
alter table public.access_requests enable row level security;
alter table public.profiles enable row level security;
alter table public.activity_logs enable row level security;

-- Public portfolio content.
drop policy if exists "public read visible projects" on public.projects;
create policy "public read visible projects" on public.projects for select to anon, authenticated using (visible = true or auth.role() = 'authenticated');

drop policy if exists "public read visible skills" on public.skills;
create policy "public read visible skills" on public.skills for select to anon, authenticated using (visible = true or auth.role() = 'authenticated');

drop policy if exists "public read site content" on public.site_content;
create policy "public read site content" on public.site_content for select to anon, authenticated using (true);

drop policy if exists "authenticated manage site content" on public.site_content;
create policy "authenticated manage site content" on public.site_content for all to authenticated using (true) with check (true);

drop policy if exists "public insert analytics" on public.visitor_events;
create policy "public insert analytics" on public.visitor_events for insert to anon, authenticated with check (length(visitor_id) between 8 and 100 and length(event_type) between 1 and 80);

-- Access requests. Passwords are handled only by Supabase Auth and are never stored here.
drop policy if exists "public submit access request" on public.access_requests;
create policy "public submit access request" on public.access_requests for insert to anon, authenticated with check (status='pending' and length(full_name) between 2 and 120 and position('@' in email) > 1);

drop policy if exists "authenticated read access requests" on public.access_requests;
create policy "authenticated read access requests" on public.access_requests for select to authenticated using (true);

drop policy if exists "authenticated update access requests" on public.access_requests;
create policy "authenticated update access requests" on public.access_requests for update to authenticated using (true) with check (true);

-- Team profiles.
drop policy if exists "authenticated read profiles" on public.profiles;
create policy "authenticated read profiles" on public.profiles for select to authenticated using (true);

drop policy if exists "authenticated manage profiles" on public.profiles;
create policy "authenticated manage profiles" on public.profiles for all to authenticated using (true) with check (true);

-- Activity log.
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

-- Public Supabase Storage bucket used for project screenshots, profile photo, avatars and resume.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('portfolio','portfolio',true,10485760,array['image/jpeg','image/png','image/webp','image/gif','application/pdf'])
on conflict (id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "public read portfolio assets" on storage.objects;
create policy "public read portfolio assets" on storage.objects for select to anon, authenticated using (bucket_id='portfolio');

drop policy if exists "public upload access avatars" on storage.objects;
create policy "public upload access avatars" on storage.objects for insert to anon, authenticated with check (bucket_id='portfolio' and name like 'access/%');

drop policy if exists "authenticated upload portfolio assets" on storage.objects;
create policy "authenticated upload portfolio assets" on storage.objects for insert to authenticated with check (bucket_id='portfolio');

drop policy if exists "authenticated update portfolio assets" on storage.objects;
create policy "authenticated update portfolio assets" on storage.objects for update to authenticated using (bucket_id='portfolio') with check (bucket_id='portfolio');

drop policy if exists "authenticated delete portfolio assets" on storage.objects;
create policy "authenticated delete portfolio assets" on storage.objects for delete to authenticated using (bucket_id='portfolio');

insert into public.site_content(id) values (1) on conflict (id) do nothing;

-- Seed the same six projects that are shown on the public home page so they are immediately editable in Admin → Projects.
insert into public.projects(name,category,summary,impact,role,tech,featured,visible,sort_order)
select v.name,v.category,v.summary,v.impact,v.role,v.tech,v.featured,true,v.sort_order
from (values
  ('Bird''s Eye Markets','REAL ESTATE INTELLIGENCE · PRODUCTION SAAS','A property intelligence platform that combines ownership, valuation, rental, demographic and market data into structured reports and decision-ready dashboards.','Worked across frontend, backend, data enrichment, automation and deployment for a production SaaS product.',array['Built the full Next.js frontend for property search, reports and market-analysis dashboards.','Designed Node.js/Express REST APIs plus supporting Python/FastAPI services for report generation and data aggregation.','Built Python/Playwright scraping and browser-automation workflows integrating ATTOM, AirROI, Zillow, Realtor, Google Maps and analytics data.','Automated recurring data-processing jobs with n8n and webhooks.','Containerized services with Docker/Docker Compose and deployed on DigitalOcean behind Nginx.','Integrated Stripe billing and managed production credentials and deployment workflows.']::text[],array['Next.js 14','React 18','TypeScript','Tailwind CSS','Chakra UI','Node.js','Express.js','Python','FastAPI','Supabase','PostgreSQL','Playwright','n8n','Docker','Docker Compose','Nginx','DigitalOcean','Stripe']::text[],true,0),
  ('Queflic','SOCIAL MEDIA · MOBILE APPLICATION','A social mobile application with profiles, feeds, photo/video posts and a differentiating live-photo-moment format that combines a photo with a short video clip.','Owned the backend and contributed to the React Native application, including data models and media-processing workflows.',array['Designed REST APIs for users, profiles, feeds, posts and media uploads.','Created MongoDB models for social relationships and content.','Built the media pipeline that processes and stores combined photo/video moments.','Contributed to React Native screens and cross-platform mobile flows.']::text[],array['React Native','Node.js','Express.js','MongoDB','REST APIs']::text[],false,1),
  ('Paradise Rental','PROPERTY RENTAL MARKETPLACE','A property-rental marketplace where users browse listings, view details, book stays and manage renter or property-owner accounts.','Led development end-to-end across the customer-facing marketplace and backend services.',array['Built responsive React listing, detail and booking flows.','Developed Node.js/Express APIs for listings, bookings and authentication.','Modeled and integrated MongoDB/MySQL for property, booking and user data.','Implemented JWT authentication and protected account workflows.']::text[],array['React.js','Node.js','Express.js','MongoDB','MySQL','REST APIs','JWT Authentication']::text[],false,2),
  ('QuickKart','E-COMMERCE · MERN','A full e-commerce storefront covering product browsing, cart, checkout, authentication and order history.','Owned the core MERN product flow from UI to API and database.',array['Built responsive product listing, cart and checkout experiences.','Developed product, user and order APIs.','Modeled product, user and order data in MongoDB.','Implemented JWT authentication and checkout/payment workflows.']::text[],array['React.js','Node.js','Express.js','MongoDB','JWT','REST APIs']::text[],false,3),
  ('Informed.pro','PROFESSIONAL NETWORK','A professional networking product with structured profiles, connections, activity feeds and role-aware dashboards.','Focused on data-heavy UX, performance and access-controlled product experiences.',array['Built profile, feed and dashboard features.','Implemented authentication and role-based access.','Improved large-list performance using pagination and MongoDB indexing.','Integrated frontend state with backend APIs using Redux.']::text[],array['React.js','Redux','Node.js','Express.js','MongoDB']::text[],false,4),
  ('Docintel','AI · CLINICAL RESEARCH','A clinical research application with AI-curated content, saved articles and CPD tracking.','Connected research-discovery UX, user workflows and backend APIs.',array['Built AI-curated research feed experiences.','Implemented saved articles and CPD tracking.','Developed REST APIs for content and user actions.','Created reusable responsive frontend components.']::text[],array['React.js','Node.js','Express.js','MongoDB','REST APIs']::text[],false,5)
) as v(name,category,summary,impact,role,tech,featured,sort_order)
where not exists (select 1 from public.projects p where lower(p.name)=lower(v.name));

-- Optional starter skills. Safe to run more than once.
insert into public.skills(category,name,sort_order,visible)
select 'Frontend',v.name,v.ord,true
from (values
 ('HTML5',1),('CSS3',2),('JavaScript',3),('TypeScript',4),('React',5),('Next.js',6),('Node.js',7),('Express.js',8),('Python',9),('FastAPI',10),('MongoDB',11),('PostgreSQL',12),('Supabase',13),('Docker',14),('Playwright',15),('n8n',16)
) as v(name,ord)
where not exists(select 1 from public.skills s where lower(s.name)=lower(v.name));
