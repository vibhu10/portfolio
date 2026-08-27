'use client';

import {FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from '../../lib/supabase';
import './messenger.css';

type DirectoryUser={user_id:string;full_name:string;avatar_url:string|null;job_title:string|null;role:string;status:string};
type Message={id:string;sender_id:string;recipient_id:string;body:string;created_at:string;read_at:string|null};

export default function TeamMessenger({session}:{session:any}){
  const[people,setPeople]=useState<DirectoryUser[]>([]),[online,setOnline]=useState<Set<string>>(new Set()),[selected,setSelected]=useState<DirectoryUser|null>(null),[messages,setMessages]=useState<Message[]>([]),[text,setText]=useState(''),[chatOpen,setChatOpen]=useState(false),[railOpen,setRailOpen]=useState(false),[error,setError]=useState(''),[unread,setUnread]=useState<Record<string,number>>({}),[toast,setToast]=useState<{name:string;body:string}|null>(null),[alertsEnabled,setAlertsEnabled]=useState(false);
  const endRef=useRef<HTMLDivElement|null>(null),selectedRef=useRef<DirectoryUser|null>(null),peopleRef=useRef<DirectoryUser[]>([]);
  const me=session?.user?.id as string|undefined;
  const visiblePeople=useMemo(()=>people.filter(p=>p.user_id!==me&&p.status==='active').sort((a,b)=>Number(online.has(b.user_id))-Number(online.has(a.user_id))||a.full_name.localeCompare(b.full_name)),[people,me,online]);
  const unreadTotal=Object.values(unread).reduce((a,b)=>a+b,0);

  useEffect(()=>{selectedRef.current=selected},[selected]);
  useEffect(()=>{peopleRef.current=people},[people]);

  useEffect(()=>{if(!supabase||!me)return;let channel:any;let messageChannel:any;let alive=true;
    const boot=async()=>{
      const[{data,error},{data:unreadRows}]=await Promise.all([supabase.from('team_directory').select('*').order('full_name'),supabase.from('team_messages').select('sender_id').eq('recipient_id',me).is('read_at',null)]);
      if(!alive)return;if(error)setError(error.message);else{setPeople((data||[]) as DirectoryUser[]);peopleRef.current=(data||[]) as DirectoryUser[]}
      if(unreadRows){const counts:Record<string,number>={};unreadRows.forEach((r:any)=>counts[r.sender_id]=(counts[r.sender_id]||0)+1);setUnread(counts)}
      channel=supabase.channel('portfolio-team-presence',{config:{presence:{key:me}}});
      channel.on('presence',{event:'sync'},()=>{const state=channel.presenceState();setOnline(new Set(Object.keys(state)))});
      channel.subscribe(async(status:string)=>{if(status==='SUBSCRIBED')await channel.track({user_id:me,online_at:new Date().toISOString()})});
      messageChannel=supabase.channel(`team-messages-${me}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'team_messages'},(payload:any)=>{
        const m=payload.new as Message;const current=selectedRef.current;
        if((m.sender_id===me||m.recipient_id===me)&&current&&(m.sender_id===current.user_id||m.recipient_id===current.user_id))setMessages(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m]);
        if(m.recipient_id===me){
          const sender=peopleRef.current.find(p=>p.user_id===m.sender_id);const name=sender?.full_name||'Team member';
          if(current?.user_id!==m.sender_id||!chatOpen)setUnread(prev=>({...prev,[m.sender_id]:(prev[m.sender_id]||0)+1}));
          setToast({name,body:m.body});setTimeout(()=>setToast(null),4500);
          if(typeof window!=='undefined'&&'Notification'in window&&Notification.permission==='granted')new Notification(name,{body:m.body,icon:sender?.avatar_url||undefined,tag:`team-${m.sender_id}`});
        }
      }).subscribe();
    };boot();
    return()=>{alive=false;if(channel)supabase.removeChannel(channel);if(messageChannel)supabase.removeChannel(messageChannel)};
  },[me]);

  useEffect(()=>{if(!supabase||!me||!selected)return;loadConversation(selected.user_id)},[selected?.user_id,me]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages,chatOpen]);

  const loadConversation=async(other:string)=>{if(!supabase||!me)return;setError('');const{data,error}=await supabase.from('team_messages').select('*').or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`).order('created_at',{ascending:true}).limit(300);if(error)setError(error.message);else{setMessages((data||[]) as Message[]);await supabase.from('team_messages').update({read_at:new Date().toISOString()}).eq('recipient_id',me).eq('sender_id',other).is('read_at',null);setUnread(prev=>({...prev,[other]:0}))}};
  const send=async(e:FormEvent)=>{e.preventDefault();if(!supabase||!me||!selected||!text.trim())return;const body=text.trim();setText('');setError('');const{error}=await supabase.from('team_messages').insert({sender_id:me,recipient_id:selected.user_id,body});if(error){setText(body);setError(error.message)}};
  const choose=(p:DirectoryUser)=>{setSelected(p);setChatOpen(true);setRailOpen(false)};
  const enableAlerts=async()=>{if(typeof window==='undefined'||!('Notification'in window))return;const permission=await Notification.requestPermission();setAlertsEnabled(permission==='granted')};
  const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');

  return <>
    <button className={`team-launcher ${railOpen?'active':''}`} onClick={()=>setRailOpen(v=>!v)} aria-label="Open team messenger"><span className="launcher-icon">◉</span><span className="launcher-copy"><b>Team</b><small>{online.size} online</small></span>{unreadTotal>0&&<em>{unreadTotal>99?'99+':unreadTotal}</em>}</button>
    {railOpen&&<aside className="team-presence-rail">
      <div className="presence-head"><div><b>Team</b><span>{online.size} online now</span></div><button onClick={()=>setRailOpen(false)}>×</button></div>
      <button className="notify-toggle" onClick={enableAlerts}>{alertsEnabled||typeof Notification!=='undefined'&&Notification.permission==='granted'?'✓ Alerts enabled':'🔔 Enable message alerts'}</button>
      <div className="presence-list">{visiblePeople.length?visiblePeople.map(p=><button className="person-button" key={p.user_id} onClick={()=>choose(p)} title={`Message ${p.full_name}`}>
        <span className="presence-avatar-wrap">{p.avatar_url?<img src={p.avatar_url} alt=""/>:<span className="presence-avatar-fallback">{initials(p.full_name||'U')}</span>}<i className={online.has(p.user_id)?'online':'offline'}/></span>
        <span className="presence-meta"><strong>{p.full_name||'Team member'}</strong><small>{online.has(p.user_id)?'Online':p.job_title||p.role.replace('_',' ')}</small></span>{(unread[p.user_id]||0)>0&&<em className="person-unread">{unread[p.user_id]}</em>}
      </button>):<div className="presence-empty">No team members yet.</div>}</div>
    </aside>}
    {toast&&<button className="message-toast" onClick={()=>{const p=people.find(x=>x.full_name===toast.name);if(p)choose(p)}}><b>{toast.name}</b><span>{toast.body}</span></button>}
    {chatOpen&&selected&&<section className="team-chat">
      <header><span className="presence-avatar-wrap">{selected.avatar_url?<img src={selected.avatar_url} alt=""/>:<span className="presence-avatar-fallback">{initials(selected.full_name||'U')}</span>}<i className={online.has(selected.user_id)?'online':'offline'}/></span><div><strong>{selected.full_name}</strong><small>{online.has(selected.user_id)?'Online now':selected.job_title||selected.role.replace('_',' ')}</small></div><button className="chat-close" onClick={()=>setChatOpen(false)}>×</button></header>
      <div className="chat-body">{error&&<div className="chat-error">{error}</div>}{messages.length?messages.map(m=><div key={m.id} className={`chat-bubble ${m.sender_id===me?'mine':'theirs'}`}><p>{m.body}</p><small>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}{m.sender_id===me&&<span className="read-mark"> {m.read_at?'✓✓':'✓'}</span>}</small></div>):<div className="chat-empty">Start a conversation with {selected.full_name}.</div>}<div ref={endRef}/></div>
      <form onSubmit={send}><input value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="iMessage…"/><button disabled={!text.trim()} aria-label="Send message">↑</button></form>
    </section>}
  </>
}
