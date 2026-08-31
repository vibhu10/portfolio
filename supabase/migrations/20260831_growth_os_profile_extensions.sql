alter table if exists profiles add column if not exists headline text;
alter table if exists profiles add column if not exists bio text;
alter table if exists profiles add column if not exists education jsonb not null default '[]'::jsonb;
alter table if exists profiles add column if not exists services jsonb not null default '[]'::jsonb;
alter table if exists profiles add column if not exists availability text;
alter table if exists profiles add column if not exists preferred_rates jsonb not null default '{}'::jsonb;
alter table if exists profiles add column if not exists preferred_jobs jsonb not null default '[]'::jsonb;
alter table if exists profiles add column if not exists preferred_technologies jsonb not null default '[]'::jsonb;
alter table if exists profiles add column if not exists preferred_locations jsonb not null default '[]'::jsonb;
alter table if exists profiles add column if not exists remote_preference boolean not null default true;

create unique index if not exists emails_user_provider_message_unique
on emails(user_id,provider_message_id) where provider_message_id is not null;

create index if not exists applications_user_status_idx on applications(user_id,status,updated_at desc);
create index if not exists leads_user_status_score_idx on leads(user_id,status,score desc);
create index if not exists followups_due_idx on followups(user_id,status,due_at);
create index if not exists agent_runs_user_started_idx on agent_runs(user_id,started_at desc);
