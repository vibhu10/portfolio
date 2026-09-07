'use client';

import {useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {isSupabaseConfigured,supabase} from '../lib/supabase';

type VisualProject={id?:string;name:string;screenshots?:string[];visible?:boolean;sort_order?:number};

const BASE='/portfolio';
const PROFILE_FALLBACK=`${BASE}/profile-320.jpg`;

function cacheBust(url:string){
  const join=url.includes('?')?'&':'?';
  return `${url}${join}v=${Date.now()}`;
}

export default function PortfolioImageEnhancer(){
  const[projects,setProjects]=useState<VisualProject[]>([]);
  const[host,setHost]=useState<HTMLElement|null>(null);
  const[activeImage,setActiveImage]=useState<{url:string;alt:string}|null>(null);

  useEffect(()=>{
    if(typeof window==='undefined')return;
    const ensureHost=()=>{
      const section=document.getElementById('projects');
      if(!section)return;
      let node=document.getElementById('portfolio-project-galleries');
      if(!node){
        node=document.createElement('div');
        node.id='portfolio-project-galleries';
        section.appendChild(node);
      }
      if(node!==host)setHost(node as HTMLElement);
    };
    ensureHost();
    const observer=new MutationObserver(ensureHost);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[host]);

  useEffect(()=>{
    if(typeof window==='undefined'||!supabase||!isSupabaseConfigured)return;
    const avatar=document.querySelector('.v2-avatar-wrap img') as HTMLImageElement|null;
    if(avatar){
      avatar.style.opacity='1';
      avatar.addEventListener('error',()=>{avatar.src=PROFILE_FALLBACK;avatar.style.opacity='1'},{once:true});
      const publicUrl=supabase.storage.from('portfolio').getPublicUrl('site/profile.jpg').data.publicUrl;
      const remote=cacheBust(publicUrl);
      const preload=new Image();
      preload.onload=()=>{avatar.src=remote;avatar.style.opacity='1'};
      preload.onerror=()=>{avatar.src=PROFILE_FALLBACK;avatar.style.opacity='1'};
      preload.src=remote;
    }

    let cancelled=false;
    (async()=>{
      const{data,error}=await supabase.from('projects').select('id,name,screenshots,visible,sort_order').eq('visible',true).order('sort_order');
      if(!cancelled&&!error)setProjects((data||[]) as VisualProject[]);
    })();
    return()=>{cancelled=true};
  },[]);

  const visualProjects=useMemo(()=>projects.filter(p=>(p.screenshots||[]).length>0),[projects]);

  if(!host||visualProjects.length===0)return null;

  return createPortal(<>
    <div className="v2-media-galleries" aria-label="Project screenshots">
      <div className="v2-media-heading"><span>PROJECT GALLERIES</span><h3>See the complete interface, without cropped screenshots.</h3><p>Desktop and mobile screens keep their original proportions so the full design remains visible.</p></div>
      {visualProjects.map(project=><section className="v2-media-project" key={project.id||project.name}>
        <div className="v2-media-project-head"><h4>{project.name}</h4><small>{project.screenshots?.length||0} image{(project.screenshots?.length||0)===1?'':'s'}</small></div>
        <div className="v2-media-grid">{(project.screenshots||[]).map((url,index)=><button type="button" className={`v2-media-shot ${index===0?'is-main':''}`} key={`${url}-${index}`} onClick={()=>setActiveImage({url,alt:`${project.name} screenshot ${index+1}`})}>
          <img src={url} alt={`${project.name} screenshot ${index+1}`} loading="lazy"/>
          <span>{index===0?'Main photo':`Screenshot ${index+1}`}</span>
        </button>)}</div>
      </section>)}
    </div>
    {activeImage&&<div className="v2-image-lightbox" role="dialog" aria-modal="true" aria-label={activeImage.alt} onClick={()=>setActiveImage(null)}>
      <button type="button" className="v2-lightbox-close" onClick={()=>setActiveImage(null)} aria-label="Close image">×</button>
      <img src={activeImage.url} alt={activeImage.alt} onClick={e=>e.stopPropagation()}/>
    </div>}
  </>,host);
}
