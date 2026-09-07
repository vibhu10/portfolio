'use client';

import {useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {isSupabaseConfigured,supabase} from '../lib/supabase';

type VisualProject={id?:string;name:string;screenshots?:string[];visible?:boolean;sort_order?:number};
type MountItem={key:string;host:HTMLElement;name:string;screenshots:string[]};

const BASE='/portfolio';
const PROFILE_FALLBACK=`${BASE}/profile-320.jpg`;

function cacheBust(url:string){const join=url.includes('?')?'&':'?';return `${url}${join}v=${Date.now()}`}
function normalize(text:string){return text.trim().toLowerCase()}

function ProjectSlider({name,screenshots}:{name:string;screenshots:string[]}){
  const shots=useMemo(()=>screenshots.filter(Boolean),[screenshots]);
  const[index,setIndex]=useState(0),[paused,setPaused]=useState(false);
  const touchStartX=useRef<number|null>(null);

  useEffect(()=>{if(shots.length<=1||paused)return;const timer=window.setInterval(()=>setIndex(prev=>(prev+1)%shots.length),3500);return()=>window.clearInterval(timer)},[shots.length,paused]);
  useEffect(()=>{if(index>shots.length-1)setIndex(0)},[shots.length,index]);
  const goTo=(next:number)=>{if(!shots.length)return;setIndex((next+shots.length)%shots.length)};
  if(!shots.length)return null;

  return <div className="v2-project-slider" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onTouchStart={e=>{touchStartX.current=e.changedTouches[0]?.clientX??null}} onTouchEnd={e=>{const start=touchStartX.current,end=e.changedTouches[0]?.clientX??null;if(start==null||end==null)return;const diff=start-end;if(Math.abs(diff)<40)return;goTo(diff>0?index+1:index-1)}}>
    <div className="v2-project-slide-track" style={{transform:`translate3d(-${index*100}%,0,0)`}}>{shots.map((src,i)=><div className="v2-project-slide" key={`${src}-${i}`}><img src={src} alt={`${name} screenshot ${i+1}`} loading="lazy"/></div>)}</div>
    {shots.length>1&&<><button type="button" className="v2-project-nav prev" aria-label={`Previous ${name} screenshot`} onClick={()=>goTo(index-1)}>‹</button><button type="button" className="v2-project-nav next" aria-label={`Next ${name} screenshot`} onClick={()=>goTo(index+1)}>›</button><div className="v2-project-dots">{shots.map((_,i)=><button key={i} type="button" aria-label={`Go to screenshot ${i+1}`} className={i===index?'active':''} onClick={()=>goTo(i)}/>)}</div></>}
  </div>
}

export default function PortfolioImageEnhancer(){
  const[projects,setProjects]=useState<VisualProject[]>([]),[mounts,setMounts]=useState<MountItem[]>([]);

  useEffect(()=>{if(typeof window==='undefined')return;const avatar=document.querySelector('.v2-avatar-wrap img') as HTMLImageElement|null;if(!avatar)return;avatar.style.opacity='1';avatar.addEventListener('error',()=>{avatar.src=PROFILE_FALLBACK;avatar.style.opacity='1'},{once:true});if(supabase&&isSupabaseConfigured){const publicUrl=supabase.storage.from('portfolio').getPublicUrl('site/profile.jpg').data.publicUrl;const remote=cacheBust(publicUrl);const preload=new Image();preload.onload=()=>{avatar.src=remote;avatar.style.opacity='1'};preload.onerror=()=>{avatar.src=PROFILE_FALLBACK;avatar.style.opacity='1'};preload.src=remote}},[]);

  useEffect(()=>{if(!supabase||!isSupabaseConfigured)return;let cancelled=false;(async()=>{const{data,error}=await supabase.from('projects').select('id,name,screenshots,visible,sort_order').eq('visible',true).order('sort_order');if(!cancelled&&!error)setProjects((data||[]) as VisualProject[])})();return()=>{cancelled=true}},[]);

  useEffect(()=>{if(typeof window==='undefined'||!projects.length)return;const attach=()=>{const cards=Array.from(document.querySelectorAll('.v2-project')) as HTMLElement[];const next:MountItem[]=[];cards.forEach((card,idx)=>{const art=card.querySelector('.v2-project-art') as HTMLElement|null;const title=card.querySelector('.v2-project-body h3')?.textContent?.trim()||'';if(!art)return;const matched=projects.find(p=>normalize(p.name)===normalize(title))||projects[idx];if(!matched?.screenshots?.length)return;const oldImage=art.querySelector(':scope > img') as HTMLImageElement|null;if(oldImage)oldImage.style.visibility='hidden';let mount=art.querySelector('.v2-project-slider-mount') as HTMLElement|null;if(!mount){mount=document.createElement('div');mount.className='v2-project-slider-mount';art.insertBefore(mount,art.firstChild)}next.push({key:matched.id||matched.name,host:mount,name:matched.name,screenshots:matched.screenshots})});setMounts(next)};attach();const observer=new MutationObserver(attach);observer.observe(document.getElementById('projects')||document.body,{childList:true,subtree:true});return()=>observer.disconnect()},[projects]);

  return <>{mounts.map(item=>createPortal(<ProjectSlider name={item.name} screenshots={item.screenshots}/>,item.host,item.key))}</>
}
