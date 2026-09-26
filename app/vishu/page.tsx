'use client';
import {FormEvent,useEffect,useState} from 'react';
import s from './vishu.module.css';
import {official,papers,questions,prelim,mains,gsPriority,gsatPriority,type Kind,type Q} from './data';

const HASH='1bb31dbdb4c1c4ebc447edad08169518435f8a40b6d0985b943a5ddf26202ce0';
const AUTH='vishu-auth-v1',STORE='vishu-progress-v1';
type View='dashboard'|'papers'|'practice'|'mock'|'syllabus'|'analytics';
type Progress={attempts:number;correct:number;topics:Record<string,{a:number;c:number}>;done:string[];mocks:{date:string;kind:string;score:number}[]};
const blank:Progress={attempts:0,correct:0,topics:{},done:[],mocks:[]};
const pct=(a:number,b:number)=>a?Math.round(b/a*100):0;
async function hash(v:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}

const nav:[View,string,string][]=[
 ['dashboard','Command Center','⌁'],['papers','Previous Papers','▤'],['practice','Smart Practice','✦'],
 ['mock','Mock Exam','◉'],['syllabus','Syllabus Tracker','✓'],['analytics','Analytics','⌁']
];

export default function Vishu(){
 const[ready,setReady]=useState(false),[auth,setAuth]=useState(false),[view,setView]=useState<View>('dashboard');
 const[p,setP]=useState<Progress>(blank);
 useEffect(()=>{setAuth(localStorage.getItem(AUTH)===HASH);try{setP({...blank,...JSON.parse(localStorage.getItem(STORE)||'{}')})}catch{}setReady(true)},[]);
 useEffect(()=>{if(ready)localStorage.setItem(STORE,JSON.stringify(p))},[p,ready]);
 if(!ready)return <main className={s.loading}><div className={s.loader}/><span>Preparing study intelligence…</span></main>;
 if(!auth)return <Login onOk={()=>setAuth(true)}/>;
 const acc=pct(p.attempts,p.correct),all=[...prelim,...mains],syll=Math.round(p.done.length/all.length*100);
 const weak=Object.entries(p.topics).filter(([,v])=>v.a>=2).map(([topic,v])=>({topic,acc:pct(v.a,v.c),n:v.a})).sort((a,b)=>a.acc-b.acc);
 const readiness=Math.round((acc+syll+(p.mocks[0]?.score||0))/3);
 return <div className={s.app}>
  <div className={s.ambient}><i/><i/><i/></div>
  <aside className={s.side}>
   <div className={s.brand}><div className={s.mark}>H</div><div><strong>HAS Command</strong><small>VISHU STUDY OS</small></div></div>
   <div className={s.navLabel}>WORKSPACE</div>
   <nav>{nav.map(([id,label,icon])=><button key={id} className={view===id?s.active:''} onClick={()=>setView(id)}><span>{icon}</span><b>{label}</b>{view===id&&<i/>}</button>)}</nav>
   <div className={s.sideCard}><div><span>Syllabus progress</span><b>{syll}%</b></div><div className={s.bar}><i style={{width:syll+'%'}}/></div><small>{p.done.length} topics completed</small></div>
   <button className={s.lock} onClick={()=>{localStorage.removeItem(AUTH);setAuth(false)}}>↗ Lock workspace</button>
  </aside>
  <main className={s.main}>
   <header className={s.topbar}><div><small>HIMACHAL PRADESH ADMINISTRATIVE SERVICE</small><h1>{title(view)}</h1></div><div className={s.topActions}><div className={s.live}><i/> Study mode active</div><a href={official.home} target="_blank">HPPSC ↗</a></div></header>
   <div className={s.content}>
    {view==='dashboard'&&<Dashboard acc={acc} attempts={p.attempts} syll={syll} weak={weak} readiness={readiness}/>}
    {view==='papers'&&<Papers/>}
    {view==='practice'&&<Practice onAnswer={(q,ok)=>setP(x=>{const t=x.topics[q.topic]||{a:0,c:0};return{...x,attempts:x.attempts+1,correct:x.correct+(ok?1:0),topics:{...x.topics,[q.topic]:{a:t.a+1,c:t.c+(ok?1:0)}}}})}/>}
    {view==='mock'&&<Mock onDone={(kind,score)=>setP(x=>({...x,mocks:[{date:new Date().toISOString(),kind,score},...x.mocks].slice(0,20)}))}/>}
    {view==='syllabus'&&<Syllabus done={p.done} setDone={done=>setP(x=>({...x,done}))}/>}
    {view==='analytics'&&<Analytics p={p} weak={weak}/>}
   </div>
  </main>
 </div>
}
function title(v:View){return({dashboard:'Command Center',papers:'Previous Paper Library',practice:'Smart Practice',mock:'HAS Mock Exam',syllabus:'Syllabus Tracker',analytics:'Performance Analytics'})[v]}

