from datetime import datetime, timezone
from email.utils import parseaddr
from typing import Any

from supabase import Client

from app.agents.llm import LLM
from app.connectors.gmail import GmailConnector

CATEGORIES = ['interested','interview','meeting request','question','pricing request','rejection','not interested','unsubscribe','unclear']

class InboxAgent:
    def __init__(self, db: Client):
        self.db = db
        self.gmail = GmailConnector()
        self.llm = LLM()

    def _classify(self, message: dict[str, Any]) -> dict[str, Any]:
        text = f"{message.get('subject','')}\n{message.get('body_text','')}".lower()
        if any(x in text for x in ['unsubscribe','remove me','do not contact','stop emailing']):
            return {'category':'unsubscribe','confidence':1.0,'reason':'Explicit opt-out language detected.'}
        if any(x in text for x in ['not interested','no thanks','not a fit']):
            return {'category':'not interested','confidence':.95,'reason':'Explicit negative response detected.'}
        return self.llm.json(
            f'Classify this inbound email into exactly one category from {CATEGORIES}.',
            {'message': message},
            {'category':'one allowed category','confidence':0.0,'reason':'string'}
        )

    async def sync(self, user_id: str, query: str = 'newer_than:7d') -> dict[str, Any]:
        refs = await self.gmail.list_messages(query=query, max_results=100)
        imported = 0
        classified = []
        for ref in refs:
            raw = await self.gmail.get_message(ref['id'])
            msg = self.gmail.decode_message(raw)
            existing = self.db.table('emails').select('id').eq('user_id', user_id).eq('provider_message_id', msg['provider_message_id']).limit(1).execute().data or []
            if existing:
                continue
            classification = self._classify(msg)
            category = classification.get('category') if classification.get('category') in CATEGORIES else 'unclear'
            thread_rows = self.db.table('email_threads').upsert({
                'user_id': user_id, 'provider': 'gmail', 'provider_thread_id': msg['provider_thread_id'],
                'subject': msg.get('subject'), 'classification': category, 'last_message_at': datetime.now(timezone.utc).isoformat(),
            }, on_conflict='user_id,provider,provider_thread_id').execute().data or []
            if not thread_rows:
                continue
            thread = thread_rows[0]
            self.db.table('emails').insert({
                'user_id': user_id, 'thread_id': thread['id'], 'direction': 'inbound',
                'provider_message_id': msg['provider_message_id'], 'from_email': msg.get('from_email'),
                'to_emails': [msg.get('to')] if msg.get('to') else [], 'subject': msg.get('subject'),
                'body_text': msg.get('body_text'), 'classification': category,
                'received_at': datetime.now(timezone.utc).isoformat(),
            }).execute()
            sender = parseaddr(msg.get('from_email') or '')[1].lower()
            if category in ('unsubscribe','not interested') and sender:
                self.db.table('do_not_contact').upsert({
                    'user_id': user_id, 'email': sender, 'reason': category, 'source': 'gmail_reply'
                }, on_conflict='user_id,email').execute()
            imported += 1
            classified.append({'message_id': msg['provider_message_id'], 'thread_id': msg['provider_thread_id'], **classification})
        return {'imported': imported, 'classified': classified}

class ReplyAgent:
    def __init__(self, db: Client):
        self.db = db
        self.llm = LLM()

    def draft(self, user_id: str, thread_id: str) -> dict[str, Any]:
        rows = self.db.table('email_threads').select('*,emails(*)').eq('id', thread_id).eq('user_id', user_id).execute().data or []
        if not rows:
            raise ValueError('Email thread not found')
        thread = rows[0]
        category = thread.get('classification') or 'unclear'
        if category in ('unsubscribe','not interested'):
            raise PermissionError('Reply drafting is disabled for opt-out/not-interested threads unless manually reviewed.')
        evidence = {
            'thread': thread,
            'skills': self.db.table('skills').select('*').execute().data or [],
            'projects': self.db.table('projects').select('*').execute().data or [],
            'experiences': self.db.table('experiences').select('*').execute().data or [],
        }
        draft = self.llm.json(
            'Draft a concise suggested reply in the owner communication style. Answer only what evidence supports. Do not invent availability, price, skills, results, or commitments. If pricing/availability is not stored, explicitly flag it for owner input.',
            evidence,
            {'subject':'string','body':'string','category':'string','needs_owner_input':['string'],'evidence_ids':['string']}
        )
        approval = self.db.table('approvals').insert({
            'user_id': user_id, 'action_type': 'email_reply', 'entity_type': 'email_thread', 'entity_id': thread_id,
            'status': 'pending', 'preview': draft
        }).execute().data[0]
        return {'thread_id': thread_id, 'approval_id': approval['id'], 'draft': draft, 'requires_approval': True}
