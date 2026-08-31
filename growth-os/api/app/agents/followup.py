from datetime import datetime, timedelta, timezone
from typing import Any

from supabase import Client

from app.agents.llm import LLM

class FollowUpAgent:
    def __init__(self, db: Client):
        self.db = db
        self.llm = LLM()

    def schedule_for_lead(self, user_id: str, lead_id: str, days: tuple[int,int,int] = (3,7,12)) -> dict[str, Any]:
        lead_rows = self.db.table('leads').select('*,companies(*),contacts(*)').eq('id', lead_id).eq('user_id', user_id).execute().data or []
        if not lead_rows:
            raise ValueError('Lead not found')
        lead = lead_rows[0]
        contact = lead.get('contacts') if isinstance(lead.get('contacts'), dict) else None
        email = (contact or {}).get('email')
        company = lead.get('companies') or {}
        domain = company.get('domain')
        if email:
            blocked = self.db.table('do_not_contact').select('id').eq('user_id', user_id).eq('email', email).limit(1).execute().data or []
            if blocked:
                raise PermissionError('Contact is on the do-not-contact list')
        if domain:
            blocked_domain = self.db.table('do_not_contact').select('id').eq('user_id', user_id).eq('domain', domain).limit(1).execute().data or []
            if blocked_domain:
                raise PermissionError('Company domain is on the do-not-contact list')
        now = datetime.now(timezone.utc)
        created = []
        for i, day in enumerate(days, start=1):
            rows = self.db.table('followups').upsert({
                'user_id': user_id, 'lead_id': lead_id, 'sequence_no': i,
                'due_at': (now + timedelta(days=day)).isoformat(), 'status': 'scheduled'
            }, on_conflict='lead_id,sequence_no').execute().data or []
            if rows: created.append(rows[0])
        return {'lead_id': lead_id, 'scheduled': created, 'max_followups': 3}

    def draft_due(self, user_id: str) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        due = self.db.table('followups').select('*,leads(*,companies(*),contacts(*)),email_threads(*,emails(*))').eq('user_id', user_id).eq('status', 'scheduled').lte('due_at', now).order('due_at').execute().data or []
        prepared = []
        for item in due:
            lead = item.get('leads') or {}
            if lead.get('status') in ('replied','meeting','client','closed'):
                self.db.table('followups').update({'status':'cancelled'}).eq('id', item['id']).execute()
                continue
            contact = lead.get('contacts') if isinstance(lead.get('contacts'), dict) else {}
            email = (contact or {}).get('email')
            domain = (lead.get('companies') or {}).get('domain')
            blocked = []
            if email:
                blocked += self.db.table('do_not_contact').select('id').eq('user_id', user_id).eq('email', email).limit(1).execute().data or []
            if domain:
                blocked += self.db.table('do_not_contact').select('id').eq('user_id', user_id).eq('domain', domain).limit(1).execute().data or []
            if blocked:
                self.db.table('followups').update({'status':'cancelled'}).eq('id', item['id']).execute()
                continue
            draft = self.llm.json(
                f"Write follow-up #{item['sequence_no']} of a maximum 3. Keep it short, respectful, non-repetitive, and easy to decline. Do not invent facts or urgency.",
                {'lead': lead, 'thread': item.get('email_threads'), 'sequence_no': item['sequence_no']},
                {'subject':'string','body':'string','evidence_ids':['string']}
            )
            self.db.table('followups').update({'status':'drafted','draft_subject':draft.get('subject'),'draft_body':draft.get('body')}).eq('id', item['id']).execute()
            approval = self.db.table('approvals').insert({
                'user_id': user_id, 'action_type': 'followup_send', 'entity_type': 'followup', 'entity_id': item['id'],
                'status': 'pending', 'preview': draft
            }).execute().data[0]
            prepared.append({'followup_id': item['id'], 'approval_id': approval['id'], 'draft': draft})
        return {'prepared': prepared, 'count': len(prepared)}