function Login({onOk}:{onOk:()=>void}){
 const[e,setE]=useState(''),[pw,setPw]=useState(''),[err,setErr]=useState('');
 async function submit(ev:FormEvent){ev.preventDefault();if(await hash(e.trim().toLowerCase()+'|'+pw)===HASH){localStorage.setItem(AUTH,HASH);onOk()}else setErr('Incorrect login details.')}
 return <main className={s.login}><div className={s.loginGlow}/><section className={s.loginShell}>
   <div className={s.loginIntro}><span className={s.kicker}>PRIVATE PREPARATION SYSTEM</span><h1>Prepare smarter.<br/><em>Track everything.</em></h1><p>A focused HAS workspace built around previous-year patterns, adaptive practice and measurable progress.</p><div className={s.loginStats}><div><b>26</b><span>Years mapped</span></div><div><b>2</b><span>Paper streams</span></div><div><b>1</b><span>Mission</span></div></div></div>
   <form onSubmit={submit} className={s.loginCard}><div className={s.logo}>H</div><small>VISHU STUDY OS</small><h2>Welcome back</h2><p>Enter your private preparation workspace.</p><label>Email<input type="email" value={e} onChange={x=>setE(x.target.value)} placeholder="you@example.com" required/></label><label>Password<input type="password" value={pw} onChange={x=>setPw(x.target.value)} placeholder="••••••••••" required/></label>{err&&<b className={s.error}>{err}</b>}<button>Enter command center <span>→</span></button><em>Credentials are verified locally. Your password is never stored in plain text.</em></form>
  </section></main>
}

function Dashboard({acc,attempts,syll,weak,readiness}:{acc:number;attempts:number;syll:number;weak:{topic:string;acc:number;n:number}[];readiness:number}){
 return <>
  <section className={s.hero}><div className={s.heroGrid}/><div className={s.heroCopy}><span className={s.kicker}>TODAY'S MISSION</span><h2>Turn preparation into a <em>measurable advantage.</em></h2><p>Prioritize recurring HAS areas, keep GSAT safe, and let your own performance data decide what deserves attention next.</p><div className={s.heroActions}><span>✦ Adaptive priority engine</span><span>◉ Pattern-led revision</span></div></div>
   <div className={s.readiness}><div className={s.donut} style={{'--score':readiness} as any}><div><b>{readiness}%</b><small>READINESS</small></div></div><p>{readiness>=70?'Strong momentum':readiness>=40?'Building momentum':'Start with a diagnostic set'}</p></div>
  </section>
  <section className={s.metrics}><Metric icon="◎" t="Practice accuracy" v={attempts?acc+'%':'—'} d={attempts+' questions answered'} tone="violet"/><Metric icon="✓" t="Syllabus complete" v={syll+'%'} d="Prelims + Mains" tone="cyan"/><Metric icon="⚡" t="Weakest area" v={weak[0]?.acc+'%'||'—'} d={weak[0]?.topic||'Awaiting diagnostic'} tone="amber"/><Metric icon="▤" t="Paper coverage" v="2000–25" d="Legacy + modern archive" tone="green"/></section>
  <section className={s.grid2}><Panel title="GS intelligence map" badge="HIGH IMPACT"><Priority rows={gsPriority}/></Panel><Panel title="GSAT intelligence map" badge="QUALIFYING"><Priority rows={gsatPriority}/></Panel></section>
  <section className={s.insight}><div>i</div><p><b>Archive intelligence.</b> The modern two-paper GS + Aptitude structure begins from 2010. Earlier years are treated as legacy GS material instead of being mislabeled as GSAT.</p></section>
 </>
}
function Metric({icon,t,v,d,tone}:{icon:string;t:string;v:string;d:string;tone:string}){return <article className={s.metric+' '+s[tone]}><div className={s.metricIcon}>{icon}</div><div><span>{t}</span><b>{v}</b><small>{d}</small></div><i/></article>}
function Panel({title,badge,children}:{title:string;badge?:string;children:any}){return <section className={s.panel}><div className={s.panelHead}><h3>{title}</h3>{badge&&<span>{badge}</span>}</div>{children}</section>}
function Priority({rows}:{rows:readonly (readonly [string,number])[]}){return <div className={s.priority}>{rows.map((r,i)=><div key={r[0]}><div className={s.rank}>{String(i+1).padStart(2,'0')}</div><div className={s.priorityMain}><span>{r[0]}</span><div><i style={{width:r[1]+'%'}}/></div></div><strong>{r[1]}</strong></div>)}</div>}

