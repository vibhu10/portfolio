from datetime import datetime
from typing import Any, Literal
from pydantic import BaseModel, Field, HttpUrl

TARGET_ROLES = [
    'full-stack developer','react developer','next.js developer','mern developer',
    'ai engineer','ai agent developer','automation developer'
]

class ToolResult(BaseModel):
    ok: bool
    tool: str
    run_id: str | None = None
    data: Any = None
    warnings: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)

class JobSearchRequest(BaseModel):
    query: str | None = None
    roles: list[str] = Field(default_factory=lambda: TARGET_ROLES.copy())
    remote_only: bool = True
    locations: list[str] = Field(default_factory=list)
    min_salary: float | None = None
    currency: str | None = None
    max_age_hours: int = Field(default=168, ge=1, le=2160)
    min_match_score: float = Field(default=0, ge=0, le=100)
    limit: int = Field(default=50, ge=1, le=200)
    sources: list[str] = Field(default_factory=lambda: ['remotive','arbeitnow','remoteok'])

class NormalizedJob(BaseModel):
    source_key: str
    external_id: str | None = None
    fingerprint: str
    title: str
    company: str
    company_url: str | None = None
    location: str | None = None
    remote: bool | None = None
    employment_type: str | None = None
    seniority: str | None = None
    salary_min: float | None = None
    salary_max: float | None = None
    salary_currency: str | None = None
    salary_period: str | None = None
    url: str
    description: str = ''
    requirements: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    posted_at: datetime | None = None
    quality_score: float = 50
    raw: dict[str, Any] = Field(default_factory=dict)

class MatchBreakdown(BaseModel):
    score: float
    skill_score: float
    role_score: float
    experience_score: float
    location_score: float
    freshness_score: float
    compensation_score: float
    quality_score: float
    reasons: list[str]
    missing_skills: list[str]

class ApprovalRequest(BaseModel):
    action_type: Literal['job_submit','lead_outreach','email_reply','followup_send']
    entity_type: str
    entity_id: str
    preview: dict[str, Any]

class ApprovalDecision(BaseModel):
    status: Literal['approved','rejected','skipped']
    edited_payload: dict[str, Any] | None = None

class AgentCommand(BaseModel):
    command: str
    context: dict[str, Any] = Field(default_factory=dict)

class ApplicationDraftRequest(BaseModel):
    job_id: str
    questions: list[str] = Field(default_factory=list)

class LeadSearchRequest(BaseModel):
    query: str = 'startups needing web development, AI automation, RAG, n8n or API integration'
    locations: list[str] = Field(default_factory=list)
    services: list[str] = Field(default_factory=lambda: ['React','Next.js','MERN','AI agents','RAG','business automation','n8n','Playwright','scraping','Supabase','API integrations'])
    limit: int = Field(default=20, ge=1, le=100)
