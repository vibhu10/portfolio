# Dashboard Structure

The dashboard is a separate authenticated Next.js app that talks only to `/api/v1/*` and Supabase Auth. It must not directly use the service-role key.

| Route | Purpose | Primary actions |
|---|---|---|
| `/dashboard` | Funnel metrics, daily priorities, approvals | Run daily search, review approvals |
| `/jobs` | Search/filter discovered jobs | Search, filter score/freshness/source/status, batch review |
| `/jobs/[id]` | Full JD + match explanation | Prepare application, edit status, open source |
| `/applications` | Application pipeline | Review drafts, approve/edit/reject, track interview/offer |
| `/leads` | Prospect pipeline | Discover leads, filter score/status/service |
| `/leads/[id]` | Company/contact research | Draft outreach, add DNC, schedule follow-ups |
| `/emails` | Inbound/outbound email list | Sync Gmail, classify, draft replies |
| `/conversations` | Threaded job/client conversations | Reply draft, approval, outcome update |
| `/tasks` | Agent-generated and manual tasks | Complete/snooze/prioritize |
| `/profile` | Structured AI memory profile | Availability, rates, preferences, services, education |
| `/resume` | Resume versions and targeted suggestions | Upload/parse, set primary, compare suggestions |
| `/analytics` | Job + client funnels and experiments | Source/role/message performance analysis |
| `/settings` | Integrations, agents, schedules, approvals | Connect Gmail/search/LLM, configure auto-action policy |

## Shared layout

- Left navigation on desktop; bottom navigation on mobile.
- Global AI Command Center at top/right.
- Approval inbox with count badge.
- Integration health indicators: Supabase, LLM, Gmail, web search, Redis, n8n.
- Every entity detail page includes an Activity timeline sourced from `agent_runs` and `activity_logs`.

## `/dashboard` metrics

- Jobs discovered
- Strong matches (`score >= configured threshold`, default 85)
- Applications
- Replies
- Interviews
- Offers
- Leads discovered
- Emails sent
- Positive replies
- Meetings
- Clients
- Conversion rate

Additional cards:
- Top 5 opportunities to focus on now
- Approvals waiting
- Follow-ups due
- Replies needing response
- Source health / connector failures

## Approval UI

Every side-effect preview shows:
- Opportunity / lead
- Match or lead score
- Evidence-backed reason
- Source
- Target person/company
- Generated application/email/reply
- Any missing information / unsupported claims

Actions: `Approve`, `Edit`, `Reject`, `Skip`, with checkbox-based batch approval. Batch approval never bypasses connector capability checks or DNC rules.

## Filters

Jobs: role, source, remote, location, salary, age, score, status, missing skill.

Leads: service fit, score, company size, signal, location, contact quality, status, DNC state.

Emails: classification, direction, date, lead/application association, approval status.

## Analytics

Job funnel:
`searched -> discovered -> strong match -> reviewed -> approved -> applied -> reply -> interview -> offer`

Client funnel:
`lead -> researched -> qualified -> drafted -> approved -> contacted -> reply -> meeting -> client`

The analytics agent should compute observations from stored events rather than inventing causal claims. Example wording: “Next.js applications had a 14% reply rate vs. 7% for other roles in this sample,” not “Next.js causes twice as many replies.”
