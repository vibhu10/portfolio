import asyncio
import math
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import Client

from app.connectors.jobs import CONNECTORS
from app.models.contracts import JobSearchRequest, MatchBreakdown, NormalizedJob

TECH_ALIASES = {
    'react.js': 'react', 'reactjs': 'react', 'nextjs': 'next.js', 'next': 'next.js',
    'nodejs': 'node.js', 'node': 'node.js', 'postgres': 'postgresql', 'postgresql': 'postgresql',
    'js': 'javascript', 'ts': 'typescript', 'mern stack': 'mern', 'n8n.io': 'n8n'
}

def norm(s: str) -> str:
    x = re.sub(r'[^a-z0-9.+#-]+', ' ', s.lower()).strip()
    return TECH_ALIASES.get(x, x)

def tokens(text: str) -> set[str]:
    raw = re.findall(r'[a-zA-Z0-9.+#-]{2,}', text.lower())
    return {norm(x) for x in raw}

def _role_score(title: str, preferred_roles: list[str]) -> float:
    t = norm(title)
    best = 0.0
    for role in preferred_roles:
        r = norm(role)
        if r in t or t in r:
            best = max(best, 100.0)
        else:
            a, b = tokens(t), tokens(r)
            if a and b:
                best = max(best, 100 * len(a & b) / len(b))
    return min(100, best)

def _freshness(posted_at: datetime | None, max_age_hours: int) -> float:
    if not posted_at:
        return 45
    now = datetime.now(timezone.utc)
    age = max(0, (now - posted_at.astimezone(timezone.utc)).total_seconds() / 3600)
    return max(0, min(100, 100 * (1 - age / max_age_hours)))

def score_job(job: NormalizedJob, profile: dict[str, Any], req: JobSearchRequest) -> MatchBreakdown:
    skill_names = [str(x.get('name', '')) for x in profile.get('skills', []) if x.get('visible', True)]
    profile_skills = {norm(x) for x in skill_names if x}
    text_tokens = tokens(' '.join([job.title, job.description, ' '.join(job.technologies)]))
    matched = sorted(x for x in profile_skills if x and any(x == t or x in t or t in x for t in text_tokens))
    skill_score = min(100.0, 25 + 75 * len(matched) / max(1, min(8, len(profile_skills)))) if matched else 0.0
    role_score = _role_score(job.title, req.roles)
    experience_score = 80.0
    location_score = 100.0 if (not req.remote_only or job.remote is True) else 20.0
    freshness_score = _freshness(job.posted_at, req.max_age_hours)
    compensation_score = 65.0
    if req.min_salary is not None:
        if job.salary_max is None and job.salary_min is None:
            compensation_score = 45.0
        else:
            ceiling = job.salary_max or job.salary_min or 0
            compensation_score = 100.0 if ceiling >= req.min_salary else max(0.0, 100 * ceiling / req.min_salary)
    quality_score = max(0.0, min(100.0, job.quality_score))
    total = (
        skill_score * .35 + role_score * .20 + experience_score * .15 + location_score * .10 +
        freshness_score * .10 + compensation_score * .05 + quality_score * .05
    )
    target_terms = {'react','next.js','node.js','typescript','javascript','supabase','openai','ai','rag','n8n','playwright','mongodb','express','python'}
    missing = sorted(x for x in target_terms if x in text_tokens and x not in profile_skills)[:8]
    reasons = []
    if matched: reasons.append('Matched skills: ' + ', '.join(matched[:8]))
    if role_score >= 70: reasons.append('Title closely matches a preferred role.')
    if job.remote: reasons.append('Remote opportunity.')
    if freshness_score >= 70: reasons.append('Recently posted.')
    if not reasons: reasons.append('Partial fit; manual review recommended.')
    return MatchBreakdown(
        score=round(total, 1), skill_score=round(skill_score, 1), role_score=round(role_score, 1),
        experience_score=round(experience_score, 1), location_score=round(location_score, 1),
        freshness_score=round(freshness_score, 1), compensation_score=round(compensation_score, 1),
        quality_score=round(quality_score, 1), reasons=reasons, missing_skills=missing
    )

class JobSearchService:
    def __init__(self, db: Client, timeout: float = 20):
        self.db = db
        self.timeout = timeout

    def load_profile(self, user_id: str) -> dict[str, Any]:
        skills = self.db.table('skills').select('*').execute().data or []
        experiences = self.db.table('experiences').select('*').execute().data or []
        projects = self.db.table('projects').select('*').execute().data or []
        return {'skills': skills, 'experiences': experiences, 'projects': projects}

    async def discover(self, user_id: str, req: JobSearchRequest) -> dict[str, Any]:
        query = req.query or ' OR '.join(req.roles)
        connectors = [CONNECTORS[k](self.timeout) for k in req.sources if k in CONNECTORS]
        batches = await asyncio.gather(*(c.search(query) for c in connectors), return_exceptions=True)
        warnings: list[str] = []
        merged: dict[str, NormalizedJob] = {}
        for connector, batch in zip(connectors, batches):
            if isinstance(batch, Exception):
                warnings.append(f'{connector.key}: {type(batch).__name__}: {batch}')
                continue
            for job in batch:
                merged.setdefault(job.fingerprint, job)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=req.max_age_hours)
        filtered = []
        for j in merged.values():
            if req.remote_only and j.remote is False:
                continue
            if j.posted_at and j.posted_at.astimezone(timezone.utc) < cutoff:
                continue
            if req.locations and j.location and not any(x.lower() in j.location.lower() for x in req.locations):
                continue
            filtered.append(j)
        profile = self.load_profile(user_id)
        ranked: list[tuple[NormalizedJob, MatchBreakdown]] = []
        for job in filtered:
            match = score_job(job, profile, req)
            if match.score >= req.min_match_score:
                ranked.append((job, match))
        ranked.sort(key=lambda x: x[1].score, reverse=True)
        ranked = ranked[:req.limit]
        saved = []
        for job, match in ranked:
            payload = job.model_dump(mode='json')
            payload['user_id'] = user_id
            result = self.db.table('jobs').upsert(payload, on_conflict='user_id,fingerprint').execute()
            row = (result.data or [None])[0]
            if not row:
                continue
            match_payload = match.model_dump()
            match_payload.update({'user_id': user_id, 'job_id': row['id']})
            self.db.table('job_matches').upsert(match_payload, on_conflict='user_id,job_id').execute()
            self.db.table('applications').upsert({'user_id': user_id, 'job_id': row['id'], 'status': 'found'}, on_conflict='user_id,job_id').execute()
            saved.append({'job': row, 'match': match.model_dump()})
        return {'count': len(saved), 'results': saved, 'warnings': warnings, 'sources': [c.key for c in connectors]}
