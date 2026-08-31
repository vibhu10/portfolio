'use client';

import {useEffect} from 'react';
import {ensureFreshSession,supabase} from '../../lib/supabase';

export default function AdminSessionGuardian(){
 useEffect(()=>{
  if(!supabase)return;
  let active=true;
  const refresh=async()=>{if(!active)return;try{await ensureFreshSession()}catch{}};
  refresh();
  const interval=setInterval(refresh,4*60*1000);
  const onFocus=()=>refresh();
  const onVisibility=()=>{if(document.visibilityState==='visible')refresh()};
  window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onVisibility);
  const{data}=supabase.auth.onAuthStateChange((event)=>{if(event==='TOKEN_REFRESHED'||event==='SIGNED_IN')refresh()});
  return()=>{active=false;clearInterval(interval);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onVisibility);data.subscription.unsubscribe()};
 },[]);
 return null;
}
