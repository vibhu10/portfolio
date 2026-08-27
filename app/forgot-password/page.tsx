'use client';

import {FormEvent,useState} from 'react';
import {supabase,isSupabaseConfigured} from '../../lib/supabase';
import './forgot.css';

const BASE='/portfolio';

export default function ForgotPasswordPage(){
  const[email,setEmail]=useState('');
  const[busy,setBusy]=useState(false);
  const[error,setError]=useState('');
  const[done,setDone]=useState(false);

  const submit=async(e:FormEvent)=>{
    e.preventDefault();setError('');
    if(!supabase||!isSupabaseConfigured){setError('Password reset is not configured yet.');return}
    setBusy(true);
    const redirectTo=`${window.location.origin}${BASE}/reset-password/`;
    const{error}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo});
    if(error)setError(error.message);else setDone(true);
    setBusy(false);
  };

  return <main className="forgot-shell"><section className="forgot-card"><span className="forgot-mark">ACCOUNT RECOVERY</span><h1>Reset your password.</h1>{done?<><p>If an account exists for <b>{email}</b>, a password-reset link has been sent. Open that email and follow the link.</p><a href={`${BASE}/admin/`}>← Back to login</a></>:<form onSubmit={submit}><p>Enter the email address used for your portfolio account.</p><label>Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></label>{error&&<div className="forgot-error">{error}</div>}<button disabled={busy}>{busy?'Sending…':'Send reset link →'}</button><a href={`${BASE}/admin/`}>← Back to login</a></form>}</section></main>
}
