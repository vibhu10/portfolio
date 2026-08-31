create extension if not exists vector;
create extension if not exists pgcrypto;

do $$ begin create type application_status as enum ('found','reviewed','approved','applied','interview','rejected','offer'); exception when duplicate_object then null; end $$;
do $$ begin create type lead_status as enum ('discovered','researched','qualified','drafted','approved','contacted','replied','meeting','client','closed'); exception when duplicate_object then null; end $$;
do $$ begin create type approval_status as enum ('pending','approved','rejected','skipped','executed','failed'); exception when duplicate_object then null; end $$;

create table if not exists resumes (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  label text not null default 'Primary', storage_path text, parsed_text text, is_primary boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists job_sources (
  id uuid primary key default gen_random_uuid(), key text unique not null, name text not null, base_url text,
  enabled boolean not null default true, requires_auth boolean not null default false,
  capabilities jsonb not null default '[]'::jsonb, config jsonb not null default '{}'::jsonb,
  last_success_at timestamptz, last_error text, created_at timestamptz not null default now()
);
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  source_key text not null, external_id text, fingerprint text not null, title text not null, company text not null,
  company_url text, location text, remote boolean, employment_type text, seniority text,
  salary_min numeric, salary_max numeric, salary_currency text, salary_period text, url text not null,
  description text, requirements jsonb not null default '[]'::jsonb, technologies jsonb not null default '[]'::jsonb,
  posted_at timestamptz, discovered_at timestamptz not null default now(), quality_score numeric(5,2),
  raw jsonb not null default '{}'::jsonb, unique(user_id,fingerprint)
);
create index if not exists jobs_user_posted_idx on jobs(user_id,posted_at desc);
create index if not exists jobs_source_ext_idx on jobs(source_key,external_id);
create table if not exists job_matches (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete cascade not null, score numeric(5,2) not null check(score between 0 and 100),
  skill_score numeric(5,2), role_score numeric(5,2), experience_score numeric(5,2), location_score numeric(5,2),
  freshness_score numeric(5,2), compensation_score numeric(5,2), quality_score numeric(5,2),
  reasons jsonb not null default '[]'::jsonb, missing_skills jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(user_id,job_id)
);
create table if not exists applications (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  job_id uuid references jobs(id) on delete cascade not null, status application_status not null default 'found',
  cover_letter text, resume_suggestions jsonb not null default '[]'::jsonb, missing_skills jsonb not null default '[]'::jsonb,
  application_url text, submitted_at timestamptz, notes text, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(user_id,job_id)
);
create table if not exists application_answers (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  application_id uuid references applications(id) on delete cascade not null, question text not null, answer text not null,
  evidence_ids jsonb not null default '[]'::jsonb, approved boolean not null default false, created_at timestamptz not null default now()
);
create table if not exists companies (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  name text not null, domain text, website text, linkedin_url text, size_band text, industry text, location text,
  description text, research jsonb not null default '{}'::jsonb, last_researched_at timestamptz,
  created_at timestamptz not null default now(), unique(user_id,domain)
);
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  company_id uuid references companies(id) on delete set null, full_name text, title text, email text, linkedin_url text,
  source text, contact_quality numeric(5,2), verified_at timestamptz, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create unique index if not exists contacts_user_email_unique on contacts(user_id,lower(email)) where email is not null;
