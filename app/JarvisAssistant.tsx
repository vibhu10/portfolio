'use client';

import {FormEvent,useEffect,useMemo,useState} from 'react';
import {supabase,isSupabaseConfigured} from '../lib/supabase';

type Msg={role:'assistant'|'user';text:string};
type Knowledge={site:any;projects:any[];skills:any[];experiences:any[]};

const welcome="Hello. I’m Jarvis — Vibhu’s portfolio assistant. Ask me about his experience, projects, technologies, availability, or which work best matches your role.";

function clean(v:any){return String(v||'').trim()}
function localAnswer(q:string,k:Knowledge){
 const s=q.toLowerCase();
 const site=k.site||{};
 if(/(who|about|introduce|profile|vibhu)/.test(s))return `${clean(site.display_name)||'Kumar Vibhu'} is a ${clean(site.role_title)||'Full-Stack Developer'} focused on production web products, APIs, automation and data-driven applications. ${clean(site.about_one)||''}`.trim();
 if(/experience|years|worked|company/.test(s)){
  if(!k.experiences.length)return 'His portfolio shows full-stack development experience across production applications, APIs, automation and data systems.';
  return `Experience: ${k.experiences.map(x=>`${x.title} at ${x.company} (${x.start_date}–${x.end_date})`).join('; ')}.`;
 }
 if(/project|work|built|portfolio/.test(s)){
  const p=k.projects.filter(x=>x.visible!==false).slice(0,6);
  return p.length?`Selected projects include ${p.map(x=>x.name).join(', ')}. ${p[0]?.name?`${p[0].name}: ${p[0].summary||p[0].impact||''}`:''}`:'His portfolio includes full-stack web, SaaS, marketplace, mobile and data-driven projects.';
 }
 if(/tech|stack|skill|react|node|python|database|tool/.test(s)){
  const names=k.skills.filter(x=>x.visible!==false).map(x=>x.name).slice(0,36);
  return names.length?`His current stack includes ${names.join(', ')}.`:'His core stack includes React, Next.js, TypeScript, Node.js, Python/FastAPI, databases, cloud and automation tools.';
 }
 if(/contact|email|hire|available|opportunity|job/.test(s))return `For opportunities, you can contact Vibhu at ${clean(site.email)||'the email shown in the Contact section'}. ${clean(site.contact_text)||'He is open to relevant full-stack and product engineering opportunities.'}`;
 if(/resume|cv/.test(s))return 'You can download the latest resume from the main portfolio header. I can also answer questions using the same portfolio experience, project and skill data.';
 return 'I can help with Vibhu’s projects, experience, technologies, resume, or role fit. Try asking “Which project best demonstrates backend work?” or “What is his React/Next.js experience?”';
}

