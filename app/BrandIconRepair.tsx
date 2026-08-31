'use client';

import {useEffect} from 'react';
import {skillIconCandidates} from '../lib/skill-icons';

function applyImage(box:HTMLElement,name:string){
 const urls=skillIconCandidates(name);if(!urls.length)return;
 let img=box.querySelector('img') as HTMLImageElement|null;
 if(!img){img=document.createElement('img');img.alt=`${name} logo`;box.prepend(img)}
 if(img.dataset.autoBrand===name)return;
 img.dataset.autoBrand=name;let index=0;
 const next=()=>{if(index>=urls.length){img!.style.display='none';return}img!.style.display='block';img!.src=urls[index++];};
 img.onerror=next;img.onload=()=>{const fallback=box.querySelector('b') as HTMLElement|null;if(fallback)fallback.style.display='none'};next();
}

function scan(){
 document.querySelectorAll<HTMLElement>('.brand-skill,.skill-cms-card').forEach(card=>{
  const name=(card.querySelector('.skill-cms-main h3')?.textContent||card.querySelector('span:last-child')?.textContent||'').trim();
  if(!name)return;
  const box=(card.querySelector('.skill-logo-box')||card.querySelector('.skill-icon-wrap')) as HTMLElement|null;
  if(box)applyImage(box,name);
 });
 document.querySelectorAll<HTMLButtonElement>('.secondary-btn').forEach(btn=>{
  const raw=(btn.textContent||'').replace(/^\+\s*/,'').trim();if(!raw||btn.querySelector('img'))return;
  const urls=skillIconCandidates(raw);if(!urls.length)return;
  const img=document.createElement('img');img.alt='';img.style.cssText='width:16px;height:16px;object-fit:contain;vertical-align:middle;margin-right:6px';let i=0;
  const next=()=>{if(i>=urls.length){img.remove();return}img.src=urls[i++]};img.onerror=next;next();btn.prepend(img);
 });
}

export default function BrandIconRepair(){useEffect(()=>{scan();const obs=new MutationObserver(scan);obs.observe(document.body,{childList:true,subtree:true});const id=setInterval(scan,1400);return()=>{obs.disconnect();clearInterval(id)}},[]);return null}
