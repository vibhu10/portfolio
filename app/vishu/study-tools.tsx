'use client';
import {useEffect,useMemo,useState} from 'react';
import s from './vishu.module.css';
import {questions,type Q} from './data';

export type DailyTasks=Record<string,boolean>;

const fmt=(n:number)=>String(n).padStart(2,'0');

export function FocusTimer({onComplete}:{onComplete:()=>void}){
 const[seconds,setSeconds]=useState(25*60),[running,setRunning]=useState(false);
 useEffect(()=>{if(!running)return;const id=setInterval(()=>setSeconds(v=>{if(v<=1){setRunning(false);onComplete();return 25*60}return v-1}),1000);return()=>clearInterval(id)},[running,onComplete]);
 const progress=((25*60-seconds)/(25*60))*100;
 return <section className={s.focusCard}>
  <div className={s.focusOrb} style={{'--focus':progress} as any}><div><b>{fmt(Math.floor(seconds/60))}:{fmt(seconds%60)}</b><span>DEEP FOCUS</span></div></div>
  <div className={s.focusCopy}><span className={s.micro}>POMODORO SESSION</span><h3>Protect one distraction-free block.</h3><p>Use 25 minutes for one narrow target: a weak topic, 20 MCQs, or one revision set.</p><div className={s.focusActions}><button onClick={()=>setRunning(x=>!x)}>{running?'Pause':'Start focus'}</button><button className={s.ghostBtn} onClick={()=>{setRunning(false);setSeconds(25*60)}}>Reset</button></div></div>
 </section>
}

export function DailyMission({tasks,setTasks,weakTopic}:{tasks:DailyTasks;setTasks:(x:DailyTasks)=>void;weakTopic?:string}){
 const items=[
  ['mcq','20 MCQs','Accuracy before speed','✦'],
  ['weak','Weak-topic revision',weakTopic||'Run a diagnostic first','⚡'],
  ['gsat','20 min GSAT','Keep Paper II safely qualified','◉'],
  ['current','Current affairs notes','Capture 5 exam-worthy facts','▤']
 ];
 const done=items.filter(([id])=>tasks[id]).length;
 return <section className={s.missionCard}>
  <div className={s.cardHead}><div><span className={s.micro}>DAILY MISSION</span><h3>Today’s four moves</h3></div><div className={s.missionScore}><b>{done}/4</b><span>done</span></div></div>
  <div className={s.missionList}>{items.map(([id,title,sub,icon])=><button key={id} className={tasks[id]?s.missionDone:''} onClick={()=>setTasks({...tasks,[id]:!tasks[id]})}><i>{tasks[id]?'✓':icon}</i><span><b>{title}</b><small>{sub}</small></span><em>{tasks[id]?'Completed':'Mark done'}</em></button>)}</div>
 </section>
}

export function ActivityHeatmap({activity}:{activity:Record<string,number>}){
 const days=useMemo(()=>Array.from({length:35},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(34-i));const key=localKey(d);return{key,label:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}),n:activity[key]||0}}),[activity]);
 const total=days.reduce((a,b)=>a+b.n,0);
 return <section className={s.heatCard}><div className={s.cardHead}><div><span className={s.micro}>CONSISTENCY</span><h3>35-day study heatmap</h3></div><div className={s.heatTotal}><b>{total}</b><span>actions</span></div></div><div className={s.heatGrid}>{days.map(d=><i key={d.key} title={d.label+' · '+d.n+' actions'} data-l={Math.min(4,d.n)}/>)}</div><div className={s.heatLegend}><span>Less</span>{[0,1,2,3,4].map(x=><i key={x} data-l={x}/>)}<span>More</span></div></section>
}

