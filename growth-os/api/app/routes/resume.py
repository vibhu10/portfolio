from io import BytesIO
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pypdf import PdfReader

from app.core.config import get_settings
from app.core.runtime import current_user_id, db

router=APIRouter()
settings=get_settings()
MAX_BYTES=10*1024*1024

@router.post('/api/v1/resumes/upload')
async def upload_resume(file:UploadFile=File(...),label:str=Form('Resume'),set_primary:bool=Form(True),user_id:str=Depends(current_user_id)):
    if file.content_type!='application/pdf' and not (file.filename or '').lower().endswith('.pdf'):
        raise HTTPException(415,'Resume must be a PDF')
    data=await file.read(MAX_BYTES+1)
    if len(data)>MAX_BYTES:raise HTTPException(413,'Resume PDF must be 10 MB or smaller')
    try:
        reader=PdfReader(BytesIO(data))
        pages=[(p.extract_text() or '').strip() for p in reader.pages]
        parsed='\n\n'.join(x for x in pages if x).strip()
    except Exception as exc:
        raise HTTPException(422,f'Could not parse PDF: {exc}')
    if not parsed:raise HTTPException(422,'The PDF contains no extractable text. Upload a text-based PDF.')
    import hashlib,time
    digest=hashlib.sha256(data).hexdigest()[:16]
    path=f'resume-versions/{user_id}/{int(time.time())}-{digest}.pdf'
    storage_url=f"{settings.supabase_url.rstrip('/')}/storage/v1/object/portfolio/{quote(path,safe='/')}"
    headers={'Authorization':f'Bearer {settings.supabase_service_role_key}','apikey':settings.supabase_service_role_key,'Content-Type':'application/pdf','x-upsert':'true'}
    async with httpx.AsyncClient(timeout=30) as client:
        r=await client.post(storage_url,content=data,headers=headers)
        if r.status_code not in (200,201):raise HTTPException(502,f'Supabase Storage upload failed: {r.text[:300]}')
    if set_primary:db().table('resumes').update({'is_primary':False}).eq('user_id',user_id).execute()
    rows=db().table('resumes').insert({'user_id':user_id,'label':label.strip() or 'Resume','storage_path':path,'parsed_text':parsed,'is_primary':set_primary}).execute().data or []
    if not rows:raise HTTPException(500,'Resume metadata could not be saved')
    return {'resume':rows[0],'pages':len(reader.pages),'characters':len(parsed)}
