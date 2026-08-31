import json
from typing import Any
from openai import OpenAI

from app.core.config import get_settings

SYSTEM_RULES = '''You are a specialist agent inside Vibhu Growth OS. Use only supplied evidence for claims about the user. Never fabricate experience, skills, projects, employers, education, clients, revenue, results, rates, availability, or qualifications. If evidence is missing, say it is missing. Never claim an external action happened unless a tool result explicitly proves success. Return valid JSON only.'''

class LLM:
    def __init__(self):
        self.settings = get_settings()
        self.client = OpenAI(api_key=self.settings.openai_api_key) if self.settings.openai_api_key else None

    def json(self, task: str, evidence: dict[str, Any], schema_hint: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            raise RuntimeError('OPENAI_API_KEY is not configured')
        prompt = f'''TASK:\n{task}\n\nEVIDENCE:\n{json.dumps(evidence, default=str)[:70000]}\n\nOUTPUT SHAPE:\n{json.dumps(schema_hint)}'''
        response = self.client.responses.create(
            model=self.settings.openai_model,
            instructions=SYSTEM_RULES,
            input=prompt,
            max_output_tokens=1800,
        )
        text = response.output_text.strip()
        if text.startswith('```'):
            text = text.strip('`')
            if text.startswith('json'):
                text = text[4:].strip()
        return json.loads(text)
