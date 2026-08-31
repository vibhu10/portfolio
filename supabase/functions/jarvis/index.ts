import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
type Opportunity={id:string;kind:'job'|'client';title:string;company:string;source:string;url:string;location?:string;description?:string;published_at?:string;score?:number;reason?:string};
const text=(v:any)=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const uniq=(items:Opportunity[])=>Array.from(new Map(items.filter(x=>x.url).map(x=>[x.url,x])).values());
function score(items:Opportunity[],skills:string[],query:string){const terms=[...skills,query].flatMap(x=>text(x).toLowerCase().split(/[^a-z0-9+#.]+/)).filter(x=>x.length>2);return items.map(x=>{const hay=`${x.title} ${x.company} ${x.description||''}`.toLowerCase();const hits=Array.from(new Set(terms.filter(t=>hay.includes(t))));const s=Math.min(98,Math.max(35,45+hits.length*7));return {...x,score:s,reason:hits.length?`Matches ${hits.slice(0,5).join(', ')}`:'Potential fit — review requirements'};}).sort((a,b)=>(b.score||0)-(a.score||0));}
async function publicJobs(query:string){const out:Opportunity[]=[];await Promise.allSettled([
 fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}`).then(r=>r.json()).then(d=>{for(const j of d.jobs||[])out.push({id:`remotive-${j.id}`,kind:'job',title:text(j.title),company:text(j.company_name),source:'Remotive',url:j.url,location:text(j.candidate_required_location)||'Remote',description:text(j.description),published_at:j.publication_date})}),
 fetch(`https://www.arbeitnow.com/api/job-board-api`).then(r=>r.json()).then(d=>{for(const j of d.data||[]){const h=`${j.title} ${j.company_name} ${(j.tags||[]).join(' ')}`.toLowerCase();if(!query||h.includes(query.toLowerCase().split(' ')[0]))out.push({id:`arbeitnow-${j.slug}`,kind:'job',title:text(j.title),company:text(j.company_name),source:'Arbeitnow',url:j.url,location:text(j.location),description:text(j.description),published_at:j.created_at})}}),
 fetch('https://remoteok.com/api',{headers:{'User-Agent':'Portfolio-Jarvis/1.0'}}).then(r=>r.json()).then(d=>{for(const j of Array.isArray(d)?d.slice(1):[]){const h=`${j.position} ${j.company} ${(j.tags||[]).join(' ')}`.toLowerCase();if(!query||h.includes(query.toLowerCase().split(' ')[0]))out.push({id:`remoteok-${j.id}`,kind:'job',title:text(j.position),company:text(j.company),source:'RemoteOK',url:j.url||`https://remoteok.com/remote-jobs/${j.id}`,location:text(j.location)||'Remote',description:text(j.description),published_at:j.date})}})
 ]);return out;}
async function publicClients(query:string){const out:Opportunity[]=[];try{const r=await fetch(`https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(query+' freelance contract hiring')}&tags=story&hitsPerPage=40`);const d=await r.json();for(const h of d.hits||[]){const title=text(h.title),story=text(h.story_text),all=`${title} ${story}`.toLowerCase();if(/freelanc|contract|consult|looking for|hiring|need a|developer wanted/.test(all))out.push({id:`hn-${h.objectID}`,kind:'client',title:title||'Potential client opportunity',company:'Hacker News lead',source:'Hacker News',url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,location:'Remote / unspecified',description:story,published_at:h.created_at});}}catch{}return out;}
async function tavilySearch(kind:'job'|'client',query:string){const key=Deno.env.get('TAVILY_API_KEY');if(!key)return [] as Opportunity[];const domains=kind==='job'?['linkedin.com','indeed.com','naukri.com','wellfound.com','glassdoor.com']:['upwork.com','freelancer.com','contra.com','peopleperhour.com'];try{const r=await fetch('https://api.tavily.com/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:key,query:kind==='job'?`${query} software developer jobs`:`${query} freelance developer client project`,search_depth:'basic',max_results:15,include_domains:domains})});const d=await r.json();return (d.results||[]).map((x:any,i:number)=>({id:`web-${kind}-${i}-${btoa(x.url||String(i)).slice(0,8)}`,kind,title:text(x.title),company:kind==='job'?'Job portal':'Potential client',source:new URL(x.url).hostname.replace('www.',''),url:x.url,description:text(x.content),location:'See listing'}));}catch{return [] as Opportunity[]}}
async function searchOpportunities(kind:'job'|'client',query:string,skills:string[]){const base=kind==='job'?await publicJobs(query):await publicClients(query);const web=await tavilySearch(kind,query);return score(uniq([...base,...web]).slice(0,60),skills,query).slice(0,30)}

serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const body=await req.json();
  if(body?.mode==='opportunity_search'){
   const kind=body?.kind==='client'?'client':'job';const query=text(body?.query||'full stack developer');const skills=Array.isArray(body?.skills)?body.skills.map(text):[];
   const opportunities=await searchOpportunities(kind,query,skills);
   return new Response(JSON.stringify({opportunities,providers:{public:true,tavily:!!Deno.env.get('TAVILY_API_KEY')}}),{headers:{...cors,'Content-Type':'application/json'}});
  }
  const apiKey=Deno.env.get('OPENAI_API_KEY');
  if(!apiKey)return new Response(JSON.stringify({error:'OPENAI_API_KEY is not configured'}),{status:503,headers:{...cors,'Content-Type':'application/json'}});
  const mode=body?.mode==='admin'?'admin':'visitor';
  const message=String(body?.message||'').slice(0,5000);
  const context=JSON.stringify(body?.context||{}).slice(0,60000);
  const instructions=mode==='admin'
   ?`You are JARVIS, the private portfolio and opportunity assistant for Kumar Vibhu. Use supplied portfolio context for factual claims. Help evaluate jobs and client leads, tailor applications, draft outreach, improve resume wording and prioritize opportunities. Never claim an external action was completed unless a tool result proves it. Never submit a job application, send outreach, spend money, or modify an external account without explicit user approval. Do not invent skills or experience. Be concise and operational.`
   :`You are JARVIS, the public AI portfolio assistant for Kumar Vibhu. Answer recruiter and visitor questions using only the supplied portfolio context. Do not invent employers, dates, skills, project results or credentials. If the answer is not supported, say you do not have that detail and suggest contacting Vibhu. Keep responses concise, professional and recruiter-friendly.`;
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('OPENAI_MODEL')||'gpt-5.4-mini',instructions,input:`PORTFOLIO CONTEXT:\n${context}\n\nUSER MESSAGE:\n${message}`,max_output_tokens:900})});
  const data=await r.json();
  if(!r.ok)return new Response(JSON.stringify({error:data?.error?.message||'OpenAI request failed'}),{status:r.status,headers:{...cors,'Content-Type':'application/json'}});
  const answer=data.output_text||data.output?.flatMap((x:any)=>x.content||[]).find((x:any)=>x.type==='output_text')?.text||'';
  return new Response(JSON.stringify({answer}),{headers:{...cors,'Content-Type':'application/json'}});
 }catch(error){return new Response(JSON.stringify({error:String(error)}),{status:500,headers:{...cors,'Content-Type':'application/json'}})}
});
