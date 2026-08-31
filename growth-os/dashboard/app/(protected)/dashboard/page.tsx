'use client';

import {FormEvent,useEffect,useState} from 'react';
import Link from 'next/link';
import {api,patch,post} from '@/lib/api';

type Metrics={jobs_discovered:number;strong_matches:number;applications:number;interviews:number;offers:number;leads_discovered:number;emails_sent:number;positive_replies:number;meetings:number;conversion_rate:number};
type Approval={id:string;action_type:string;entity_type:string;entity_id:string;preview:any;requested_at:string};
const empty:Metrics={jobs_discovered:0,strong_matches:0,applications:0,interviews:0,offers:0,leads_discovered:0,emails_sent:0,positive_replies:0,meetings:0,conversion_rate:0};

export default function DashboardPage(){
 const[metrics,setMetrics]=useState(empty),[approvals,setApprovals]=useState<Approval[]>([]),[command,setCommand]=useState(''),[reply,setReply]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{try{const[m,a]=await Promise.all([api<Metrics>('/api/v1/analytics/summary'),api<{results:Approval[]}>('/api/v1/approvals?status=pending')]);setMetrics(m);setApprovals(a.results)}catch(e:any){setError(e.message)}};
 useEffect(()=>{load()},[]);
 const run=async(e:FormEvent)=>{e.preventDefault();if(!command.trim())return;setBusy(true);setError('');try{setReply(await post('/api/v1/command',{command,context:{}}));setCommand('');await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}};
 const decide=async(id:string,status:'approved'|'rejected'|'skipped')=>{await patch(`/api/v1/approvals/${id}`,{status,edited_payload:null});await load()};
 const cards:[string,number|string][]=[['Jobs discovered',metrics.jobs_discovered],['Strong matches',metrics.strong_matches],['Applications',metrics.applications],['Interviews',metrics.interviews],['Offers',metrics.offers],['Leads',metrics.leads_discovered],['Emails sent',metrics.emails_sent],['Positive replies',metrics.positive_replies],['Meetings',metrics.meetings],['Conversion',`${metrics.conversion_rate}%`]];
 return <div className='space-y-6'>
  <header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'><div><span className='eyebrow'>AI OPPORTUNITY SYSTEM</span><h1 className='mt-2 text-4xl font-black tracking-tight'>Dashboard</h1><p className='muted mt-2'>Jobs, client pipeline, conversations and approval-gated actions.</p></div><div className='flex gap-2'><Link className='btn' href='/jobs'>Review jobs</Link><Link className='btn btn-primary' href='/leads'>Review leads</Link></div></header>
  {error&&<div className='rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200'>{error}</div>}
  <section className='grid grid-cols-2 gap-3 md:grid-cols-5'>{cards.map(([label,value])=><article className='card' key={label}><div className='text-2xl font-black'>{value}</div><div className='mt-1 text-xs text-muted'>{label}</div></article>)}</section>
  <section className='card overflow-hidden'><div className='mb-4'><span className='eyebrow'>ORCHESTRATOR</span><h2 className='mt-2 text-2xl font-black'>AI Command Center</h2><p className='muted mt-1'>Ask Jarvis to search, analyze, prepare, or prioritize. External actions remain approval-gated.</p></div><form onSubmit={run} className='flex flex-col gap-2 sm:flex-row'><input className='input flex-1' value={command} onChange={e=>setCommand(e.target.value)} placeholder='Find me 20 React jobs posted in the last 24 hours.'/><button className='btn btn-primary' disabled={busy}>{busy?'Running…':'Run command'}</button></form>{reply&&<pre className='mt-4 max-h-80 overflow-auto rounded-xl border border-line bg-ink p-4 text-xs leading-6 text-slate-300 whitespace-pre-wrap'>{JSON.stringify(reply,null,2)}</pre>}</section>
  <section className='card'><div className='mb-4 flex items-center justify-between'><div><span className='eyebrow'>HUMAN APPROVAL</span><h2 className='mt-2 text-2xl font-black'>Waiting for you</h2></div><span className='pill'>{approvals.length} pending</span></div><div className='grid gap-3'>{approvals.length?approvals.slice(0,8).map(a=><article key={a.id} className='rounded-xl border border-line bg-ink p-4'><div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'><div><div className='font-bold capitalize'>{a.action_type.replaceAll('_',' ')}</div><div className='mt-1 text-xs text-muted'>{a.entity_type} · {new Date(a.requested_at).toLocaleString()}</div><pre className='mt-3 max-h-44 overflow-auto whitespace-pre-wrap text-xs text-slate-300'>{JSON.stringify(a.preview,null,2)}</pre></div><div className='flex shrink-0 gap-2'><button className='btn btn-primary' onClick={()=>decide(a.id,'approved')}>Approve</button><button className='btn' onClick={()=>decide(a.id,'rejected')}>Reject</button><button className='btn' onClick={()=>decide(a.id,'skipped')}>Skip</button></div></div></article>):<div className='muted py-6 text-center'>No actions are waiting for approval.</div>}</div></section>
 </div>
}
