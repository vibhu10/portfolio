from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.agents.portfolio import PortfolioAgent
from app.core.config import get_settings
from app.core.runtime import current_user_id, db
from app.models.contracts import AgentCommand
from app.routes.resume import router as resume_router
from app.services.approval_executor import ApprovalExecutor, UnsupportedExternalAction

router=APIRouter()
router.include_router(resume_router)
settings=get_settings()

class ProfileUpdate(BaseModel):
    headline:str|None=None
    bio:str|None=None
    education:list[dict[str,Any]]|None=None
    services:list[str]|None=None
    availability:str|None=None
    preferred_rates:dict[str,Any]|None=None
    preferred_jobs:list[str]|None=None
    preferred_technologies:list[str]|None=None
    preferred_locations:list[str]|None=None
    remote_preference:bool|None=None

class DNCRequest(BaseModel):
    email:str|None=None
    domain:str|None=None
    reason:str='manual opt-out'

@router.get('/api/v1/profile')
def get_profile(user_id:str=Depends(current_user_id)):
    rows=db().table('profiles').select('*').eq('user_id',user_id).execute().data or []
    return rows[0] if rows else {'user_id':user_id}

@router.patch('/api/v1/profile')
def update_profile(request:ProfileUpdate,user_id:str=Depends(current_user_id)):
    payload={k:v for k,v in request.model_dump().items() if v is not None}
    rows=db().table('profiles').update(payload).eq('user_id',user_id).execute().data or []
    if not rows:
        raise HTTPException(404,'Profile row not found. Create/approve the Supabase profile first.')
    return rows[0]

@router.get('/api/v1/resumes')
def list_resumes(user_id:str=Depends(current_user_id)):
    rows=db().table('resumes').select('*').eq('user_id',user_id).order('is_primary',desc=True).order('updated_at',desc=True).execute().data or []
    return {'count':len(rows),'results':rows}

@router.post('/api/v1/resumes/{resume_id}/set-primary')
def set_primary_resume(resume_id:str,user_id:str=Depends(current_user_id)):
    rows=db().table('resumes').select('id').eq('id',resume_id).eq('user_id',user_id).execute().data or []
    if not rows: raise HTTPException(404,'Resume not found')
    db().table('resumes').update({'is_primary':False}).eq('user_id',user_id).execute()
    result=db().table('resumes').update({'is_primary':True}).eq('id',resume_id).execute().data or []
    return result[0]

@router.get('/api/v1/settings/integrations')
def integration_health(user_id:str=Depends(current_user_id)):
    return {'integrations':{
        'supabase':{'configured':bool(settings.supabase_url and settings.supabase_service_role_key),'capabilities':['database','auth','storage','vector']},
        'llm':{'configured':bool(settings.openai_api_key),'provider':'openai' if settings.openai_api_key else None,'capabilities':['generation','embeddings']},
        'web_search':{'configured':bool(settings.tavily_api_key),'provider':settings.search_provider,'capabilities':['company_research','lead_discovery']},
        'gmail':{'configured':bool(settings.gmail_client_id and settings.gmail_client_secret and settings.gmail_refresh_token),'capabilities':['read','classify','send_after_approval']},
        'redis':{'configured':bool(settings.redis_url),'capabilities':['queue','rate_limit']},
        'job_submit':{'configured':False,'reason':'No supported source-specific submission connector has been enabled.'}
    }}

@router.post('/api/v1/approvals/{approval_id}/execute')
async def execute_approval(approval_id:str,user_id:str=Depends(current_user_id)):
    try:return await ApprovalExecutor(db()).execute(user_id,approval_id)
    except ValueError as e:raise HTTPException(404,str(e))
    except PermissionError as e:raise HTTPException(409,str(e))
    except UnsupportedExternalAction as e:raise HTTPException(501,str(e))
    except RuntimeError as e:raise HTTPException(503,str(e))

@router.get('/api/v1/do-not-contact')
def list_dnc(user_id:str=Depends(current_user_id)):
    rows=db().table('do_not_contact').select('*').eq('user_id',user_id).order('created_at',desc=True).execute().data or []
    return {'count':len(rows),'results':rows}

@router.post('/api/v1/do-not-contact')
def add_dnc(request:DNCRequest,user_id:str=Depends(current_user_id)):
    if not request.email and not request.domain:raise HTTPException(422,'email or domain is required')
    payload={'user_id':user_id,'email':request.email.lower() if request.email else None,'domain':request.domain.lower() if request.domain else None,'reason':request.reason,'source':'manual'}
    rows=db().table('do_not_contact').insert(payload).execute().data or []
    return rows[0]

@router.delete('/api/v1/do-not-contact/{entry_id}')
def remove_dnc(entry_id:str,user_id:str=Depends(current_user_id)):
    db().table('do_not_contact').delete().eq('id',entry_id).eq('user_id',user_id).execute()
    return {'ok':True}

@router.post('/api/public/portfolio/ask')
def public_portfolio_ask(request:AgentCommand):
    if not settings.portfolio_owner_user_id:raise HTTPException(503,'PORTFOLIO_OWNER_USER_ID is not configured')
    try:return PortfolioAgent(db()).answer(settings.portfolio_owner_user_id,request.command,public=True)
    except RuntimeError as e:raise HTTPException(503,str(e))
