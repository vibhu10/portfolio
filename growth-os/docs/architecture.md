# System Architecture

## 1. Components

### Frontend
- Next.js/React/TypeScript/Tailwind dashboard.
- Supabase Auth session delegated to the API through bearer tokens.
- Human approval UI for applications, outreach, replies, and batch actions.

### API
- FastAPI service.
- Stateless request layer plus background jobs.
- OpenAPI contracts for dashboard, mobile app, n8n, and portfolio assistant.
- Idempotency keys for side-effecting operations.

### Data
- Supabase PostgreSQL is the source of truth.
- pgvector stores profile/resume/project/conversation embeddings.
- Unique fingerprints prevent duplicate jobs/leads/emails.
- Agent runs and activity logs provide auditability.

### Automation
- n8n schedules discovery, inbox sync, follow-up evaluation, and daily summaries.
- Redis-backed worker queue handles long-running enrichment, embedding, and agent tasks.

### Connectors
Every connector implements a common contract and declares capabilities:

```json
{
  "name": "source",
  "capabilities": ["search", "read_detail"],
  "requires_auth": false,
  "supports_auto_submit": false
}
```

A connector may only implement actions allowed by the source. Unsupported actions remain unavailable rather than being simulated.

## 2. Agent architecture

The OrchestratorAgent receives a structured command, determines intent, checks policy/approval requirements, and dispatches specialist agents.

- `JobFinderAgent`: source search, normalization, freshness, dedupe.
- `JobMatcherAgent`: deterministic + LLM-assisted matching; evidence citations point to profile records.
- `ApplicationAgent`: JD analysis, cover letter, application Q&A, resume suggestions, missing skills.
- `CompanyResearchAgent`: company signals, product/site findings, hiring/funding/activity signals.
- `LeadFinderAgent`: candidate business/contact discovery from permitted sources.
- `LeadScoringAgent`: need, fit, size, activity, signals, ability-to-pay proxy, contact quality.
- `OutreachAgent`: evidence-based concise personalized outreach.
- `InboxAgent`: Gmail thread ingestion and reply classification.
- `ReplyAgent`: suggested reply using thread + profile context.
- `FollowUpAgent`: schedule and generate limited sequences; do-not-contact enforced first.
- `PortfolioAgent`: public read-only RAG endpoint for recruiter/visitor questions.

## 3. Tool output contract

All agent tools return structured JSON:

```json
{
  "ok": true,
  "tool": "job_search.remotive",
  "run_id": "uuid",
  "data": {},
  "warnings": [],
  "errors": []
}
```

No agent may claim an external action succeeded without a successful connector result and an activity-log record.

## 4. Approval state machine

### Job
`Found -> Reviewed -> Approved -> Applied -> Interview -> Rejected|Offer`

### Lead
`Discovered -> Researched -> Qualified -> Drafted -> Approved -> Contacted -> Replied -> Meeting -> Client|Closed`

### Approval rules
- Search/read/analyze/draft: automatic allowed.
- First outreach to a lead: approval required.
- Job submit: approval required unless user enables auto-submit for an explicitly supported connector.
- Email reply: approval required unless category-specific auto-reply is explicitly enabled.
- Unsubscribe/not-interested: suppress future outreach immediately.

## 5. Match score (0-100)

Base deterministic score:
- 35 skills/technology overlap
- 20 role/title relevance
- 15 experience/seniority fit
- 10 remote/location fit
- 10 freshness
- 5 compensation/rate compatibility
- 5 source/listing quality

LLM can explain the score and identify semantic matches, but cannot add unsupported profile claims. Persist component scores for analytics.

## 6. Lead score (0-100)

- 25 likely service need
- 20 skill/service relevance
- 10 company size fit
- 10 recent activity
- 10 hiring/build signal
- 10 observable product/site opportunity
- 10 ability-to-pay proxy
- 5 contact quality

The system stores evidence URLs/notes behind every non-trivial scoring claim.

## 7. RAG

Knowledge documents are generated from resume, experiences, projects, skills, education, services, availability, rates, preferences, previous application answers, and prior conversations. Each chunk stores source type/source id and an embedding.

At generation time:
1. retrieve relevant chunks;
2. pass only retrieved evidence plus task context to the LLM;
3. require structured output with `evidence_ids`;
4. reject/repair statements unsupported by evidence.

## 8. Reliability

- HTTP retries use exponential backoff with jitter for retryable statuses.
- Connector rate limits are source-specific.
- Background jobs are idempotent and record attempt count.
- Deduplication uses source external id plus normalized URL/title/company fingerprint.
- Secrets only via environment variables / secret managers.
- Structured JSON logs include `run_id`, `agent`, `tool`, `entity_id`, latency, and outcome.
