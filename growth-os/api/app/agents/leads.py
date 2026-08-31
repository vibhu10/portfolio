import hashlib
import re
from typing import Any
from urllib.parse import urlsplit

import httpx
from supabase import Client

from app.agents.llm import LLM
from app.core.config import get_settings
from app.models.contracts import LeadSearchRequest

SERVICES = ['react','next.js','mern','ai agents','rag','business automation','n8n','playwright','scraping','supabase','api integrations']
SIGNALS = ['hiring','launch','launched','funding','raised','seed','series a','growth','automation','manual process','redesign','migration','integration','ai']

class CompanyResearchAgent:
    def __init__(self):
        self.settings = get_settings()

    async def search(self, query: str, limit: int = 20) -> list[dict[str, Any]]:
        if self.settings.search_provider != 'tavily' or not self.settings.tavily_api_key:
            raise RuntimeError('TAVILY_API_KEY is required for broad client/company research. No fake lead data is generated.')
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            r = await client.post('https://api.tavily.com/search', json={
                'api_key': self.settings.tavily_api_key,
                'query': query,
                'search_depth': 'advanced',
                'max_results': min(limit, 50),
                'include_answer': False,
                'include_raw_content': False,
            })
            r.raise_for_status()
            return r.json().get('results', [])

class LeadScoringAgent:
    def score(self, item: dict[str, Any], services: list[str]) -> dict[str, Any]:
        text = f"{item.get('title','')} {item.get('content','')}".lower()
        service_hits = [s for s in services if s.lower() in text]
        signal_hits = [s for s in SIGNALS if s in text]
        service_relevance = min(100, 30 + len(service_hits) * 14) if service_hits else 20
        need = min(100, 35 + len(signal_hits) * 12) if signal_hits else 30
        recent_activity = 70 if signal_hits else 45
        hiring_signal = 90 if 'hiring' in text else 45
        product_problem = 70 if any(x in text for x in ['redesign','migration','automation','manual process','integration']) else 40
        company_size = 55
        ability_to_pay = 65 if any(x in text for x in ['funding','raised','series a','series b','enterprise']) else 45
        contact_quality = 25
        score = need*.25 + service_relevance*.20 + company_size*.10 + recent_activity*.10 + hiring_signal*.10 + product_problem*.10 + ability_to_pay*.10 + contact_quality*.05
        return {
            'score': round(score,1),
            'scoring': {
                'need': need,'service_relevance': service_relevance,'company_size': company_size,
                'recent_activity': recent_activity,'hiring_signals': hiring_signal,'product_opportunity': product_problem,
                'ability_to_pay': ability_to_pay,'contact_quality': contact_quality,
            },
            'service_fit': service_hits,
            'signals': signal_hits,
        }

class LeadFinderAgent:
    def __init__(self, db: Client):
        self.db = db
        self.researcher = CompanyResearchAgent()
        self.scorer = LeadScoringAgent()

    async def discover(self, user_id: str, req: LeadSearchRequest) -> dict[str, Any]:
        service_query = ' OR '.join(req.services)
        location = ' '.join(req.locations)
        query = f"{req.query} ({service_query}) {location}".strip()
        results = await self.researcher.search(query, req.limit)
        saved = []
        seen_domains: set[str] = set()
        for item in results:
            url = item.get('url') or ''
            domain = urlsplit(url).netloc.lower().removeprefix('www.')
            if not domain or domain in seen_domains:
                continue
            seen_domains.add(domain)
            title = re.sub(r'\s+[|–-].*$', '', item.get('title') or domain).strip()[:160]
            company_payload = {
                'user_id': user_id, 'name': title or domain, 'domain': domain, 'website': f'https://{domain}',
                'description': (item.get('content') or '')[:5000],
                'research': {'source_url': url, 'search_score': item.get('score')},
            }
            company_rows = self.db.table('companies').upsert(company_payload, on_conflict='user_id,domain').execute().data or []
            if not company_rows:
                continue
            company = company_rows[0]
            scored = self.scorer.score(item, req.services)
            reason_parts = []
            if scored['service_fit']:
                reason_parts.append('Relevant services: ' + ', '.join(scored['service_fit'][:5]))
            if scored['signals']:
                reason_parts.append('Observed signals: ' + ', '.join(scored['signals'][:5]))
            reason = '. '.join(reason_parts) or 'Potential fit found in public company activity; research before outreach.'
            lead_payload = {
                'user_id': user_id, 'company_id': company['id'], 'source': 'tavily_web_search', 'source_url': url,
                'status': 'researched', 'service_fit': scored['service_fit'], 'outreach_reason': reason,
                'score': scored['score'], 'scoring': scored['scoring'],
                'evidence': [{'url': url, 'title': item.get('title'), 'snippet': (item.get('content') or '')[:1000]}],
            }
            lead_rows = self.db.table('leads').insert(lead_payload).execute().data or []
            if lead_rows:
                saved.append({'lead': lead_rows[0], 'company': company})
        return {'count': len(saved), 'results': saved, 'provider': 'tavily'}

class OutreachAgent:
    def __init__(self, db: Client):
        self.db = db
        self.llm = LLM()

    def draft(self, user_id: str, lead_id: str) -> dict[str, Any]:
        lead_rows = self.db.table('leads').select('*,companies(*),contacts(*)').eq('id', lead_id).eq('user_id', user_id).execute().data or []
        if not lead_rows:
            raise ValueError('Lead not found')
        lead = lead_rows[0]
        contact = lead.get('contacts')
        email = contact.get('email') if isinstance(contact, dict) else None
        company = lead.get('companies') or {}
        domain = company.get('domain')
        dnc = self.db.table('do_not_contact').select('id').eq('user_id', user_id)
        if email:
            dnc = dnc.or_(f'email.eq.{email},domain.eq.{domain}') if domain else dnc.eq('email', email)
        elif domain:
            dnc = dnc.eq('domain', domain)
        blocked = dnc.limit(1).execute().data or []
        if blocked:
            raise PermissionError('Lead/contact is on the do-not-contact list')
        evidence = {
            'lead': lead,
            'skills': self.db.table('skills').select('*').execute().data or [],
            'projects': self.db.table('projects').select('*').execute().data or [],
            'experiences': self.db.table('experiences').select('*').execute().data or [],
        }
        draft = self.llm.json(
            'Write one short, human, highly personalized cold email. Use the lead research to name one specific reason for contacting them. Mention only truthful experience/projects from evidence. Avoid generic spam, exaggerated claims, fake metrics, and pressure. Produce subject, opening, problem_or_opportunity, relevant_experience, offer, cta, and full_email.',
            evidence,
            {'subject':'string','opening':'string','problem_or_opportunity':'string','relevant_experience':'string','offer':'string','cta':'string','full_email':'string','evidence_ids':['string']}
        )
        approval = self.db.table('approvals').insert({
            'user_id': user_id, 'action_type': 'lead_outreach', 'entity_type': 'lead', 'entity_id': lead_id,
            'status': 'pending', 'preview': draft
        }).execute().data[0]
        self.db.table('leads').update({'status': 'drafted'}).eq('id', lead_id).execute()
        return {'lead_id': lead_id, 'approval_id': approval['id'], 'draft': draft, 'requires_approval': True}