function Papers(){const[filter,setFilter]=useState<'All'|Kind>('All');return <><div className={s.sectionIntro}><div><span className={s.kicker}>ARCHIVE</span><h2>Previous-year intelligence</h2><p>Browse available paper sources without mixing legacy and modern formats.</p></div><Tabs items={['All','GS','GSAT']} active={filter} onPick={x=>setFilter(x as any)}/></div><section className={s.papergrid}>{papers.map(p=><article key={p.year}><div className={s.paperTop}><div><small>{p.legacy?'LEGACY PAPER':'MODERN FORMAT'}</small><b>{p.year}</b></div><span>↗</span></div>{filter!=='GSAT'&&<p><span>General Studies</span><Status x={p.gs}/></p>}{filter!=='GS'&&<p><span>GSAT / Aptitude</span><Status x={p.gsat}/></p>}<a href={p.url} target="_blank">Open source</a></article>)}</section><section className={s.insight}><div>i</div><p><b>Archive integrity.</b> If a full early-year paper could not be reliably verified online, it remains marked “Not verified” rather than being replaced with a guessed download.</p></section></>}
function Status({x}:{x:string}){return <span className={s.status+' '+(x==='Verified'?s.good:x==='N/A'?s.muted:s.warn)}><i/>{x}</span>}

function Practice({onAnswer}:{onAnswer:(q:Q,ok:boolean)=>void}){const[kind,setKind]=useState<Kind>('GS'),[idx,setIdx]=useState(0),[pick,setPick]=useState<number|null>(null),[answered,setAnswered]=useState(false);const qs=questions.filter(x=>x.kind===kind),q=qs[idx%qs.length];const choose=(i:number)=>{if(answered)return;setPick(i);setAnswered(true);onAnswer(q,i===q.a)};
 return <><div className={s.sectionIntro}><div><span className={s.kicker}>ADAPTIVE PRACTICE</span><h2>One question. Immediate intelligence.</h2><p>Every answer updates your topic-level performance profile.</p></div><Tabs items={['GS','GSAT']} active={kind} onPick={x=>{setKind(x as Kind);setIdx(0);setAnswered(false);setPick(null)}}/></div><section className={s.quiz}><div className={s.qmeta}><span>{q.topic}</span><small>{q.year?'PYQ THEME · '+q.year:'SYLLABUS PRACTICE'}</small></div><h2>{q.q}</h2><div className={s.options}>{q.o.map((o,i)=><button key={o} onClick={()=>choose(i)} className={answered?(i===q.a?s.correct:i===pick?s.wrong:''):''}><b>{String.fromCharCode(65+i)}</b><span>{o}</span><i>{answered&&i===q.a?'✓':answered&&i===pick?'×':''}</i></button>)}</div>{answered&&<div className={s.explain+' '+(pick===q.a?s.explainGood:s.explainBad)}><div className={s.explainTitle}><b>{pick===q.a?'Correct answer':'Review this concept'}</b><span>{pick===q.a?'✓':'!'}</span></div><p>{q.why}</p><small>EXAM TAKEAWAY</small><p>{q.tip}</p><button onClick={()=>{setIdx(x=>x+1);setPick(null);setAnswered(false)}}>Next question <span>→</span></button></div>}</section></>}

function Mock({onDone}:{onDone:(k:string,s:number)=>void}){const[kind,setKind]=useState<'GS'|'GSAT'|'Mixed'>('Mixed'),[started,setStarted]=useState(false),[set,setSet]=useState<Q[]>([]),[ans,setAns]=useState<Record<string,number>>({}),[result,setResult]=useState<number|null>(null);const start=()=>{const pool=kind==='Mixed'?questions:questions.filter(q=>q.kind===kind);setSet([...pool].sort(()=>Math.random()-.5).slice(0,Math.min(10,pool.length)));setAns({});setResult(null);setStarted(true)};const finish=()=>{const correct=set.filter(q=>ans[q.id]===q.a).length,wrong=set.filter(q=>ans[q.id]!=null&&ans[q.id]!==q.a).length,raw=correct*2-wrong*(2/3),score=Math.max(0,Math.round(raw/(set.length*2)*100));setResult(score);onDone(kind,score)};
 if(!started)return <><div className={s.sectionIntro}><div><span className={s.kicker}>EXAM SIMULATOR</span><h2>Build a focused mock.</h2><p>Syllabus-aligned questions with negative marking.</p></div></div><section className={s.mockSetup}><div className={s.mockVisual}><span>◉</span><b>Exam mode</b><small>+2 correct · −0.67 wrong</small></div><div><h3>Select paper mix</h3><Tabs items={['GS','GSAT','Mixed']} active={kind} onPick={x=>setKind(x as any)}/><button className={s.primary} onClick={start}>Start mock exam <span>→</span></button></div></section></>;
 return <section className={s.quiz}>{result!==null?<div className={s.result}><div className={s.resultRing}>{result}%</div><span>MOCK COMPLETE</span><h2>{result>=70?'Excellent control.':result>=50?'Good base. Keep refining.':'Review weak areas and retry.'}</h2><button onClick={()=>setStarted(false)}>Create another mock</button></div>:<><div className={s.mockhead}><b>{kind} Mock</b><span>{Object.keys(ans).length}/{set.length} answered</span></div>{set.map((q,n)=><div className={s.mockq} key={q.id}><small>QUESTION {String(n+1).padStart(2,'0')}</small><h3>{q.q}</h3>{q.o.map((o,i)=><label key={o} className={ans[q.id]===i?s.selected:''}><input type="radio" name={q.id} checked={ans[q.id]===i} onChange={()=>setAns(a=>({...a,[q.id]:i}))}/><i>{String.fromCharCode(65+i)}</i>{o}</label>)}</div>)}<button className={s.primary} onClick={finish}>Submit exam</button></>}</section>
}