export default function JarvisAssistant(){
 const[open,setOpen]=useState(false),[input,setInput]=useState(''),[busy,setBusy]=useState(false),[messages,setMessages]=useState<Msg[]>([{role:'assistant',text:welcome}]);
 const[knowledge,setKnowledge]=useState<Knowledge>({site:{},projects:[],skills:[],experiences:[]});
 useEffect(()=>{if(!supabase||!isSupabaseConfigured)return;(async()=>{const[s,p,k,e]=await Promise.all([supabase.from('site_content').select('*').eq('id',1).maybeSingle(),supabase.from('projects').select('*').eq('visible',true).order('sort_order'),supabase.from('skills').select('*').eq('visible',true).order('sort_order'),supabase.from('experiences').select('*').eq('visible',true).order('sort_order')]);setKnowledge({site:s.data||{},projects:p.data||[],skills:k.data||[],experiences:e.data||[]})})()},[]);
 const context=useMemo(()=>({site:knowledge.site,projects:knowledge.projects.map(x=>({name:x.name,summary:x.summary,impact:x.impact,tech:x.tech})),skills:knowledge.skills.map(x=>({name:x.name,category:x.category})),experiences:knowledge.experiences}),[knowledge]);
 const send=async(e?:FormEvent)=>{e?.preventDefault();const q=input.trim();if(!q||busy)return;setMessages(v=>[...v,{role:'user',text:q}]);setInput('');setBusy(true);let text='';
  try{if(supabase&&isSupabaseConfigured){const{data,error}=await supabase.functions.invoke('jarvis',{body:{mode:'visitor',message:q,context}});if(!error&&data?.answer)text=data.answer}}catch{}
  if(!text)text=localAnswer(q,knowledge);setMessages(v=>[...v,{role:'assistant',text}]);setBusy(false)};
 return <div className={'jarvis-shell '+(open?'is-open':'')}><button className='jarvis-orb' onClick={()=>setOpen(v=>!v)} aria-label='Open Jarvis'><span className='jarvis-core'>J</span><i/></button>{open&&<section className='jarvis-panel'><header><div><b>JARVIS</b><small>Portfolio AI Assistant</small></div><span className='jarvis-status'><i/> ONLINE</span><button onClick={()=>setOpen(false)}>×</button></header><div className='jarvis-feed'>{messages.map((m,i)=><div key={i} className={'jarvis-msg '+m.role}>{m.text}</div>)}{busy&&<div className='jarvis-msg assistant jarvis-typing'>Analyzing portfolio data…</div>}</div><div className='jarvis-prompts'><button onClick={()=>setInput('Tell me about Vibhu’s strongest project')}>Best project</button><button onClick={()=>setInput('What technologies does Vibhu use?')}>Tech stack</button><button onClick={()=>setInput('Summarize his experience')}>Experience</button></div><form onSubmit={send}><input value={input} onChange={e=>setInput(e.target.value)} placeholder='Ask Jarvis about Vibhu…'/><button disabled={busy}>↑</button></form><footer>Answers are based on portfolio data. Recruiters should verify final details with Vibhu.</footer></section>}<style>{`
.jarvis-shell{position:fixed;right:24px;bottom:24px;z-index:90;font-family:Inter,system-ui,sans-serif}.jarvis-orb{width:58px;height:58px;border-radius:50%;border:1px solid rgba(76,215,255,.55);background:radial-gradient(circle at 35% 30%,#2d7392,#08131d 55%,#03070a);box-shadow:0 0 30px rgba(41,199,255,.23),inset 0 0 18px rgba(65,214,255,.22);color:#dff8ff;display:grid;place-items:center;cursor:pointer;position:relative}.jarvis-core{font-weight:900;font-size:19px;letter-spacing:-1px}.jarvis-orb i{position:absolute;inset:6px;border:1px solid rgba(92,223,255,.42);border-radius:50%;animation:jspin 8s linear infinite}.jarvis-panel{position:absolute;right:0;bottom:72px;width:min(390px,calc(100vw - 28px));height:560px;max-height:74vh;background:linear-gradient(180deg,rgba(8,15,24,.98),rgba(5,9,15,.98));border:1px solid rgba(73,195,236,.25);border-radius:18px;box-shadow:0 28px 90px rgba(0,0,0,.55),0 0 45px rgba(43,188,235,.08);display:grid;grid-template-rows:auto 1fr auto auto auto;overflow:hidden}.jarvis-panel header{display:flex;align-items:center;gap:12px;padding:15px 16px;border-bottom:1px solid rgba(93,205,240,.13);background:rgba(18,36,49,.55)}.jarvis-panel header>div{display:flex;flex-direction:column;flex:1}.jarvis-panel header b{font-size:13px;letter-spacing:2px;color:#dff8ff}.jarvis-panel header small{font-size:9px;color:#6f91a3;margin-top:2px}.jarvis-panel header>button{background:none;border:0;color:#7592a0;font-size:22px;cursor:pointer}.jarvis-status{font:700 8px ui-monospace,monospace;color:#6ee7b7;display:flex;align-items:center;gap:5px}.jarvis-status i{width:6px;height:6px;border-radius:50%;background:#48d59a;box-shadow:0 0 10px #48d59a}.jarvis-feed{overflow:auto;padding:16px;display:flex;flex-direction:column;gap:10px}.jarvis-msg{max-width:88%;padding:10px 12px;border-radius:12px;font-size:12px;line-height:1.55}.jarvis-msg.assistant{align-self:flex-start;color:#c9dde7;background:#0f1c25;border:1px solid #193342}.jarvis-msg.user{align-self:flex-end;color:#ecfaff;background:#17384a;border:1px solid #285a70}.jarvis-typing{opacity:.68}.jarvis-prompts{display:flex;gap:6px;padding:0 12px 10px;overflow:auto}.jarvis-prompts button{white-space:nowrap;border:1px solid #203947;background:#0a151d;color:#829eac;border-radius:999px;padding:7px 9px;font-size:9px;cursor:pointer}.jarvis-panel form{display:flex;gap:8px;padding:11px 12px;border-top:1px solid #142732}.jarvis-panel input{flex:1;min-width:0;border:1px solid #203b4a;background:#071018;color:#dcedf4;border-radius:10px;padding:11px 12px;outline:none;font-size:12px}.jarvis-panel form button{width:38px;border:0;border-radius:10px;background:linear-gradient(135deg,#1c9fc7,#5ce2ff);font-weight:900;cursor:pointer}.jarvis-panel footer{padding:0 13px 11px;color:#526a76;font-size:8px;text-align:center}@keyframes jspin{to{transform:rotate(360deg)}}@media(max-width:600px){.jarvis-shell{right:14px;bottom:14px}.jarvis-panel{bottom:68px;height:68vh}}`}</style></div>
}
