'use client';
import {useMemo} from 'react';
import s from './vishu.module.css';
import {questions} from './data';
import {localKey} from './study-tools';

export function ExamCountdown({date,setDate}:{date:string;setDate:(v:string)=>void}){
 const now=new Date();const target=date?new Date(date+'T09:00:00'):null;
 const days=target?Math.max(0,Math.ceil((target.getTime()-now.getTime())/86400000)):null;
 return <section className={s.countdownCard}>
  <div className={s.cardHead}><div><span className={s.micro}>EXAM CLOCK</span><h3>{days===null?'Set your target date':days===0?'Exam day':days+' days remaining'}</h3></div><span className={s.countIcon}>◷</span></div>
  <div className={s.countBody}><div className={s.countNumber}>{days===null?'—':days}</div><div><p>{days===null?'Add the expected exam date to turn preparation into a time-bound plan.':days>120?'Build depth now. Speed can come later.':days>60?'Shift toward revision + mixed practice.':days>21?'Prioritize mocks, error-book revision and high-frequency topics.':'Revision mode: protect accuracy, sleep and recall.'}</p><label>Target date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div></div>
 </section>
}

export function WeeklyPulse({activity,target,setTarget}:{activity:Record<string,number>;target:number;setTarget:(n:number)=>void}){
 const days=useMemo(()=>Array.from({length:7},(_,i)=>{const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-(6-i));return{label:d.toLocaleDateString('en-IN',{weekday:'short'}).slice(0,1),n:activity[localKey(d)]||0}}),[activity]);
 const total=days.reduce((a,b)=>a+b.n,0),max=Math.max(1,...days.map(x=>x.n),target/7);
 const pct=Math.min(100,Math.round(total/Math.max(1,target)*100));
 return <section className={s.weekCard}>
  <div className={s.cardHead}><div><span className={s.micro}>THIS WEEK</span><h3>{pct}% of weekly target</h3></div><span className={s.weekTotal}>{total}/{target}</span></div>
  <div className={s.weekBars}>{days.map(d=><div key={d.label}><i><em style={{height:Math.max(7,(d.n/max)*100)+'%'}}/></i><span>{d.label}</span></div>)}</div>
  <div className={s.targetRow}><span>Study-action target</span><div><button onClick={()=>setTarget(Math.max(14,target-7))}>−</button><b>{target}</b><button onClick={()=>setTarget(Math.min(140,target+7))}>+</button></div></div>
 </section>
}

export function SevenDayPlan({weakTopic,syllabusPct,reviewCount}:{weakTopic?:string;syllabusPct:number;reviewCount:number}){
 const focus=weakTopic||'Himachal Pradesh';
 const plan=[
  ['Today',focus,'Concept repair + 15 MCQs','90 min'],
  ['Day 2','GSAT','Reasoning + numeracy speed set','60 min'],
  ['Day 3','Himachal Pradesh','Static facts + PYQ themes','90 min'],
  ['Day 4','Current Affairs','Notes + 20 mixed MCQs','75 min'],
  ['Day 5',reviewCount?'Revision Lab':'Indian Polity',reviewCount?'Clear error-book queue':'Core concepts + Articles','60 min'],
  ['Day 6','Mixed Mock','Timed exam simulation','90 min'],
  ['Day 7',syllabusPct<60?'Syllabus backlog':'Consolidation','Close unfinished high-priority blocks','75 min']
 ];
 return <section className={s.roadmapCard}><div className={s.cardHead}><div><span className={s.micro}>ADAPTIVE ROADMAP</span><h3>Your next 7 study days</h3></div><span className={s.aiChip}>AUTO PLAN</span></div><div className={s.roadmap}>{plan.map((x,i)=><article key={x[0]}><div className={s.dayDot}><span>{i+1}</span>{i<plan.length-1&&<i/>}</div><div><small>{x[0]}</small><b>{x[1]}</b><p>{x[2]}</p></div><em>{x[3]}</em></article>)}</div></section>
}

export function MasteryMatrix({topics}:{topics:Record<string,{a:number;c:number}>}){
 const all=Array.from(new Set(questions.map(q=>q.topic)));
 const rows=all.map(topic=>{const t=topics[topic]||{a:0,c:0};const acc=t.a?Math.round(t.c/t.a*100):0;const level=t.a<2?0:acc>=80?4:acc>=65?3:acc>=50?2:1;return{topic,a:t.a,acc,level}}).sort((a,b)=>a.level-b.level||b.a-a.a);
 return <section className={s.masteryCard}><div className={s.cardHead}><div><span className={s.micro}>TOPIC MASTERY</span><h3>Knowledge map</h3></div><div className={s.masteryLegend}><span>New</span><i/><i/><i/><i/></div></div><div className={s.masteryGrid}>{rows.map(r=><article key={r.topic}><div><b>{r.topic}</b><small>{r.a?r.a+' attempts':'Not tested'}</small></div><div className={s.masteryBlocks}>{[1,2,3,4].map(n=><i key={n} className={r.level>=n?s.mastered:''}/>)}</div><strong>{r.a?r.acc+'%':'—'}</strong></article>)}</div></section>
}

export function DataVault({payload}:{payload:unknown}){
 const download=()=>{const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='vishu-study-backup.json';a.click();URL.revokeObjectURL(url)};
 return <section className={s.vaultCard}><div><span className={s.micro}>DATA VAULT</span><h3>Keep a copy of your progress</h3><p>Export practice history, notes, syllabus progress, bookmarks and activity as a JSON backup.</p></div><button onClick={download}>Export backup ↓</button></section>
}
