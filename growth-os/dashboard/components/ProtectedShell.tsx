'use client';

import Link from 'next/link';
import {usePathname,useRouter} from 'next/navigation';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';

const nav=[
 ['/dashboard','Dashboard'],['/jobs','Jobs'],['/applications','Applications'],['/leads','Leads'],['/emails','Emails'],
 ['/conversations','Conversations'],['/tasks','Tasks'],['/profile','Profile'],['/resume','Resume'],['/analytics','Analytics'],['/settings','Settings']
] as const;

export default function ProtectedShell({children}:{children:React.ReactNode}){
 const router=useRouter(),path=usePathname();
 const[ready,setReady]=useState(false),[email,setEmail]=useState('');
 useEffect(()=>{let active=true;supabase.auth.getSession().then(({data})=>{if(!active)return;if(!data.session)router.replace('/login');else{setEmail(data.session.user.email||'');setReady(true)}});const{data}=supabase.auth.onAuthStateChange((_e,s)=>{if(!s)router.replace('/login')});return()=>{active=false;data.subscription.unsubscribe()}},[router]);
 if(!ready)return <div className='min-h-screen grid place-items-center text-muted'>Loading Growth OS…</div>;
 return <div className='min-h-screen lg:grid lg:grid-cols-[250px_1fr]'>
  <aside className='border-b border-line bg-panel/80 p-4 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-5'>
   <div className='flex items-center justify-between lg:block'><Link href='/dashboard' className='text-xl font-black'>VIBHU <span className='text-cyan'>GROWTH OS</span></Link><button className='btn lg:hidden' onClick={()=>supabase.auth.signOut()}>Sign out</button></div>
   <nav className='mt-4 flex gap-2 overflow-x-auto lg:mt-8 lg:grid'>{nav.map(([href,label])=>{const active=path===href||path.startsWith(href+'/');return <Link key={href} href={href} className={`rounded-xl px-3 py-2.5 text-sm font-semibold whitespace-nowrap transition ${active?'bg-gradient-to-r from-accent/30 to-cyan/10 text-white border border-accent/30':'text-muted hover:bg-white/5 hover:text-white'}`}>{label}</Link>})}</nav>
   <div className='mt-8 hidden border-t border-line pt-4 lg:block'><div className='truncate text-xs text-muted'>{email}</div><button className='mt-3 text-sm font-semibold text-red-300' onClick={()=>supabase.auth.signOut()}>Sign out</button></div>
  </aside>
  <main className='min-w-0 p-4 sm:p-6 lg:p-8'><div className='mx-auto max-w-[1500px]'>{children}</div></main>
 </div>
}
