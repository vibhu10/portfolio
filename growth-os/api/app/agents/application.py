from typing import Any
from supabase import Client

from app.agents.llm import LLM

class ApplicationAgent:
    def __init__(self, db: Client):
        self.db = db
        self.llm = LLM()

    def _evidence(self, user_id: str, job_id: str) -> dict[str, Any]:
        job_rows = self.db.table('jobs').select('*').eq('id', job_id).eq('user_id', user_id).execute().data or []
        if not job_rows:
            raise ValueError('Job not found')
        return {
            'job': job_rows[0],
            'skills': self.db.table('skills').select('*').execute().data or [],
            'experiences': self.db.table('experiences').select('*').execute().data or [],
            'projects': self.db.table('projects').select('*').execute().data or [],
            'resume': self.db.table('resumes').select('id,label,parsed_text,is_primary').eq('user_id', user_id).order('is_primary', desc=True).limit(1).execute().data or [],
            'previous_answers': self.db.table('application_answers').select('question,answer,evidence_ids').eq('user_id', user_id).limit(50).execute().data or [],
        }

    def prepare(self, user_id: str, job_id: str, questions: list[str]) -> dict[str, Any]:
        evidence = self._evidence(user_id, job_id)
        draft = self.llm.json(
            'Prepare a truthful application package for this job. Compare the full job description against the evidence. Write a concise personalized cover letter, answer supplied questions, identify missing skills, and suggest resume edits. Every user-specific claim must be traceable to the evidence. Do not invent anything.',
            {**evidence, 'questions': questions},
            {
                'cover_letter': 'string',
                'answers': [{'question': 'string', 'answer': 'string', 'evidence_ids': ['source identifiers']}],
                'resume_suggestions': [{'section': 'string', 'change': 'string', 'reason': 'string'}],
                'missing_skills': ['string'],
                'fit_summary': 'string',
                'evidence_ids': ['string']
            }
        )
        app_rows = self.db.table('applications').select('*').eq('user_id', user_id).eq('job_id', job_id).execute().data or []
        if app_rows:
            app_id = app_rows[0]['id']
            self.db.table('applications').update({
                'status': 'reviewed',
                'cover_letter': draft.get('cover_letter'),
                'resume_suggestions': draft.get('resume_suggestions', []),
                'missing_skills': draft.get('missing_skills', []),
            }).eq('id', app_id).execute()
        else:
            app = self.db.table('applications').insert({
                'user_id': user_id, 'job_id': job_id, 'status': 'reviewed',
                'cover_letter': draft.get('cover_letter'),
                'resume_suggestions': draft.get('resume_suggestions', []),
                'missing_skills': draft.get('missing_skills', []),
            }).execute().data[0]
            app_id = app['id']
        for item in draft.get('answers', []):
            self.db.table('application_answers').insert({
                'user_id': user_id, 'application_id': app_id,
                'question': item.get('question', ''), 'answer': item.get('answer', ''),
                'evidence_ids': item.get('evidence_ids', []), 'approved': False
            }).execute()
        approval = self.db.table('approvals').insert({
            'user_id': user_id, 'action_type': 'job_submit', 'entity_type': 'application',
            'entity_id': app_id, 'status': 'pending', 'preview': draft
        }).execute().data[0]
        return {'application_id': app_id, 'approval_id': approval['id'], 'draft': draft, 'requires_approval': True}
