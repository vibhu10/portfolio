'use client';

import {useEffect,useState} from 'react';
import {api} from '@/lib/api';

export default function TasksPage(){const[items,setItems]=useState<any[]>([]),[error,setError]=useState('');useEffect(()=>{api<{results:any[]}>('/api/v1/tasks').then(x=>setItems(x.results)).catch(e=>setError(e.message))},[]);return <div className='space-y-6'><header><span className='eyebrow'>AGENT TASK QUEUE</span><h1 className='mt-2 text-4xl font-black'>Tasks</h1><p className='muted mt-2'>Manual and AI-created actions that need attention.</p></header>{error&&<div className='card text-red-300'>{error}</div>}<div className='grid gap-3'>{items.map(x=><article className='card' key={x.id}><div className='flex items-start justify-between gap-4'><div><div className='flex gap-2'><span className='pill'>{x.type}</span><span className='pill capitalize'>{x.status}</span></div><h2 className='mt-3 text-lg font-black'>{x.title}</h2>{x.due_at&&<p className='muted mt-2'>Due {new Date(x.due_at).toLocaleString()}</p>}</div><div className='text-2xl font-black text-cyan'>P{x.priority}</div></div></article>)}{!items.length&&<div className='card text-center text-muted'>No open tasks.</div>}</div></div>}
