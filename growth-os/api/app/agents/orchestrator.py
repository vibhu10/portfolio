from typing import Any
from supabase import Client

from app.agents.application import ApplicationAgent
from app.agents.leads import LeadFinderAgent, OutreachAgent
from app.agents.llm import LLM
from app.agents.portfolio import PortfolioAgent
from app.models.contracts import AgentCommand, JobSearchRequest, LeadSearchRequest
from app.services.job_search import JobSearchService

class OrchestratorAgent:
    def __init__(self, db: Client):
        self.db = db
        self.llm = LLM()
        self.jobs = JobSearchService(db)
        self.applications = ApplicationAgent(db)
        self.leads = LeadFinderAgent(db)
        self.outreach = OutreachAgent(db)
        self.portfolio = PortfolioAgent(db)

    def _plan(self, command: str) -> dict[str, Any]:
        text = command.lower()
        # Deterministic fast-paths keep common commands usable even before an LLM key is configured.
        if 'job' in text and any(x in text for x in ['find','search','show']):
            return {'agent':'JobFinderAgent','action':'search_jobs','args':{}}
        if 'client' in text and any(x in text for x in ['find','search','lead']):
            return {'agent':'LeadFinderAgent','action':'search_leads','args':{}}
        if 'portfolio' in text or 'who is vibhu' in text:
            return {'agent':'PortfolioAgent','action':'answer','args':{'question':command}}
        return self.llm.json(
            'Route the owner command to exactly one supported agent/action. Do not invent capabilities.',
            {'command': command, 'supported': {
                'JobFinderAgent':['search_jobs'], 'ApplicationAgent':['prepare_application'],
                'LeadFinderAgent':['search_leads'], 'OutreachAgent':['draft_outreach'],
                'PortfolioAgent':['answer','sync_knowledge']
            }},
            {'agent':'string','action':'string','args':{}}
        )

    async def run(self, user_id: str, request: AgentCommand) -> dict[str, Any]:
        run = self.db.table('agent_runs').insert({
            'user_id': user_id, 'agent': 'OrchestratorAgent', 'command': request.command,
            'status': 'running', 'input': {'command': request.command, 'context': request.context}
        }).execute().data[0]
        try:
            plan = self._plan(request.command)
            action = plan.get('action')
            args = {**(plan.get('args') or {}), **request.context}
            if action == 'search_jobs':
                result = await self.jobs.discover(user_id, JobSearchRequest(**args))
            elif action == 'prepare_application':
                if not args.get('job_id'): raise ValueError('job_id is required')
                result = self.applications.prepare(user_id, args['job_id'], args.get('questions', []))
            elif action == 'search_leads':
                result = await self.leads.discover(user_id, LeadSearchRequest(**args))
            elif action == 'draft_outreach':
                if not args.get('lead_id'): raise ValueError('lead_id is required')
                result = self.outreach.draft(user_id, args['lead_id'])
            elif action == 'sync_knowledge':
                result = self.portfolio.sync(user_id)
            elif action == 'answer':
                result = self.portfolio.answer(user_id, args.get('question') or request.command, public=False)
            else:
                raise ValueError(f'Unsupported orchestrator action: {action}')
            self.db.table('agent_runs').update({'status':'completed','output':{'plan':plan,'result':result}}).eq('id', run['id']).execute()
            return {'run_id': run['id'], 'plan': plan, 'result': result}
        except Exception as exc:
            self.db.table('agent_runs').update({'status':'failed','errors':[str(exc)]}).eq('id', run['id']).execute()
            raise
