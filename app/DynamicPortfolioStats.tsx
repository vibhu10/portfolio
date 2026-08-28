'use client';

import {useEffect} from 'react';
import {supabase,isSupabaseConfigured} from '../lib/supabase';

function parseExperienceDate(value:string){
  if(!value)return null;
  const trimmed=value.trim();
  const monthYear=trimmed.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if(monthYear){
    const parsed=new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    return Number.isNaN(parsed.getTime())?null:parsed;
  }
  const parsed=new Date(trimmed);
  return Number.isNaN(parsed.getTime())?null:parsed;
}

function formatExperience(start:Date){
  const now=new Date();
  let months=(now.getFullYear()-start.getFullYear())*12+(now.getMonth()-start.getMonth());
  if(now.getDate()<start.getDate())months-=1;
  const years=Math.max(0,Math.floor(months/6)/2);
  return `${Number.isInteger(years)?years:years.toFixed(1)}+`;
}

function setStat(index:number,value:string){
  const el=document.querySelector(`.v2-stats > div:nth-child(${index}) b`);
  if(el)el.textContent=value;
}

export default function DynamicPortfolioStats(){
  useEffect(()=>{
    if(!supabase||!isSupabaseConfigured)return;

    let active=true;
    const refresh=async()=>{
      const[projects,skills,experience]=await Promise.all([
        supabase.from('projects').select('id',{count:'exact',head:true}).eq('visible',true),
        supabase.from('skills').select('id',{count:'exact',head:true}).eq('visible',true),
        supabase.from('experiences').select('start_date').eq('visible',true)
      ]);
      if(!active)return;
      if(typeof projects.count==='number')setStat(1,`${projects.count}+`);
      if(typeof skills.count==='number')setStat(3,`${skills.count}+`);
      const starts=(experience.data||[])
        .map(row=>parseExperienceDate(row.start_date))
        .filter((date):date is Date=>Boolean(date))
        .sort((a,b)=>a.getTime()-b.getTime());
      if(starts[0])setStat(2,formatExperience(starts[0]));
    };

    refresh();
    const onFocus=()=>refresh();
    const onVisibility=()=>{if(document.visibilityState==='visible')refresh()};
    window.addEventListener('focus',onFocus);
    document.addEventListener('visibilitychange',onVisibility);
    const timer=window.setInterval(refresh,60*60*1000);

    const channel=supabase.channel('portfolio-home-stats')
      .on('postgres_changes',{event:'*',schema:'public',table:'projects'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'skills'},refresh)
      .on('postgres_changes',{event:'*',schema:'public',table:'experiences'},refresh)
      .subscribe();

    return()=>{
      active=false;
      window.removeEventListener('focus',onFocus);
      document.removeEventListener('visibilitychange',onVisibility);
      window.clearInterval(timer);
      supabase.removeChannel(channel);
    };
  },[]);

  return null;
}
