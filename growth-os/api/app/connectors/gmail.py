import base64
import email
from email.message import EmailMessage
from typing import Any

import httpx

from app.core.config import get_settings

class GmailConnector:
    def __init__(self):
        self.settings = get_settings()
        if not (self.settings.gmail_client_id and self.settings.gmail_client_secret and self.settings.gmail_refresh_token):
            raise RuntimeError('Gmail OAuth is not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN.')

    async def _access_token(self) -> str:
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            r = await client.post('https://oauth2.googleapis.com/token', data={
                'client_id': self.settings.gmail_client_id,
                'client_secret': self.settings.gmail_client_secret,
                'refresh_token': self.settings.gmail_refresh_token,
                'grant_type': 'refresh_token',
            })
            r.raise_for_status()
            return r.json()['access_token']

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        token = await self._access_token()
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            r = await client.get(f'https://gmail.googleapis.com/gmail/v1/users/{self.settings.gmail_user_id}/{path}', params=params, headers={'Authorization': f'Bearer {token}'})
            r.raise_for_status()
            return r.json()

    async def list_messages(self, query: str = 'newer_than:7d', max_results: int = 100) -> list[dict[str, Any]]:
        data = await self._get('messages', {'q': query, 'maxResults': max_results})
        return data.get('messages', [])

    async def get_message(self, message_id: str) -> dict[str, Any]:
        return await self._get(f'messages/{message_id}', {'format': 'full'})

    async def get_thread(self, thread_id: str) -> dict[str, Any]:
        return await self._get(f'threads/{thread_id}', {'format': 'full'})

    @staticmethod
    def decode_message(message: dict[str, Any]) -> dict[str, Any]:
        payload = message.get('payload') or {}
        headers = {h.get('name','').lower(): h.get('value','') for h in payload.get('headers', [])}
        body = GmailConnector._extract_text(payload)
        return {
            'provider_message_id': message.get('id'), 'provider_thread_id': message.get('threadId'),
            'from_email': headers.get('from',''), 'to': headers.get('to',''), 'subject': headers.get('subject',''),
            'date': headers.get('date',''), 'body_text': body,
        }

    @staticmethod
    def _extract_text(part: dict[str, Any]) -> str:
        mime = part.get('mimeType')
        data = (part.get('body') or {}).get('data')
        if data and mime in ('text/plain','text/html'):
            raw = base64.urlsafe_b64decode(data + '=' * (-len(data) % 4)).decode(errors='ignore')
            if mime == 'text/html':
                import re
                raw = re.sub(r'<[^>]+>', ' ', raw)
            return ' '.join(raw.split())
        for child in part.get('parts') or []:
            text = GmailConnector._extract_text(child)
            if text:
                return text
        return ''

    async def send_message(self, to: str, subject: str, body: str, thread_id: str | None = None) -> dict[str, Any]:
        token = await self._access_token()
        msg = EmailMessage()
        msg['To'] = to
        msg['Subject'] = subject
        msg.set_content(body)
        raw = base64.urlsafe_b64encode(msg.as_bytes()).decode().rstrip('=')
        payload: dict[str, Any] = {'raw': raw}
        if thread_id:
            payload['threadId'] = thread_id
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            r = await client.post(f'https://gmail.googleapis.com/gmail/v1/users/{self.settings.gmail_user_id}/messages/send', json=payload, headers={'Authorization': f'Bearer {token}'})
            r.raise_for_status()
            return r.json()
