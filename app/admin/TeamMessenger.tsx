'use client';

import {FormEvent,useEffect,useMemo,useRef,useState} from 'react';
import {supabase} from '../../lib/supabase';
import './messenger.css';

type DirectoryUser={user_id:string;full_name:string;avatar_url:string|null;job_title:string|null;role:string;status:string};
type Message={id:string;sender_id:string;recipient_id:string;body:string;created_at:string;read_at:string|null};

export default function TeamMessenger({session}:{session:any}){
  const[people,setPeople]=useState<DirectoryUser[]>([]),[online,setOnline]=useState<Set<string>>(new Set()),[selected,setSelected]=useState<DirectoryUser|null>(null),[messages,setMessages]=useState<Message[]>([]),[text,setText]=useState(''),[open,setOpen]=useState(false),[error,setError]=useState('');
  const endRef=useRef<HTMLDivElement|null>(null);
  const me=session?.user?.id as string|undefined;
  const visiblePeople=useMemo(()=>people.filter(p=>p.user_id!==me&&p.status==='active'),[people,me]);

  useEffect(()=>{if(!supabase||!me)return;let channel:any;let messageChannel:any;let alive=true;
    const boot=async()=>{
      const{data,error}=await supabase.from('team_directory').select('*').order('full_name');
      if(!alive)return;if(error)setError(error.message);else setPeople((data||[]) as DirectoryUser[]);
      channel=supabase.channel('portfolio-team-presence',{config:{presence:{key:me}}});
      channel.on('presence',{event:'sync'},()=>{const state=channel.presenceState();setOnline(new Set(Object.keys(state)))});
      channel.subscribe(async(status:string)=>{if(status==='SUBSCRIBED')await channel.track({user_id:me,online_at:new Date().toISOString()})});
      messageChannel=supabase.channel(`team-messages-${me}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'team_messages'},(payload:any)=>{
        const m=payload.new as Message;if((m.sender_id===me||m.recipient_id===me)&&selected&&(m.sender_id===selected.user_id||m.recipient_id===selected.user_id))setMessages(prev=>prev.some(x=>x.id===m.id)?prev:[...prev,m]);
      }).subscribe();
    };boot();
    return()=>{alive=false;if(channel)supabase.removeChannel(channel);if(messageChannel)supabase.removeChannel(messageChannel)};
  },[me,selected?.user_id]);

  useEffect(()=>{if(!supabase||!me||!selected)return;loadConversation(selected.user_id)},[selected?.user_id,me]);
  useEffect(()=>{endRef.current?.scrollIntoView({behavior:'smooth'})},[messages,open]);

  const loadConversation=async(other:string)=>{if(!supabase||!me)return;setError('');const{data,error}=await supabase.from('team_messages').select('*').or(`and(sender_id.eq.${me},recipient_id.eq.${other}),and(sender_id.eq.${other},recipient_id.eq.${me})`).order('created_at',{ascending:true}).limit(300);if(error)setError(error.message);else{setMessages((data||[]) as Message[]);await supabase.from('team_messages').update({read_at:new Date().toISOString()}).eq('recipient_id',me).eq('sender_id',other).is('read_at',null)}};
  const send=async(e:FormEvent)=>{e.preventDefault();if(!supabase||!me||!selected||!text.trim())return;const body=text.trim();setText('');const{error}=await supabase.from('team_messages').insert({sender_id:me,recipient_id:selected.user_id,body});if(error){setText(body);setError(error.message)}};
  const choose=(p:DirectoryUser)=>{setSelected(p);setOpen(true)};
  const initials=(name:string)=>name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join('');

  return <>
    <aside className="team-presence-rail">
      <div className="presence-head"><b>Team</b><span>{online.size} online</span></div>
      <div className="presence-list">{visiblePeople.length?visiblePeople.map(p=><button key={p.user_id} onClick={()=>choose(p)} title={`Message ${p.full_name}`}>
        <span className="presence-avatar-wrap">{p.avatar_url?<img src={p.avatar_url} alt=""/>:<span className="presence-avatar-fallback">{initials(p.full_name||'U')}</span>}<i className={online.has(p.user_id)?'online':'offline'}/></span>
        <span className="presence-meta"><strong>{p.full_name||'Team member'}</strong><small>{online.has(p.user_id)?'Online':p.role.replace('_',' ')}</small></span>
      </button>):<div className="presence-empty">No team members yet.</div>}</div>
    </aside>
    {open&&selected&&<section className="team-chat">
      <header><button className="chat-close" onClick={()=>setOpen(false)}>×</button><span className="presence-avatar-wrap">{selected.avatar_url?<img src={selected.avatar_url} alt=""/>:<span className="presence-avatar-fallback">{initials(selected.full_name||'U')}</span>}<i className={online.has(selected.user_id)?'online':'offline'}/></span><div><strong>{selected.full_name}</strong><small>{online.has(selected.user_id)?'Online now':selected.job_title||selected.role.replace('_',' ')}</small></div></header>
      <div className="chat-body">{error&&<div className="chat-error">{error}</div>}{messages.length?messages.map(m=><div key={m.id} className={`chat-bubble ${m.sender_id===me?'mine':'theirs'}`}><p>{m.body}</p><small>{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</small></div>):<div className="chat-empty">Start a conversation with {selected.full_name}.</div>}<div ref={endRef}/></div>
      <form onSubmit={send}><input value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="Type a message…"/><button disabled={!text.trim()}>Send</button></form>
    </section>}
  </>
}
