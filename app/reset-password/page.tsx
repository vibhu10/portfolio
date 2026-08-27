'use client';

import {FormEvent,useEffect,useState} from 'react';
import {supabase,isSupabaseConfigured} from '../../lib/supabase';
import './reset.css';

const BASE='/portfolio';

export default function ResetPasswordPage(){
  const[password,setPassword]=useState('');
  const[show,setShow]=useState(false);
  const[busy,setBusy]=useState(false);
  const[ready,setReady]=useState(false);
  const[error,setError]=useState('');
  const[done,setDone]=useState(false);

  useEffect(()=>{
    if(!supabase||!isSupabaseConfigured){setError('Password reset is not configured.');return}
    supabase.auth.getSession().then(({data})=>setReady(!!data.session));
    const{data}=supabase.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'||session)setReady(true)});
    return()=>data.subscription.unsubscribe();
  },[]);

  const submit=async(e:FormEvent)=>{
    e.preventDefault();setError('');
    if(password.length<8){setError('Password must be at least 8 characters.');return}
    if(!supabase){setError('Password reset is not configured.');return}
    setBusy(true);
    const{error}=await supabase.auth.updateUser({password});
    if(error)setError(error.message);else setDone(true);
    setBusy(false);
  };

  return <main className="reset-shell"><section className="reset-card"><span className="reset-mark">SECURE PASSWORD RESET</span><h1>{done?'Password updated.':'Choose a new password.'}</h1>{done?<><p>Your password has been changed successfully. You can now sign in with the new password.</p><a className="reset-primary" href={`${BASE}/admin/`}>Go to login →</a></>:ready?<form onSubmit={submit}><p>Use at least 8 characters for your new password.</p><label>New password<div className="reset-password-wrap"><input type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={8} required autoComplete="new-password"/><button type="button" onClick={()=>setShow(v=>!v)} aria-label={show?'Hide password':'Show password'}>{show?'Hide':'Show'}</button></div></label>{error&&<div className="reset-error">{error}</div>}<button className="reset-primary" disabled={busy}>{busy?'Updating…':'Update password →'}</button></form>:<><p>Open this page from the password-reset link sent to your email.</p>{error&&<div className="reset-error">{error}</div>}<a href={`${BASE}/forgot-password/`}>Request a new reset link →</a></>}</section></main>
}
