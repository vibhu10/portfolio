-- Super admin + team messenger upgrade
-- Run in Supabase SQL Editor after schema.sql and team_access_security.sql.

create extension if not exists pgcrypto;

-- Ensure the known portfolio owner is always represented as the owner profile.
insert into public.profiles(user_id,full_name,email,role,status,permissions)
select u.id,
       coalesce(nullif(u.raw_user_meta_data->>'full_name',''),'Kumar Vibhu'),
       u.email,
       'owner',
       'active',
       jsonb_build_object(
         'view_dashboard',true,'view_analytics',true,'manage_projects',true,'add_projects',true,
         'edit_projects',true,'delete_projects',true,'manage_skills',true,'upload_resume',true,
         'manage_settings',true,'view_visitors',true,'manage_users',true,'approve_users',true,
         'assign_roles',true,'upload_files',true,'publish_content',true
       )
from auth.users u
where lower(u.email)=lower('kumar.vibhu.id@gmail.com')
on conflict (user_id) do update set
  full_name=excluded.full_name,
  email=excluded.email,
  role='owner',
  status='active',
  permissions=excluded.permissions,
  updated_at=now();

-- Make the portfolio owner a permanent super admin in the RLS helper too.
create or replace function public.can_manage_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt()->>'email','')) = lower('kumar.vibhu.id@gmail.com')
  or exists (
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.status = 'active'
      and (
        p.role in ('owner','admin')
        or coalesce((p.permissions ->> 'manage_users')::boolean, false)
        or coalesce((p.permissions ->> 'approve_users')::boolean, false)
        or coalesce((p.permissions ->> 'assign_roles')::boolean, false)
      )
  );
$$;
revoke all on function public.can_manage_team() from public;
grant execute on function public.can_manage_team() to authenticated;

-- Limited team directory visible to signed-in team members.
drop view if exists public.team_directory;
create view public.team_directory
with (security_invoker=false)
as
select user_id,full_name,avatar_url,job_title,role,status
from public.profiles
where status='active';
grant select on public.team_directory to authenticated;

create table if not exists public.team_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);
create index if not exists team_messages_sender_idx on public.team_messages(sender_id,created_at desc);
create index if not exists team_messages_recipient_idx on public.team_messages(recipient_id,created_at desc);
alter table public.team_messages enable row level security;

drop policy if exists "team members read own messages" on public.team_messages;
drop policy if exists "team members send messages" on public.team_messages;
drop policy if exists "recipients update read status" on public.team_messages;

create policy "team members read own messages"
on public.team_messages for select
to authenticated
using (sender_id=auth.uid() or recipient_id=auth.uid());

create policy "team members send messages"
on public.team_messages for insert
to authenticated
with check (
  sender_id=auth.uid()
  and exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.status='active')
  and exists(select 1 from public.profiles p where p.user_id=recipient_id and p.status='active')
);

create policy "recipients update read status"
on public.team_messages for update
to authenticated
using (recipient_id=auth.uid())
with check (recipient_id=auth.uid());

-- Realtime direct-message updates.
do $$
begin
  if exists (select 1 from pg_publication where pubname='supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname='supabase_realtime' and schemaname='public' and tablename='team_messages'
     ) then
    alter publication supabase_realtime add table public.team_messages;
  end if;
end $$;
