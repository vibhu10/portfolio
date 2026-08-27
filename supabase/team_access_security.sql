-- Team & Access security hardening
-- Run once in Supabase SQL Editor after the existing portfolio schema/migrations.
-- This removes the old "any authenticated user can manage team" policies.

create or replace function public.can_manage_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
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

-- PROFILES: users may read their own profile. Only authorized team managers
-- can view everybody or create/update/delete team profiles.
drop policy if exists "authenticated read profiles" on public.profiles;
drop policy if exists "authenticated manage profiles" on public.profiles;
drop policy if exists "profile self read" on public.profiles;
drop policy if exists "team managers read profiles" on public.profiles;
drop policy if exists "team managers insert profiles" on public.profiles;
drop policy if exists "team managers update profiles" on public.profiles;
drop policy if exists "team managers delete profiles" on public.profiles;

create policy "profile self read"
on public.profiles for select
to authenticated
using (user_id = auth.uid());

create policy "team managers read profiles"
on public.profiles for select
to authenticated
using (public.can_manage_team());

create policy "team managers insert profiles"
on public.profiles for insert
to authenticated
with check (public.can_manage_team());

create policy "team managers update profiles"
on public.profiles for update
to authenticated
using (public.can_manage_team())
with check (public.can_manage_team());

create policy "team managers delete profiles"
on public.profiles for delete
to authenticated
using (public.can_manage_team());

-- ACCESS REQUESTS: keep the public request-form insert policy, but only
-- authorized team managers can view or review requests.
drop policy if exists "authenticated read access requests" on public.access_requests;
drop policy if exists "authenticated update access requests" on public.access_requests;
drop policy if exists "team managers read access requests" on public.access_requests;
drop policy if exists "team managers update access requests" on public.access_requests;

create policy "team managers read access requests"
on public.access_requests for select
to authenticated
using (public.can_manage_team());

create policy "team managers update access requests"
on public.access_requests for update
to authenticated
using (public.can_manage_team())
with check (public.can_manage_team());

-- ACTIVITY LOG: a normal user may see only their own events; Team & Access
-- managers can see the full audit trail.
drop policy if exists "authenticated read activity" on public.activity_logs;
drop policy if exists "activity self or team read" on public.activity_logs;

create policy "activity self or team read"
on public.activity_logs for select
to authenticated
using (actor_user_id = auth.uid() or public.can_manage_team());
