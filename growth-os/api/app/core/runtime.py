from functools import lru_cache
from fastapi import Header, HTTPException
from supabase import create_client, Client

from app.core.config import get_settings

@lru_cache
def db() -> Client:
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)

async def current_user_id(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail='Bearer token required')
    token = authorization.split(' ', 1)[1].strip()
    try:
        response = db().auth.get_user(token)
        user = response.user
        if not user:
            raise ValueError('No user')
        return str(user.id)
    except Exception:
        raise HTTPException(status_code=401, detail='Invalid or expired Supabase token')
