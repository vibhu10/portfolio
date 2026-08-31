'use client';

import {supabase} from './supabase';

const API=process.env.NEXT_PUBLIC_GROWTH_OS_API_URL||'http://localhost:8080';

export async function api<T=any>(path:string,init:RequestInit={}):Promise<T>{
 const{data}=await supabase.auth.getSession();
 const token=data.session?.access_token;
 if(!token)throw new Error('Not authenticated');
 const headers=new Headers(init.headers||{});
 headers.set('Authorization',`Bearer ${token}`);
 if(init.body&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
 const response=await fetch(`${API}${path}`,{...init,headers,cache:'no-store'});
 const payload=await response.json().catch(()=>({detail:`HTTP ${response.status}`}));
 if(!response.ok)throw new Error(payload.detail||payload.error||`Request failed (${response.status})`);
 return payload as T;
}

export const post=(path:string,body:any={})=>api(path,{method:'POST',body:JSON.stringify(body)});
export const patch=(path:string,body:any)=>api(path,{method:'PATCH',body:JSON.stringify(body)});
