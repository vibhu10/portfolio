from datetime import datetime, timezone
from email.utils import parseaddr
from typing import Any

from supabase import Client

from app.connectors.gmail import GmailConnector

class UnsupportedExternalAction(RuntimeError):
    pass

class ApprovalExecutor:
    def __init__(self, db: Client):
        self.db = db

    async def execute(self, user_id: str, approval_id: str) -> dict[str, Any]:
        rows = self.db.table('approvals').select('*').eq('id', approval_id).eq('user_id', user_id).execute().data or []
        if not rows:
            raise ValueError('Approval not found')
        approval = rows[0]
        if approval.get('status') != 'approved':
            raise PermissionError('Action must be approved before execution')
        action = approval['action_type']
        payload = approval.get('edited_payload') or approval.get('preview') or {}
        if action == 'job_submit':
            raise UnsupportedExternalAction('No supported job-board submission connector is configured. The application is prepared but will not be auto-submitted.')
        if action == 'lead_outreach':
            result = await self._send_lead(user_id, approval, payload)
        elif action == 'email_reply':
            result = await self._send_reply(user_id, approval, payload)
        elif action == 'followup_send':
            result = await self._send_followup(user_id, approval, payload)
        else:
            raise UnsupportedExternalAction(f'No executor registered for {action}')
        self.db.table('approvals').update({'status':'executed','executed_at':datetime.now(timezone.utc).isoformat(),'error':None}).eq('id', approval_id).execute()
        self.db.table('activity_logs').insert({'actor_user_id':user_id,'action':action,'entity_type':approval['entity_type'],'entity_id':approval['entity_id'],'details':{'approval_id':approval_id,'provider_result':result}}).execute()
        return {'ok': True, 'approval_id': approval_id, 'action': action, 'result': result}

    def _blocked(self, user_id: str, email: str | None, domain: str | None) -> bool:
        if email:
            if self.db.table('do_not_contact').select('id').eq('user_id',user_id).eq('email',email.lower()).limit(1).execute().data:
                return True
        if domain:
            if self.db.table('do_not_contact').select('id').eq('user_id',user_id).eq('domain',domain.lower()).limit(1).execute().data:
                return True
        return False

    async def _send_lead(self, user_id: str, approval: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        lead_id = approval['entity_id']
        rows = self.db.table('leads').select('*,companies(*),contacts(*)').eq('id',lead_id).eq('user_id',user_id).execute().data or []
        if not rows: raise ValueError('Lead not found')
        lead=rows[0]; contact=lead.get('contacts') if isinstance(lead.get('contacts'),dict) else {}; company=lead.get('companies') or {}
        email=(contact or {}).get('email'); domain=company.get('domain')
        if not email: raise ValueError('Lead has no verified email contact')
        if self._blocked(user_id,email,domain): raise PermissionError('Contact is on the do-not-contact list')
        subject=payload.get('subject'); body=payload.get('full_email') or payload.get('body')
        if not subject or not body: raise ValueError('Approved outreach is missing subject/body')
        sent=await GmailConnector().send_message(email,subject,body)
        provider_thread=sent.get('threadId') or sent.get('id')
        thread_rows=self.db.table('email_threads').upsert({'user_id':user_id,'provider':'gmail','provider_thread_id':provider_thread,'lead_id':lead_id,'subject':subject,'last_message_at':datetime.now(timezone.utc).isoformat()},on_conflict='user_id,provider,provider_thread_id').execute().data or []
        thread_id=thread_rows[0]['id'] if thread_rows else None
        self.db.table('emails').insert({'user_id':user_id,'thread_id':thread_id,'lead_id':lead_id,'direction':'outbound','provider_message_id':sent.get('id'),'to_emails':[email],'subject':subject,'body_text':body,'sent_at':datetime.now(timezone.utc).isoformat()}).execute()
        self.db.table('leads').update({'status':'contacted','updated_at':datetime.now(timezone.utc).isoformat()}).eq('id',lead_id).execute()
        return {'provider':'gmail','message_id':sent.get('id'),'thread_id':provider_thread}

    async def _send_reply(self, user_id: str, approval: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        thread_id=approval['entity_id']
        rows=self.db.table('email_threads').select('*,emails(*)').eq('id',thread_id).eq('user_id',user_id).execute().data or []
        if not rows: raise ValueError('Thread not found')
        thread=rows[0]
        inbound=[x for x in (thread.get('emails') or []) if x.get('direction')=='inbound']
        if not inbound: raise ValueError('No inbound email available to reply to')
        recipient=parseaddr(inbound[-1].get('from_email') or '')[1].lower()
        if not recipient: raise ValueError('Could not determine reply recipient')
        domain=recipient.split('@')[-1] if '@' in recipient else None
        if self._blocked(user_id,recipient,domain): raise PermissionError('Recipient is on the do-not-contact list')
        subject=payload.get('subject') or thread.get('subject') or 'Re:'
        if not subject.lower().startswith('re:'): subject='Re: '+subject
        body=payload.get('body') or payload.get('full_email')
        if not body: raise ValueError('Approved reply is missing body')
        sent=await GmailConnector().send_message(recipient,subject,body,thread.get('provider_thread_id'))
        self.db.table('emails').insert({'user_id':user_id,'thread_id':thread_id,'direction':'outbound','provider_message_id':sent.get('id'),'to_emails':[recipient],'subject':subject,'body_text':body,'sent_at':datetime.now(timezone.utc).isoformat()}).execute()
        return {'provider':'gmail','message_id':sent.get('id'),'thread_id':sent.get('threadId')}

    async def _send_followup(self, user_id: str, approval: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        followup_id=approval['entity_id']
        rows=self.db.table('followups').select('*,leads(*,companies(*),contacts(*)),email_threads(*)').eq('id',followup_id).eq('user_id',user_id).execute().data or []
        if not rows: raise ValueError('Follow-up not found')
        f=rows[0]; lead=f.get('leads') or {}; contact=lead.get('contacts') if isinstance(lead.get('contacts'),dict) else {}; company=lead.get('companies') or {}
        recipient=(contact or {}).get('email'); domain=company.get('domain')
        if not recipient: raise ValueError('No verified email for follow-up')
        if self._blocked(user_id,recipient,domain): raise PermissionError('Recipient is on the do-not-contact list')
        subject=payload.get('subject') or f.get('draft_subject'); body=payload.get('body') or f.get('draft_body')
        if not subject or not body: raise ValueError('Follow-up draft is incomplete')
        thread=f.get('email_threads') or {}
        sent=await GmailConnector().send_message(recipient,subject,body,thread.get('provider_thread_id'))
        now=datetime.now(timezone.utc).isoformat()
        self.db.table('followups').update({'status':'sent','sent_at':now}).eq('id',followup_id).execute()
        self.db.table('emails').insert({'user_id':user_id,'thread_id':f.get('thread_id'),'lead_id':f.get('lead_id'),'direction':'outbound','provider_message_id':sent.get('id'),'to_emails':[recipient],'subject':subject,'body_text':body,'sent_at':now}).execute()
        return {'provider':'gmail','message_id':sent.get('id'),'thread_id':sent.get('threadId')}