create table if not exists leads (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null, contact_id uuid references contacts(id) on delete set null,
  source text not null, source_url text, status lead_status not null default 'discovered', service_fit jsonb not null default '[]'::jsonb,
  outreach_reason text, score numeric(5,2) check(score between 0 and 100), scoring jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb, discovered_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists outreach_campaigns (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  name text not null, status text not null default 'draft', config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists email_threads (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null default 'gmail', provider_thread_id text not null, lead_id uuid references leads(id) on delete set null,
  application_id uuid references applications(id) on delete set null, subject text, classification text, last_message_at timestamptz,
  metadata jsonb not null default '{}'::jsonb, unique(user_id,provider,provider_thread_id)
);
create table if not exists emails (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  thread_id uuid references email_threads(id) on delete set null, lead_id uuid references leads(id) on delete set null,
  direction text not null check(direction in ('inbound','outbound','draft')), provider_message_id text, from_email text,
  to_emails jsonb not null default '[]'::jsonb, subject text, body_text text, classification text, approval_id uuid,
  sent_at timestamptz, received_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists followups (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  lead_id uuid references leads(id) on delete cascade not null, thread_id uuid references email_threads(id) on delete set null,
  sequence_no int not null check(sequence_no between 1 and 3), due_at timestamptz not null, status text not null default 'scheduled',
  draft_subject text, draft_body text, sent_at timestamptz, created_at timestamptz not null default now(), unique(lead_id,sequence_no)
);
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  type text not null, title text not null, entity_type text, entity_id uuid, status text not null default 'open',
  priority int not null default 3, due_at timestamptz, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  agent text not null, command text, status text not null default 'running', input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb, warnings jsonb not null default '[]'::jsonb, errors jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(), completed_at timestamptz, duration_ms int
);
create table if not exists approvals (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  action_type text not null, entity_type text not null, entity_id uuid not null, status approval_status not null default 'pending',
  preview jsonb not null default '{}'::jsonb, edited_payload jsonb, requested_at timestamptz not null default now(),
  decided_at timestamptz, executed_at timestamptz, error text
);
create index if not exists approvals_pending_idx on approvals(user_id,status,requested_at desc);
create table if not exists do_not_contact (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  email text, domain text, contact_id uuid references contacts(id) on delete set null, reason text not null, source text,
  created_at timestamptz not null default now()
);
create unique index if not exists dnc_email_unique on do_not_contact(user_id,lower(email)) where email is not null;
create unique index if not exists dnc_domain_unique on do_not_contact(user_id,lower(domain)) where domain is not null;
create table if not exists knowledge_documents (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null,
  source_type text not null, source_id text, title text, content text not null, metadata jsonb not null default '{}'::jsonb,
  content_hash text not null, embedding vector(1536), created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(), unique(user_id,source_type,content_hash)
);
create index if not exists knowledge_embedding_idx on knowledge_documents using ivfflat (embedding vector_cosine_ops) with (lists=100);

create or replace function match_knowledge_documents(p_user_id uuid, query_embedding vector(1536), match_count int default 8, match_threshold float default 0.6)
returns table(id uuid,source_type text,source_id text,title text,content text,metadata jsonb,similarity float)
language sql stable as $$
 select kd.id,kd.source_type,kd.source_id,kd.title,kd.content,kd.metadata,1-(kd.embedding <=> query_embedding) similarity
 from knowledge_documents kd where kd.user_id=p_user_id and kd.embedding is not null
 and 1-(kd.embedding <=> query_embedding)>=match_threshold order by kd.embedding <=> query_embedding limit match_count;
$$;

alter table jobs enable row level security; alter table job_matches enable row level security; alter table applications enable row level security;
alter table application_answers enable row level security; alter table companies enable row level security; alter table contacts enable row level security;
alter table leads enable row level security; alter table outreach_campaigns enable row level security; alter table email_threads enable row level security;
alter table emails enable row level security; alter table followups enable row level security; alter table tasks enable row level security;
alter table agent_runs enable row level security; alter table approvals enable row level security; alter table do_not_contact enable row level security;
alter table knowledge_documents enable row level security; alter table resumes enable row level security;

do $$ declare t text; begin
 foreach t in array array['jobs','job_matches','applications','application_answers','companies','contacts','leads','outreach_campaigns','email_threads','emails','followups','tasks','agent_runs','approvals','do_not_contact','knowledge_documents','resumes'] loop
  execute format('drop policy if exists owner_rows on %I',t);
  execute format('create policy owner_rows on %I for all using (auth.uid()=user_id) with check (auth.uid()=user_id)',t);
 end loop;
end $$;

insert into job_sources(key,name,base_url,enabled,requires_auth,capabilities) values
('remotive','Remotive','https://remotive.com',true,false,'["search","read_detail"]'),
('arbeitnow','Arbeitnow','https://www.arbeitnow.com',true,false,'["search","read_detail"]'),
('remoteok','RemoteOK','https://remoteok.com',true,false,'["search","read_detail"]')
on conflict(key) do update set name=excluded.name,base_url=excluded.base_url,capabilities=excluded.capabilities;
