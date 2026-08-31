'use client';

import Link from 'next/link';
import {FormEvent,useEffect,useState} from 'react';
import {api,post} from '@/lib/api';

type Job={id:string;title:string;company:string;location?:string;remote?:boolean;posted_at?:string;source_key:string;url:string;job_matches?:{score:number;reasons:string[];missing_skills:string[]}[];applications?:{status:string}[]};

export default function JobsPage(){
 const[items,setItems]=useState<Job[]>([]),[query,setQuery]=useState(''),[minScore,setMinScore]=useState(60),[age,setAge]=useState(168),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{try{const d=await api<{results:Job[]}>(`/api/v1/jobs?min_score=${minScore}&limit=200`);setItems(d.results)}catch(e:any){setError(e.message)}};
 useEffect(()=>{load()},[minScore]);
 const discover=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{await post('/api/v1/jobs/discover',{query:query||null,remote_only:true,max_age_hours:age,min_match_score:minScore,limit:100,sources:['remotive','arbeitnow','remoteok']});await load()}catch(e:any){setError(e.message)}finally{setBusy(false)}};
 return <div className='space-y-6'><header><span className='eyebrow'>JOB SEARCH AGENT</span><h1 className='mt-2 text-4xl font-black'>Jobs</h1><p className='muted mt-2'>Live public-source discovery, duplicate removal, matching and application pipeline.</p></header>
  <form onSubmit={discover} className='card grid gap-3 md:grid-cols-[1fr_150px_150px_auto]'><input className='input' value={query} onChange={e=>setQuery(e.target.value)} placeholder='Optional custom search, e.g. React Next.js AI'/><select className='input' value={age} onChange={e=>setAge(Number(e.target.value))}><option value={24}>Last 24h</option><option value={72}>Last 3 days</option><option value={168}>Last 7 days</option><option value={720}>Last 30 days</option></select><select className='input' value={minScore} onChange={e=>setMinScore(Number(e.target.value))}><option value={0}>Any score</option><option value={60}>60+</option><option value={70}>70+</option><option value={80}>80+</option><option value={85}>85+</option></select><button className='btn btn-primary' disabled={busy}>{busy?'Searching…':'Search sources'}</button></form>
  {error&&<div className='rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200'>{error}</div>}
  <div className='grid gap-3'>{items.map(job=>{const m=job.job_matches?.[0],status=job.applications?.[0]?.status||'found';return <Link href={`/jobs/${job.id}`} key={job.id} className='card transition hover:-translate-y-0.5 hover:border-cyan/30'><div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'><div className='min-w-0'><div className='flex flex-wrap items-center gap-2'><span className='pill'>{job.source_key}</span><span className='pill capitalize'>{status}</span>{job.remote&&<span className='pill'>Remote</span>}</div><h2 className='mt-3 text-xl font-black'>{job.title}</h2><p className='mt-1 text-sm text-slate-300'>{job.company}{job.location?` · ${job.location}`:''}</p><p className='muted mt-3'>{m?.reasons?.slice(0,2).join(' ')||'Match analysis pending.'}</p>{m?.missing_skills?.length?<p className='mt-2 text-xs text-amber-300'>Possible gaps: {m.missing_skills.join(', ')}</p>:null}</div><div className='shrink-0 text-right'><div className='text-3xl font-black text-cyan'>{Math.round(m?.score||0)}</div><div className='text-[10px] font-bold uppercase tracking-wider text-muted'>Match score</div>{job.posted_at&&<div className='mt-3 text-xs text-muted'>{new Date(job.posted_at).toLocaleDateString()}</div>}</div></div></Link>})}{!items.length&&!busy&&<div className='card py-12 text-center text-muted'>No stored jobs match this filter yet. Run a search above.</div>}</div>
 </div>
}
