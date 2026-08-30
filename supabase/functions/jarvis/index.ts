import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};

serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 try{
  const apiKey=Deno.env.get('OPENAI_API_KEY');
  if(!apiKey)return new Response(JSON.stringify({error:'OPENAI_API_KEY is not configured'}),{status:503,headers:{...cors,'Content-Type':'application/json'}});
  const body=await req.json();
  const mode=body?.mode==='admin'?'admin':'visitor';
  const message=String(body?.message||'').slice(0,5000);
  const context=JSON.stringify(body?.context||{}).slice(0,60000);
  const instructions=mode==='admin'
   ?`You are JARVIS, the private portfolio operations assistant for Kumar Vibhu. Use only the supplied portfolio context for factual claims about him. Help manage project summaries, resume wording, skills, recruiter responses and job-application preparation. Never claim an external action was completed unless the caller provides a tool result proving it. Never submit a job application or modify external accounts without explicit user approval. Be concise and operational.`
   :`You are JARVIS, the public AI portfolio assistant for Kumar Vibhu. Answer recruiter and visitor questions using only the supplied portfolio context. Do not invent employers, dates, skills, project results or credentials. If the answer is not supported, say you do not have that detail and suggest contacting Vibhu. Keep responses concise, professional and recruiter-friendly.`;
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:Deno.env.get('OPENAI_MODEL')||'gpt-5.4-mini',instructions,input:`PORTFOLIO CONTEXT:\n${context}\n\nUSER MESSAGE:\n${message}`,max_output_tokens:700})});
  const data=await r.json();
  if(!r.ok)return new Response(JSON.stringify({error:data?.error?.message||'OpenAI request failed'}),{status:r.status,headers:{...cors,'Content-Type':'application/json'}});
  const answer=data.output_text||data.output?.flatMap((x:any)=>x.content||[]).find((x:any)=>x.type==='output_text')?.text||'';
  return new Response(JSON.stringify({answer}),{headers:{...cors,'Content-Type':'application/json'}});
 }catch(error){return new Response(JSON.stringify({error:String(error)}),{status:500,headers:{...cors,'Content-Type':'application/json'}})}
});