export function QuickNotes({value,onChange}:{value:string;onChange:(x:string)=>void}){
 const[count,setCount]=useState(0);
 useEffect(()=>setCount(value.trim()?value.trim().split(/\s+/).length:0),[value]);
 return <section className={s.notesCard}><div className={s.cardHead}><div><span className={s.micro}>QUICK NOTES</span><h3>Brain dump → revision material</h3></div><span className={s.wordCount}>{count} words</span></div><textarea value={value} onChange={e=>onChange(e.target.value)} placeholder="Write facts, mnemonics, mistakes, doubts, or tomorrow’s targets…"/><small>Autosaved to cloud with a local backup.</small></section>
}

export function ReviewQueue({ids,bookmarks,onRemove,onToggleBookmark,bank=questions}:{ids:string[];bookmarks:string[];onRemove:(id:string)=>void;onToggleBookmark:(id:string)=>void;bank?:Q[]}){
 const list=ids.map(id=>bank.find(q=>q.id===id)).filter(Boolean) as Q[];
 return <section className={s.reviewPanel}><div className={s.cardHead}><div><span className={s.micro}>ERROR BOOK</span><h3>Questions that deserve another look</h3></div><span className={s.queueBadge}>{list.length} queued</span></div>
  {list.length? <div className={s.reviewList}>{list.map(q=><article key={q.id}><div><span>{q.kind} · {q.topic}</span><h4>{q.q}</h4><p>{q.why}</p></div><div className={s.reviewActions}><button onClick={()=>onToggleBookmark(q.id)}>{bookmarks.includes(q.id)?'★ Saved':'☆ Save'}</button><button onClick={()=>onRemove(q.id)}>✓ Reviewed</button></div></article>)}</div>:<div className={s.emptyState}><i>✓</i><b>Your error book is clear</b><p>Wrong practice answers will automatically appear here.</p></div>}
 </section>
}

export function Bookmarks({ids,onToggle,bank=questions}:{ids:string[];onToggle:(id:string)=>void;bank?:Q[]}){
 const list=ids.map(id=>bank.find(q=>q.id===id)).filter(Boolean) as Q[];
 return <section className={s.reviewPanel}><div className={s.cardHead}><div><span className={s.micro}>SAVED</span><h3>Bookmarked questions</h3></div><span className={s.queueBadge}>{list.length}</span></div>
  {list.length?<div className={s.savedGrid}>{list.map(q=><article key={q.id}><span>{q.topic}</span><h4>{q.q}</h4><p>{q.tip}</p><button onClick={()=>onToggle(q.id)}>Remove bookmark</button></article>)}</div>:<div className={s.emptyState}><i>☆</i><b>No bookmarks yet</b><p>Save high-value questions from Smart Practice.</p></div>}
 </section>
}

export function Flashcards({ids,bank=questions}:{ids:string[];bank?:Q[]}){
 const pool=(ids.length?ids.map(id=>bank.find(q=>q.id===id)).filter(Boolean):bank) as Q[];
 const[index,setIndex]=useState(0),[flip,setFlip]=useState(false);
 const q=pool[index%pool.length];
 if(!q)return null;
 return <section className={s.flashWrap}><div className={s.cardHead}><div><span className={s.micro}>ACTIVE RECALL</span><h3>Flashcard deck</h3></div><span className={s.queueBadge}>{index%pool.length+1}/{pool.length}</span></div><button className={s.flashcard} onClick={()=>setFlip(x=>!x)}><span>{q.kind} · {q.topic}</span>{!flip?<><b>{q.q}</b><small>Tap to reveal answer</small></>:<><b>{q.o[q.a]}</b><p>{q.why}</p><small>Tap to see question</small></>}</button><div className={s.flashNav}><button onClick={()=>{setIndex(x=>(x-1+pool.length)%pool.length);setFlip(false)}}>← Previous</button><button onClick={()=>{setIndex(x=>(x+1)%pool.length);setFlip(false)}}>Next →</button></div></section>
}

export function localKey(d=new Date()){
 return d.getFullYear()+'-'+fmt(d.getMonth()+1)+'-'+fmt(d.getDate());
}