function Syllabus({done,setDone}:{done:string[];setDone:(x:string[])=>void}){const[tab,setTab]=useState<'Prelims'|'Mains'>('Prelims'),list=tab==='Prelims'?prelim:mains,complete=Math.round(done.filter(x=>list.some(i=>i[0]===x)).length/list.length*100);
 return <><div className={s.sectionIntro}><div><span className={s.kicker}>MASTER PLAN</span><h2>Turn the syllabus into a checklist.</h2><p>Mark completed areas and keep the remaining work visible.</p></div><Tabs items={['Prelims','Mains']} active={tab} onPick={x=>setTab(x as any)}/></div><section className={s.syllabusHero}><div><span>{tab.toUpperCase()} COMPLETION</span><b>{complete}%</b></div><div className={s.longbar}><i style={{width:complete+'%'}}/></div><a href={tab==='Mains'?official.mains:official.home} target="_blank">View official syllabus ↗</a></section><section className={s.checks}>{list.map((x,i)=><label key={x[0]} className={done.includes(x[0])?s.done:''}><input type="checkbox" checked={done.includes(x[0])} onChange={e=>setDone(e.target.checked?[...done,x[0]]:done.filter(i=>i!==x[0]))}/><i>{done.includes(x[0])?'✓':String(i+1).padStart(2,'0')}</i><span><b>{x[1]} <em>{x[3]}</em></b>{x[2]}</span></label>)}</section></>
}

function Analytics({p,weak}:{p:Progress;weak:{topic:string;acc:number;n:number}[]}){const best=p.mocks.length?Math.max(...p.mocks.map(x=>x.score)):0;return <><section className={s.metrics}><Metric icon="◎" t="Questions attempted" v={String(p.attempts)} d="On this device" tone="violet"/><Metric icon="✓" t="Overall accuracy" v={p.attempts?pct(p.attempts,p.correct)+'%':'—'} d="Practice performance" tone="cyan"/><Metric icon="◉" t="Mocks completed" v={String(p.mocks.length)} d="Recent 20 retained" tone="amber"/><Metric icon="↑" t="Best mock" v={p.mocks.length?best+'%':'—'} d="Negative-marking score" tone="green"/></section><section className={s.grid2}><Panel title="Weak-topic diagnosis" badge="FOCUS">{weak.length?weak.map(x=><div className={s.weak} key={x.topic}><div><span>{x.topic}</span><small>{x.n} attempts</small></div><div className={s.miniBar}><i style={{width:x.acc+'%'}}/></div><b>{x.acc}%</b></div>):<div className={s.empty}>Answer at least two questions in a topic to unlock diagnosis.</div>}</Panel><Panel title="Recent mock trend" badge="HISTORY">{p.mocks.length?p.mocks.slice(0,8).map(x=><div className={s.weak} key={x.date}><div><span>{x.kind}</span><small>{new Date(x.date).toLocaleDateString('en-IN')}</small></div><div className={s.miniBar}><i style={{width:x.score+'%'}}/></div><b>{x.score}%</b></div>):<div className={s.empty}>No submitted mocks yet. Your trend will appear here.</div>}</Panel></section></>}
function Tabs({items,active,onPick}:{items:string[];active:string;onPick:(x:string)=>void}){return <div className={s.tabs}>{items.map(x=><button className={active===x?s.activeTab:''} onClick={()=>onPick(x)} key={x}>{x}</button>)}</div>}
