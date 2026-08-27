-- Fix team messenger RLS so every active approved user can send messages.
-- Run this once in Supabase SQL Editor after team_messenger_upgrade.sql.

create or replace function public.is_active_team_member(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = target_user
      and p.status = 'active'
  );
$$;

revoke all on function public.is_active_team_member(uuid) from public;
grant execute on function public.is_active_team_member(uuid) to authenticated;

drop policy if exists "team members send messages" on public.team_messages;

create policy "team members send messages"
on public.team_messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_active_team_member(auth.uid())
  and public.is_active_team_member(recipient_id)
);

-- Keep users limited to their own conversations.
drop policy if exists "team members read own messages" on public.team_messages;
create policy "team members read own messages"
on public.team_messages for select
to authenticated
using (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "recipients update read status" on public.team_messages;
create policy "recipients update read status"
on public.team_messages for update
to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());
