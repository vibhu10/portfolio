'use client';

import {useEffect,useState} from 'react';
import {supabase} from '../../lib/supabase';
import JarvisPanel from './JarvisPanel';

export default function JarvisAdminLauncher(){
 const[open,setOpen]=useState(false),[session,setSession]=useState<any>(null),[resumeUrl,setResumeUrl]=useState('/portfolio/resume.pdf');
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const{data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));const url=supabase.storage.from('portfolio').getPublicUrl('site/resume.pdf').data.publicUrl;if(url)setResumeUrl(url);return()=>data.subscription.unsubscribe()},[]);
 if(!session)return null;
 return <><button className='jarvis-admin-launcher' onClick={()=>setOpen(true)}><span>J</span> Jarvis</button>{open&&<div className='jarvis-admin-overlay'><div className='jarvis-admin-modal'><button className='jarvis-close' onClick={()=>setOpen(false)}>×</button><JarvisPanel session={session} resumeUrl={resumeUrl}/></div></div>}<style>{`.jarvis-admin-launcher{position:fixed;right:22px;bottom:22px;z-index:80;border:1px solid #2e718a;background:linear-gradient(135deg,#0b1a24,#102a38);color:#dff8ff;border-radius:999px;padding:9px 14px 9px 9px;display:flex;align-items:center;gap:8px;font-weight:800;box-shadow:0 12px 34px rgba(0,0,0,.3);cursor:pointer}.jarvis-admin-launcher span{width:29px;height:29px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle,#2d7793,#071017);border:1px solid #51d8ff}.jarvis-admin-overlay{position:fixed;inset:0;z-index:120;background:rgba(2,5,9,.78);backdrop-filter:blur(8px);padding:26px;overflow:auto}.jarvis-admin-modal{max-width:1180px;margin:20px auto;position:relative}.jarvis-close{position:sticky;top:0;float:right;z-index:4;width:38px;height:38px;border-radius:50%;border:1px solid #36505d;background:#0b141b;color:#b9d2dc;font-size:22px;cursor:pointer}@media(max-width:650px){.jarvis-admin-overlay{padding:10px}.jarvis-admin-launcher{right:12px;bottom:12px}}`}</style></>;
}
