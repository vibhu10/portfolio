'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {supabase} from '../../lib/supabase';
import JarvisPanel from './JarvisPanel';
import ThemeSettingsInline from './ThemeSettingsInline';

const BASE='/portfolio';

export default function AdminNavigationEnhancer(){
 const[session,setSession]=useState<any>(null),[jarvisOpen,setJarvisOpen]=useState(false),[themeTarget,setThemeTarget]=useState<HTMLElement|null>(null),[resumeUrl,setResumeUrl]=useState(`${BASE}/resume.pdf`);
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const{data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe()},[]);
 useEffect(()=>{if(!supabase||!session)return;(async()=>{const{data}=await supabase.storage.from('portfolio').list('site');if(data?.some(x=>x.name==='resume.pdf'))setResumeUrl(supabase.storage.from('portfolio').getPublicUrl('site/resume.pdf').data.publicUrl)})()},[session]);
 useEffect(()=>{
  const sync=()=>{
   const aside=document.querySelector<HTMLElement>('.admin-app aside');
   if(aside&&!aside.querySelector('[data-jarvis-nav]')){
    const btn=document.createElement('button');btn.dataset.jarvisNav='1';btn.className='jarvis-side-nav';btn.innerHTML='<span>✦ Jarvis AI</span><small>Assistant</small>';btn.onclick=()=>setJarvisOpen(true);
    const bottom=aside.querySelector('.side-bottom');aside.insertBefore(btn,bottom||null);
   }
   const grid=document.querySelector<HTMLElement>('.settings-grid');
   if(grid){let mount=grid.querySelector<HTMLElement>('[data-theme-inline-mount]');if(!mount){mount=document.createElement('div');mount.dataset.themeInlineMount='1';mount.style.gridColumn='1 / -1';grid.appendChild(mount)}setThemeTarget(mount)}else setThemeTarget(null);
  };
  sync();const observer=new MutationObserver(sync);observer.observe(document.body,{childList:true,subtree:true});return()=>observer.disconnect();
 },[]);
 if(!session)return null;
 return <>{themeTarget&&createPortal(<ThemeSettingsInline/>,themeTarget)}{jarvisOpen&&<div className='jarvis-admin-overlay' onMouseDown={e=>{if(e.target===e.currentTarget)setJarvisOpen(false)}}><div className='jarvis-admin-stage'><header><div><span>JARVIS AI</span><h2>Portfolio Intelligence</h2></div><button onClick={()=>setJarvisOpen(false)}>×</button></header><div className='jarvis-admin-scroll'><JarvisPanel session={session} resumeUrl={resumeUrl}/></div></div></div>}<style>{`
.jarvis-side-nav{display:flex!important;align-items:center;justify-content:space-between;gap:8px}.jarvis-side-nav small{font:700 8px ui-monospace,monospace;letter-spacing:.7px;color:var(--adm-accent2,#3fd4ff);border:1px solid color-mix(in srgb,var(--adm-accent2,#3fd4ff) 28%,transparent);padding:3px 5px;border-radius:999px}.jarvis-admin-overlay{position:fixed;inset:0;z-index:300;background:rgba(2,5,9,.78);backdrop-filter:blur(12px);padding:22px;display:grid;place-items:center}.jarvis-admin-stage{width:min(1180px,96vw);height:min(880px,92vh);display:grid;grid-template-rows:auto 1fr;background:var(--adm-bg,#080b12);border:1px solid var(--adm-line,#263141);border-radius:22px;overflow:hidden;box-shadow:0 40px 140px rgba(0,0,0,.68)}.jarvis-admin-stage>header{display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid var(--adm-line,#263141);background:var(--adm-panel,#101622)}.jarvis-admin-stage>header span{font:800 9px ui-monospace,monospace;letter-spacing:1.5px;color:var(--adm-accent2,#3fd4ff)}.jarvis-admin-stage>header h2{margin:4px 0 0}.jarvis-admin-stage>header button{border:0;background:transparent;color:var(--adm-muted,#8e9aa8);font-size:28px;cursor:pointer}.jarvis-admin-scroll{overflow:auto;padding:20px}@media(max-width:900px){.jarvis-side-nav small{display:none}.jarvis-admin-overlay{padding:8px}.jarvis-admin-stage{width:100%;height:96vh}.jarvis-admin-scroll{padding:12px}}
`}</style></>
}
