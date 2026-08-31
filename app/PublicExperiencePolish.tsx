'use client';

import {useEffect} from 'react';

const BASE='/portfolio';

export default function PublicExperiencePolish(){
 useEffect(()=>{
  const repairProfile=()=>{
   const img=document.querySelector<HTMLImageElement>('.v2-avatar-wrap img');
   if(!img)return;
   const fallback=`${BASE}/profile-320.jpg`;
   const verify=()=>{if(!img.complete||img.naturalWidth<20){if(!img.src.endsWith(fallback))img.src=fallback}};
   img.addEventListener('error',()=>{img.src=fallback},{once:true});
   setTimeout(verify,1200);
  };
  repairProfile();
  const observer=new MutationObserver(repairProfile);observer.observe(document.body,{childList:true,subtree:true});
  return()=>observer.disconnect();
 },[]);
 return <style>{`
/* Overall page rhythm */
.portfolio-v2{overflow-x:hidden}.v2-nav{max-width:100%;padding-left:clamp(20px,5vw,72px);padding-right:clamp(20px,5vw,72px)}
.v2-hero{max-width:1240px;min-height:auto;padding:96px 42px 78px;grid-template-columns:minmax(0,1.4fr) minmax(300px,340px);gap:clamp(44px,6vw,82px)}
.v2-copy h1{font-size:clamp(58px,7vw,94px);max-width:850px}.v2-copy h2{max-width:780px}.v2-profile{align-self:center;transform:translateZ(0);border-color:rgba(130,103,255,.28);background:linear-gradient(160deg,rgba(20,20,34,.96),rgba(9,13,20,.98));box-shadow:0 30px 80px rgba(0,0,0,.32),0 0 55px rgba(113,83,255,.07)}
.v2-avatar-wrap{width:176px;height:176px}.v2-avatar-wrap img{visibility:visible!important;opacity:1!important;background:#131824;object-fit:cover;object-position:center 22%;image-rendering:auto}
.v2-stats{max-width:1160px;margin:0 auto 34px;border-color:#242a38;background:#242a38}.v2-stats>div{min-height:98px;padding:23px 20px}
.portfolio-v2 section:not(.v2-stats){max-width:1240px;padding-top:92px;padding-bottom:92px}.v2-about{gap:46px}.v2-about>div:first-child{max-width:820px}.v2-about>div:first-child p{max-width:760px}.v2-project-grid{gap:22px;margin-top:42px}.v2-project{border-radius:18px}.v2-project.featured{grid-template-columns:.8fr 1.2fr}.v2-project-body{padding:30px}.v2-bottom{gap:52px;grid-template-columns:1.12fr .88fr}.v2-contact{position:sticky;top:96px}.v2-footer{max-width:1240px}

/* Premium stack mount */
.v2-about #skills{margin-top:8px}.v2-about #skills>.stack-showcase{padding-top:10px!important}.stack-lanes>article{backdrop-filter:blur(10px)}

/* Jarvis: morphing plasma instead of mechanical rings */
.jarvis-orb{width:76px!important;height:76px!important;border:0!important;border-radius:46% 54% 62% 38% / 43% 39% 61% 57%!important;background:radial-gradient(circle at 35% 28%,rgba(234,252,255,.98) 0 6%,rgba(100,237,255,.92) 12%,rgba(48,190,255,.76) 28%,rgba(106,78,255,.72) 52%,rgba(22,12,64,.88) 72%,rgba(3,8,18,.96) 100%)!important;box-shadow:0 0 24px rgba(83,224,255,.58),0 0 58px rgba(78,153,255,.28),0 0 92px rgba(137,82,255,.18),inset 8px -10px 26px rgba(52,13,125,.38),inset -10px 8px 24px rgba(94,246,255,.32)!important;animation:plasmaMorph 6.5s ease-in-out infinite,plasmaFloat 3.8s ease-in-out infinite!important;filter:saturate(1.18);isolation:isolate;overflow:visible!important}
.jarvis-orb:before{content:'';position:absolute;inset:7px;border-radius:58% 42% 43% 57% / 52% 60% 40% 48%;background:conic-gradient(from 120deg,rgba(255,255,255,.82),rgba(72,232,255,.04) 18%,rgba(106,68,255,.6) 42%,rgba(72,232,255,.48) 68%,rgba(255,255,255,.82));filter:blur(5px);opacity:.72;mix-blend-mode:screen;animation:plasmaSpin 7s linear infinite;z-index:0}.jarvis-orb:after{content:''!important;position:absolute!important;inset:-13px!important;border-radius:48% 52% 44% 56% / 58% 43% 57% 42%!important;background:radial-gradient(circle,rgba(96,228,255,.18),rgba(112,71,255,.1) 44%,transparent 70%)!important;filter:blur(9px)!important;animation:plasmaAura 3.2s ease-in-out infinite!important;z-index:-1!important}.jarvis-orb .hud,.jarvis-orb .energy-beam{display:none!important}.jarvis-core{width:24px!important;height:24px!important;background:rgba(218,250,255,.14)!important;border:1px solid rgba(225,253,255,.46)!important;backdrop-filter:blur(4px);box-shadow:0 0 18px rgba(193,248,255,.62)!important;z-index:3!important}.jarvis-core b{color:#f1fdff!important;text-shadow:0 0 8px #8deaff!important}.jarvis-core i{display:none!important}.jarvis-label{color:#87b9c8!important}.jarvis-welcome{border-color:rgba(96,220,255,.23)!important;background:linear-gradient(135deg,rgba(7,15,24,.97),rgba(19,16,45,.96))!important;box-shadow:0 24px 75px rgba(0,0,0,.5),0 0 36px rgba(81,211,255,.1)!important}.jw-orb{border-radius:44% 56% 61% 39% / 54% 44% 56% 46%!important;background:radial-gradient(circle at 34% 28%,#e8fdff,#5ce8ff 20%,#5568ff 55%,#170f43 78%)!important;animation:plasmaMorph 5s ease-in-out infinite!important}.jw-orb i{display:none!important}

@keyframes plasmaMorph{0%,100%{border-radius:46% 54% 62% 38% / 43% 39% 61% 57%;transform:rotate(0deg) scale(1)}25%{border-radius:57% 43% 39% 61% / 55% 61% 39% 45%;transform:rotate(3deg) scale(1.035)}50%{border-radius:39% 61% 54% 46% / 61% 43% 57% 39%;transform:rotate(-2deg) scale(.98)}75%{border-radius:63% 37% 46% 54% / 41% 56% 44% 59%;transform:rotate(2deg) scale(1.025)}}
@keyframes plasmaFloat{0%,100%{translate:0 0}50%{translate:0 -4px}}
@keyframes plasmaSpin{to{transform:rotate(360deg)}}
@keyframes plasmaAura{0%,100%{opacity:.5;transform:scale(.92) rotate(0)}50%{opacity:1;transform:scale(1.14) rotate(8deg)}}

@media(max-width:960px){.v2-hero{grid-template-columns:1fr;padding-top:76px}.v2-profile{max-width:420px;width:100%;justify-self:start}.v2-contact{position:static}.v2-bottom{grid-template-columns:1fr}.portfolio-v2 section:not(.v2-stats){padding-top:74px;padding-bottom:74px}}
@media(max-width:620px){.v2-hero{padding:64px 20px 56px;gap:38px}.v2-copy h1{font-size:54px;letter-spacing:-3px}.v2-profile{padding:27px 20px}.v2-avatar-wrap{width:150px;height:150px}.v2-stats{margin:0 12px 24px}.v2-stats>div{min-height:88px}.portfolio-v2 section:not(.v2-stats){padding-top:62px;padding-bottom:62px}.v2-project-body{padding:22px}.jarvis-orb{width:64px!important;height:64px!important}.jarvis-welcome{max-width:calc(100vw - 28px)}}
`}</style>
}
