'use client';

import {FormEvent,useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import {configured,supabase} from '@/lib/supabase';

export default function LoginPage(){
 const router=useRouter();
 const[email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(data.session)router.replace('/dashboard')})},[router]);
 const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');const{error}=await supabase.auth.signInWithPassword({email,password});setBusy(false);if(error)setError(error.message);else router.replace('/dashboard')};
 return <main className='min-h-screen bg-[radial-gradient(circle_at_80%_10%,rgba(124,92,255,.18),transparent_35%),#070A10] p-5 grid place-items-center'><form onSubmit={submit} className='card w-full max-w-md p-8'>
  <div className='mb-7'><span className='eyebrow'>PRIVATE · GROWTH OS</span><h1 className='mt-3 text-4xl font-black tracking-tight'>Opportunity command center.</h1><p className='muted mt-3'>Jobs, clients, outreach, inbox and AI approvals in one place.</p></div>
  {!configured&&<div className='mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200'>Supabase environment variables are missing.</div>}
  <label className='block text-sm font-semibold'>Email<input className='input mt-2' type='email' value={email} onChange={e=>setEmail(e.target.value)} required/></label>
  <label className='mt-4 block text-sm font-semibold'>Password<input className='input mt-2' type='password' value={password} onChange={e=>setPassword(e.target.value)} required/></label>
  {error&&<div className='mt-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200'>{error}</div>}
  <button className='btn btn-primary mt-6 w-full' disabled={busy||!configured}>{busy?'Signing in…':'Sign in →'}</button>
 </form></main>
}
