-- Portfolio admin upgrade: Experience CMS + Contact Inbox + notifications
-- Safe to run after the original schema.

create extension if not exists pgcrypto;

create table if not exists public.experiences (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text not null default '',
  start_date text not null default '',
  end_date text not null default '',
  description text not null default '',
  skills text[] not null default '{}',
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null,
  status text not null default 'unread' check (status in ('unread','read','archived')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists experiences_sort_idx on public.experiences(sort_order);
create index if not exists contact_messages_created_idx on public.contact_messages(created_at desc);
create index if not exists contact_messages_status_idx on public.contact_messages(status);

alter table public.experiences enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists "public read visible experiences" on public.experiences;
create policy "public read visible experiences"
on public.experiences for select
to anon, authenticated
using (visible = true or auth.role() = 'authenticated');

drop policy if exists "authenticated manage experiences" on public.experiences;
create policy "authenticated manage experiences"
on public.experiences for all
to authenticated
using (true)
with check (true);

drop policy if exists "public send contact messages" on public.contact_messages;
create policy "public send contact messages"
on public.contact_messages for insert
to anon, authenticated
with check (
  length(trim(name)) between 2 and 120
  and position('@' in email) > 1
  and length(trim(message)) between 5 and 5000
);

drop policy if exists "authenticated read contact messages" on public.contact_messages;
create policy "authenticated read contact messages"
on public.contact_messages for select
to authenticated
using (true);

drop policy if exists "authenticated update contact messages" on public.contact_messages;
create policy "authenticated update contact messages"
on public.contact_messages for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated delete contact messages" on public.contact_messages;
create policy "authenticated delete contact messages"
on public.contact_messages for delete
to authenticated
using (true);

-- Enable live inbox notifications when available.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'contact_messages'
     ) then
    alter publication supabase_realtime add table public.contact_messages;
  end if;
end $$;

-- Seed current public experience only when missing.
insert into public.experiences(title,company,location,start_date,end_date,description,skills,visible,sort_order)
select 'Full-Stack Developer','WebNext Technologies','Mohali','Feb 2024','Present','Building production applications, APIs, data pipelines, automation and cloud infrastructure, including Bird’s Eye Markets.',array['Next.js','Node.js','Python','Supabase','Docker']::text[],true,0
where not exists (
  select 1 from public.experiences where lower(title)=lower('Full-Stack Developer') and lower(company)=lower('WebNext Technologies')
);

insert into public.experiences(title,company,location,start_date,end_date,description,skills,visible,sort_order)
select 'MERN Stack Developer','ShineDezign','Mohali','Dec 2022','Jan 2024','Built full-stack product features, dashboards, authentication, APIs and data-heavy application experiences.',array['React','Node.js','Express.js','MongoDB']::text[],true,1
where not exists (
  select 1 from public.experiences where lower(title)=lower('MERN Stack Developer') and lower(company)=lower('ShineDezign')
);
