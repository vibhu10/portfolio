import hashlib
from typing import Any

from openai import OpenAI
from supabase import Client

from app.agents.llm import LLM
from app.core.config import get_settings

class PortfolioAgent:
    def __init__(self, db: Client):
        self.db = db
        self.settings = get_settings()
        self.openai = OpenAI(api_key=self.settings.openai_api_key) if self.settings.openai_api_key else None
        self.llm = LLM()

    def _embed(self, texts: list[str]) -> list[list[float]]:
        if not self.openai:
            raise RuntimeError('OPENAI_API_KEY is required for embeddings/RAG')
        return [x.embedding for x in self.openai.embeddings.create(model=self.settings.openai_embedding_model, input=texts).data]

    def sync(self, user_id: str) -> dict[str, Any]:
        docs: list[dict[str, Any]] = []
        sources = [
            ('skill', self.db.table('skills').select('*').execute().data or []),
            ('experience', self.db.table('experiences').select('*').execute().data or []),
            ('project', self.db.table('projects').select('*').execute().data or []),
            ('resume', self.db.table('resumes').select('*').eq('user_id', user_id).execute().data or []),
            ('profile', self.db.table('profiles').select('*').eq('user_id', user_id).execute().data or []),
        ]
        for source_type, rows in sources:
            for row in rows:
                content = self._row_text(source_type, row)
                if not content.strip():
                    continue
                content_hash = hashlib.sha256(content.encode()).hexdigest()
                docs.append({'source_type': source_type, 'source_id': str(row.get('id') or row.get('user_id') or ''), 'title': row.get('name') or row.get('title') or row.get('label') or source_type, 'content': content, 'content_hash': content_hash, 'metadata': {'table': source_type}})
        if not docs:
            return {'indexed': 0}
        vectors = self._embed([d['content'][:8000] for d in docs])
        for doc, vector in zip(docs, vectors):
            self.db.table('knowledge_documents').upsert({**doc, 'user_id': user_id, 'embedding': vector}, on_conflict='user_id,source_type,content_hash').execute()
        return {'indexed': len(docs)}

    def _row_text(self, source_type: str, row: dict[str, Any]) -> str:
        allowed = ['name','title','role','company','summary','description','impact','tech','technologies','category','parsed_text','bio','headline','education','services','availability','preferred_rates','preferred_jobs','preferred_technologies']
        values = []
        for key in allowed:
            value = row.get(key)
            if value not in (None, '', [], {}):
                values.append(f'{key}: {value}')
        return f'source_type: {source_type}\n' + '\n'.join(values)

    def retrieve(self, user_id: str, question: str, count: int = 8) -> list[dict[str, Any]]:
        vector = self._embed([question])[0]
        result = self.db.rpc('match_knowledge_documents', {'p_user_id': user_id, 'query_embedding': vector, 'match_count': count, 'match_threshold': .55}).execute()
        return result.data or []

    def answer(self, user_id: str, question: str, public: bool = False) -> dict[str, Any]:
        chunks = self.retrieve(user_id, question)
        if not chunks:
            return {'answer': 'I do not have enough verified portfolio information to answer that.', 'evidence': []}
        response = self.llm.json(
            ('Answer a portfolio visitor/recruiter question concisely and professionally.' if public else 'Answer the owner using verified profile knowledge.') + ' If evidence does not support a claim, do not make it.',
            {'question': question, 'chunks': chunks},
            {'answer': 'string', 'evidence_ids': ['knowledge document ids']}
        )
        return {'answer': response.get('answer',''), 'evidence_ids': response.get('evidence_ids',[]), 'evidence': chunks}
