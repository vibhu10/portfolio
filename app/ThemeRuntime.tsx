'use client';

import {useEffect} from 'react';
import {supabase,isSupabaseConfigured} from '../lib/supabase';

export type ThemePalette={background:string;panel:string;accent:string;accent2:string;text:string;muted:string;line:string};
export type ThemeConfig={portfolio:ThemePalette;admin:ThemePalette};

export const defaultTheme:ThemeConfig={
 portfolio:{background:'#090b12',panel:'#111421',accent:'#7c5cff',accent2:'#3fd4ff',text:'#f7f8fb',muted:'#9ca3b4',line:'#252a3b'},
 admin:{background:'#080b12',panel:'#101622',accent:'#7c5cff',accent2:'#3fd4ff',text:'#f4f7fb',muted:'#8e9aa8',line:'#263141'}
};

function applyPortfolio(p:ThemePalette){
 const r=document.documentElement;
 r.style.setProperty('--pf-bg',p.background);r.style.setProperty('--pf-panel',p.panel);r.style.setProperty('--pf-accent',p.accent);r.style.setProperty('--pf-accent2',p.accent2);r.style.setProperty('--pf-text',p.text);r.style.setProperty('--pf-muted',p.muted);r.style.setProperty('--pf-line',p.line);
}

export async function loadThemeConfig(){
 let config=defaultTheme;
 try{
  if(supabase&&isSupabaseConfigured){
   const url=supabase.storage.from('portfolio').getPublicUrl('site/theme.json').data.publicUrl;
   const res=await fetch(`${url}?v=${Date.now()}`,{cache:'no-store'});
   if(res.ok){const remote=await res.json();config={portfolio:{...defaultTheme.portfolio,...remote?.portfolio},admin:{...defaultTheme.admin,...remote?.admin}}}
  }
 }catch{}
 return config;
}

export default function ThemeRuntime(){
 useEffect(()=>{loadThemeConfig().then(c=>applyPortfolio(c.portfolio))},[]);
 return <style>{`
:root{--pf-bg:#090b12;--pf-panel:#111421;--pf-accent:#7c5cff;--pf-accent2:#3fd4ff;--pf-text:#f7f8fb;--pf-muted:#9ca3b4;--pf-line:#252a3b}
.portfolio-v2{--bg:var(--pf-bg)!important;--panel:var(--pf-panel)!important;--panel2:var(--pf-panel)!important;--text:var(--pf-text)!important;--muted:var(--pf-muted)!important;--line:var(--pf-line)!important;--purple:var(--pf-accent)!important;--purple2:var(--pf-accent)!important;--cyan:var(--pf-accent2)!important;background:radial-gradient(circle at 84% 8%,color-mix(in srgb,var(--pf-accent) 18%,transparent),transparent 25%),radial-gradient(circle at 12% 38%,color-mix(in srgb,var(--pf-accent2) 8%,transparent),transparent 22%),var(--pf-bg)!important;color:var(--pf-text)!important}
.v2-nav{background:color-mix(in srgb,var(--pf-bg) 84%,transparent)!important;border-color:color-mix(in srgb,var(--pf-line) 70%,transparent)!important}.v2-admin,.v2-secondary,.v2-profile,.v2-stats>div,.v2-project,.v2-contact{background-color:var(--pf-panel)!important;border-color:var(--pf-line)!important}.v2-copy h1 span,.v2-copy h2 span{background:linear-gradient(90deg,var(--pf-accent),var(--pf-accent2))!important;-webkit-background-clip:text!important;color:transparent!important}.v2-primary{background:linear-gradient(135deg,var(--pf-accent),color-mix(in srgb,var(--pf-accent) 68%,var(--pf-accent2)),var(--pf-accent2))!important}.portfolio-v2 label,.v2-logo span,.v2-footer span{color:var(--pf-accent)!important}.v2-copy>p,.v2-about p,.v2-section-head p,.v2-contact>p,.v2-timeline p{color:var(--pf-muted)!important}
`}</style>
}
