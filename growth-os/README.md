# Vibhu Growth OS

Production-oriented AI opportunity system for software jobs, freelance work, client discovery, outreach, follow-ups, inbox triage, portfolio Q&A, and analytics.

## Architecture

```text
Next.js dashboard / mobile admin
        |
        v
FastAPI API + Orchestrator
        |
        +--> Specialist agents
        |     JobFinderAgent
        |     JobMatcherAgent
        |     ApplicationAgent
        |     CompanyResearchAgent
        |     LeadFinderAgent
        |     LeadScoringAgent
        |     OutreachAgent
        |     InboxAgent
        |     ReplyAgent
        |     FollowUpAgent
        |     PortfolioAgent
        |
        +--> Connector layer
        |     Job boards / public APIs
        |     Search provider
        |     Gmail API
        |     GitHub
        |     Playwright (permitted sources only)
        |
        +--> Supabase PostgreSQL + pgvector
        |
        +--> Redis queue / worker
        |
        +--> n8n cron + approval workflows
```

## Safety model

External side effects are approval-gated by default. Discovery, scoring, research, drafting, and analysis may run automatically. Sending email, submitting an application, or performing an external write requires an approval record unless the user has explicitly enabled auto-action for a supported connector/category.

The system never fabricates experience, projects, clients, education, qualifications, revenue, or results. If profile evidence is missing, generated content must say so or omit the claim.

No CAPTCHA bypass, anti-bot evasion, credential scraping, or unsupported browser automation is implemented.

## Directory structure

```text
growth-os/
  api/
    app/
      agents/
      connectors/
      core/
      models/
      routes/
      services/
      workers/
    Dockerfile
    requirements.txt
  dashboard/
    ROUTES.md
  n8n/
    daily-opportunity-discovery.json
    follow-up-runner.json
  docs/
    architecture.md
    integrations.md
```

## Current implementation status

### Implemented in this foundation

- Supabase schema for jobs, matches, applications, companies, contacts, leads, outreach, email tracking, follow-ups, tasks, agent runs, approvals, do-not-contact, and RAG knowledge chunks.
- FastAPI service skeleton with health, jobs, leads, orchestrator command, approvals, and portfolio API contracts.
- Real public job connectors for Remotive, Arbeitnow, and RemoteOK.
- Normalization, duplicate fingerprinting, freshness filtering, role filtering, and deterministic skill-based match scoring.
- LLM agent contracts with evidence-only generation rules.
- n8n workflow definitions for daily discovery and follow-ups.
- Dashboard route specification for the requested pages.

### Credentials / external approval required

- `OPENAI_API_KEY` (or another configured LLM provider) for generated application/outreach/reply content and embeddings.
- `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` for backend writes.
- Gmail OAuth credentials for inbox/reply/send operations.
- Search-provider API key (Tavily/Serper/etc.) for broad company/client web research.
- LinkedIn, Indeed, Naukri, Upwork and similar sources require supported API/OAuth/search-provider access. The system does not scrape authenticated pages or evade platform protections.
- Redis is required when background workers are enabled in production.

## Deployment target

The portfolio can continue on GitHub Pages. Growth OS is designed for Docker deployment to DigitalOcean (App Platform, Droplet, or Kubernetes), with Supabase as managed Postgres/Auth and n8n running separately.
