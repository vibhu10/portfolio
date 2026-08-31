from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.agents.application import ApplicationAgent
from app.agents.leads import LeadFinderAgent, OutreachAgent
from app.agents.orchestrator import OrchestratorAgent
from app.agents.portfolio import PortfolioAgent
from app.core.config import get_settings
from app.core.runtime import current_user_id, db
from app.models.contracts import AgentCommand, ApplicationDraftRequest, ApprovalDecision, JobSearchRequest, LeadSearchRequest
from app.services.job_search import JobSearchService

settings = get_settings()
app = FastAPI(title=settings.app_name, version='0.1.0')
app.add_middleware(CORSMiddleware, allow_origins=settings.origins, allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

@app.get('/health')
def health():
    return {'ok': True, 'service': settings.app_name, 'environment': settings.environment}

@app.post('/api/v1/jobs/discover')
async def discover_jobs(request: JobSearchRequest, user_id: str = Depends(current_user_id)):
    return await JobSearchService(db(), settings.request_timeout_seconds).discover(user_id, request)

@app.get('/api/v1/jobs')
def list_jobs(min_score: float = Query(0, ge=0, le=100), status: str | None = None, limit: int = Query(100, ge=1, le=500), user_id: str = Depends(current_user_id)):
    rows = db().table('jobs').select('*,job_matches(*),applications(*)').eq('user_id', user_id).order('posted_at', desc=True).limit(limit).execute().data or []
    out = []
    for row in rows:
        matches = row.get('job_matches') or []
        score = matches[0].get('score', 0) if matches else 0
        apps = row.get('applications') or []
        app_status = apps[0].get('status') if apps else 'found'
        if score < min_score or (status and app_status != status):
            continue
        out.append(row)
    return {'count': len(out), 'results': out}

@app.get('/api/v1/jobs/{job_id}')
def job_detail(job_id: str, user_id: str = Depends(current_user_id)):
    rows = db().table('jobs').select('*,job_matches(*),applications(*,application_answers(*))').eq('id', job_id).eq('user_id', user_id).execute().data or []
    if not rows: raise HTTPException(404, 'Job not found')
    return rows[0]

@app.post('/api/v1/applications/prepare')
def prepare_application(request: ApplicationDraftRequest, user_id: str = Depends(current_user_id)):
    try:
        return ApplicationAgent(db()).prepare(user_id, request.job_id, request.questions)
    except RuntimeError as e:
        raise HTTPException(503, str(e))

@app.get('/api/v1/applications')
def list_applications(user_id: str = Depends(current_user_id)):
    data = db().table('applications').select('*,jobs(*),application_answers(*)').eq('user_id', user_id).order('updated_at', desc=True).execute().data or []
    return {'count': len(data), 'results': data}

@app.post('/api/v1/leads/discover')
async def discover_leads(request: LeadSearchRequest, user_id: str = Depends(current_user_id)):
    try:
        return await LeadFinderAgent(db()).discover(user_id, request)
    except RuntimeError as e:
        raise HTTPException(503, str(e))

@app.get('/api/v1/leads')
def list_leads(min_score: float = Query(0, ge=0, le=100), status: str | None = None, user_id: str = Depends(current_user_id)):
    rows = db().table('leads').select('*,companies(*),contacts(*)').eq('user_id', user_id).order('score', desc=True).execute().data or []
    rows = [x for x in rows if (x.get('score') or 0) >= min_score and (not status or x.get('status') == status)]
    return {'count': len(rows), 'results': rows}

@app.get('/api/v1/leads/{lead_id}')
def lead_detail(lead_id: str, user_id: str = Depends(current_user_id)):
    rows = db().table('leads').select('*,companies(*),contacts(*),followups(*),emails(*)').eq('id', lead_id).eq('user_id', user_id).execute().data or []
    if not rows: raise HTTPException(404, 'Lead not found')
    return rows[0]

@app.post('/api/v1/leads/{lead_id}/draft-outreach')
def draft_outreach(lead_id: str, user_id: str = Depends(current_user_id)):
    try:
        return OutreachAgent(db()).draft(user_id, lead_id)
    except PermissionError as e:
        raise HTTPException(409, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))

@app.get('/api/v1/approvals')
def approvals(status: str = 'pending', user_id: str = Depends(current_user_id)):
    rows = db().table('approvals').select('*').eq('user_id', user_id).eq('status', status).order('requested_at', desc=True).execute().data or []
    return {'count': len(rows), 'results': rows}

