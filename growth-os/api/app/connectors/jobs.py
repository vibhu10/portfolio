import hashlib
import html
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential_jitter, retry_if_exception_type

from app.models.contracts import NormalizedJob


def _clean_html(value: str | None) -> str:
    if not value:
        return ''
    text = re.sub(r'<[^>]+>', ' ', value)
    return re.sub(r'\s+', ' ', html.unescape(text)).strip()


def _canonical_url(url: str) -> str:
    p = urlsplit(url)
    return urlunsplit((p.scheme.lower(), p.netloc.lower(), p.path.rstrip('/'), '', ''))


def fingerprint(title: str, company: str, url: str) -> str:
    basis = '|'.join([title.strip().lower(), company.strip().lower(), _canonical_url(url)])
    return hashlib.sha256(basis.encode()).hexdigest()


def parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, (int, float)):
        try:
            return datetime.fromtimestamp(float(value), tz=timezone.utc)
        except Exception:
            return None
    text = str(value).replace('Z', '+00:00')
    try:
        dt = datetime.fromisoformat(text)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


class JobConnector:
    key = 'base'
    capabilities = ['search', 'read_detail']

    def __init__(self, timeout: float = 20):
        self.timeout = timeout

    @retry(stop=stop_after_attempt(3), wait=wait_exponential_jitter(initial=1, max=8), retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)))
    async def get_json(self, url: str, *, params: dict[str, Any] | None = None) -> Any:
        async with httpx.AsyncClient(timeout=self.timeout, headers={'User-Agent': 'VibhuGrowthOS/1.0'}) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            return r.json()

    async def search(self, query: str | None = None) -> list[NormalizedJob]:
        raise NotImplementedError


class RemotiveConnector(JobConnector):
    key = 'remotive'

    async def search(self, query: str | None = None) -> list[NormalizedJob]:
        data = await self.get_json('https://remotive.com/api/remote-jobs', params={'search': query} if query else None)
        out: list[NormalizedJob] = []
        for j in data.get('jobs', []):
            url = j.get('url') or ''
            title = j.get('title') or 'Untitled role'
            company = j.get('company_name') or 'Unknown company'
            desc = _clean_html(j.get('description'))
            tags = [str(x) for x in (j.get('tags') or [])]
            out.append(NormalizedJob(
                source_key=self.key, external_id=str(j.get('id') or '') or None,
                fingerprint=fingerprint(title, company, url), title=title, company=company,
                company_url=j.get('company_logo'), location=j.get('candidate_required_location'), remote=True,
                employment_type=j.get('job_type'), salary_currency=None, url=url, description=desc,
                technologies=tags, posted_at=parse_dt(j.get('publication_date')), quality_score=78,
                raw={'category': j.get('category'), 'salary': j.get('salary')}
            ))
        return out


class ArbeitnowConnector(JobConnector):
    key = 'arbeitnow'

    async def search(self, query: str | None = None) -> list[NormalizedJob]:
        data = await self.get_json('https://www.arbeitnow.com/api/job-board-api')
        q = (query or '').lower().strip()
        out: list[NormalizedJob] = []
        for j in data.get('data', []):
            title = j.get('title') or 'Untitled role'
            company = j.get('company_name') or 'Unknown company'
            desc = _clean_html(j.get('description'))
            if q and q not in f'{title} {desc} {company}'.lower():
                continue
            url = j.get('url') or ''
            tags = [str(x) for x in (j.get('tags') or [])]
            out.append(NormalizedJob(
                source_key=self.key, external_id=str(j.get('slug') or '') or None,
                fingerprint=fingerprint(title, company, url), title=title, company=company,
                location=j.get('location'), remote=bool(j.get('remote')), url=url, description=desc,
                technologies=tags, posted_at=parse_dt(j.get('created_at')), quality_score=72,
                raw={'job_types': j.get('job_types') or []}
            ))
        return out


class RemoteOKConnector(JobConnector):
    key = 'remoteok'

    async def search(self, query: str | None = None) -> list[NormalizedJob]:
        data = await self.get_json('https://remoteok.com/api')
        q = (query or '').lower().strip()
        out: list[NormalizedJob] = []
        for j in data[1:] if isinstance(data, list) else []:
            title = j.get('position') or 'Untitled role'
            company = j.get('company') or 'Unknown company'
            desc = _clean_html(j.get('description'))
            tags = [str(x) for x in (j.get('tags') or [])]
            hay = f'{title} {company} {desc} {" ".join(tags)}'.lower()
            if q and q not in hay:
                continue
            url = j.get('url') or f"https://remoteok.com/remote-jobs/{j.get('id','')}"
            out.append(NormalizedJob(
                source_key=self.key, external_id=str(j.get('id') or '') or None,
                fingerprint=fingerprint(title, company, url), title=title, company=company,
                company_url=j.get('company_logo'), location=j.get('location') or 'Remote', remote=True,
                salary_min=float(j['salary_min']) if j.get('salary_min') else None,
                salary_max=float(j['salary_max']) if j.get('salary_max') else None,
                salary_currency='USD' if j.get('salary_min') or j.get('salary_max') else None,
                url=url, description=desc, technologies=tags, posted_at=parse_dt(j.get('date') or j.get('epoch')),
                quality_score=75, raw={'apply_url': j.get('apply_url')}
            ))
        return out


CONNECTORS = {
    'remotive': RemotiveConnector,
    'arbeitnow': ArbeitnowConnector,
    'remoteok': RemoteOKConnector,
}