@app.patch('/api/v1/approvals/{approval_id}')
def decide_approval(approval_id: str, decision: ApprovalDecision, user_id: str = Depends(current_user_id)):
    rows = db().table('approvals').select('*').eq('id', approval_id).eq('user_id', user_id).execute().data or []
    if not rows: raise HTTPException(404, 'Approval not found')
    update = {'status': decision.status, 'edited_payload': decision.edited_payload, 'decided_at': 'now()'}
    # Supabase REST does not evaluate SQL expressions in JSON; use an ISO timestamp instead.
    from datetime import datetime, timezone
    update['decided_at'] = datetime.now(timezone.utc).isoformat()
    result = db().table('approvals').update(update).eq('id', approval_id).execute().data or []
    if decision.status == 'approved':
        action = rows[0]['action_type']
        note = 'Approved and ready for connector execution.'
        if action in ('job_submit','lead_outreach','email_reply','followup_send'):
            note += ' No external action is executed by this endpoint; execution requires a supported connector and a separate execute call.'
    else:
        note = f"Approval marked {decision.status}."
    return {'approval': result[0] if result else None, 'note': note}

@app.post('/api/v1/knowledge/sync')
def sync_knowledge(user_id: str = Depends(current_user_id)):
    try:
        return PortfolioAgent(db()).sync(user_id)
    except RuntimeError as e:
        raise HTTPException(503, str(e))

@app.post('/api/v1/portfolio/ask')
def portfolio_ask(request: AgentCommand, user_id: str = Depends(current_user_id)):
    try:
        return PortfolioAgent(db()).answer(user_id, request.command, public=False)
    except RuntimeError as e:
        raise HTTPException(503, str(e))

@app.post('/api/v1/command')
async def command(request: AgentCommand, user_id: str = Depends(current_user_id)):
    try:
        return await OrchestratorAgent(db()).run(user_id, request)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    except ValueError as e:
        raise HTTPException(422, str(e))

@app.get('/api/v1/tasks')
def list_tasks(user_id: str = Depends(current_user_id)):
    rows = db().table('tasks').select('*').eq('user_id', user_id).order('priority').order('due_at').execute().data or []
    return {'count': len(rows), 'results': rows}

@app.get('/api/v1/emails')
def list_emails(user_id: str = Depends(current_user_id)):
    rows = db().table('emails').select('*,email_threads(*)').eq('user_id', user_id).order('created_at', desc=True).limit(200).execute().data or []
    return {'count': len(rows), 'results': rows}

@app.get('/api/v1/conversations')
def list_conversations(user_id: str = Depends(current_user_id)):
    rows = db().table('email_threads').select('*,emails(*)').eq('user_id', user_id).order('last_message_at', desc=True).limit(100).execute().data or []
    return {'count': len(rows), 'results': rows}

@app.get('/api/v1/analytics/summary')
def analytics(user_id: str = Depends(current_user_id)):
    d = db()
    jobs = d.table('jobs').select('id').eq('user_id', user_id).execute().data or []
    matches = d.table('job_matches').select('score').eq('user_id', user_id).gte('score', 85).execute().data or []
    apps = d.table('applications').select('status').eq('user_id', user_id).execute().data or []
    leads = d.table('leads').select('status').eq('user_id', user_id).execute().data or []
    emails = d.table('emails').select('direction,classification').eq('user_id', user_id).execute().data or []
    outbound = [x for x in emails if x.get('direction') == 'outbound']
    positive = [x for x in emails if x.get('classification') in ('interested','interview','meeting request','pricing request')]
    meetings = [x for x in leads if x.get('status') in ('meeting','client')]
    return {
        'jobs_discovered': len(jobs), 'strong_matches': len(matches), 'applications': len([x for x in apps if x.get('status') in ('applied','interview','rejected','offer')]),
        'interviews': len([x for x in apps if x.get('status') == 'interview']), 'offers': len([x for x in apps if x.get('status') == 'offer']),
        'leads_discovered': len(leads), 'emails_sent': len(outbound), 'positive_replies': len(positive), 'meetings': len(meetings),
        'conversion_rate': round((len(positive) / len(outbound) * 100), 1) if outbound else 0,
    }
