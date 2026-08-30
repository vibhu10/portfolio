'use client';

import {useEffect} from 'react';

const repair:Record<string,string>={
 'Chakra UI':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/chakraui.svg',
 'REST API':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/swagger.svg',
 'JWT':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/jsonwebtokens.svg',
 'OAuth':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/auth0.svg',
 'WebSockets':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/socketdotio.svg',
 'OpenAI API':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openai.svg',
 'LLM APIs':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openai.svg',
 'Embeddings':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openai.svg',
 'RAG':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openai.svg',
 'Vector Databases':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/qdrant.svg',
 'AI Agents':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/openai.svg',
 'Stripe':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/stripe.svg',
 'n8n':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/n8n.svg',
 'Docker Compose':'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg',
 'AWS':'https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/amazonwebservices.svg',
 'GitHub':'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg',
 'Vercel':'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vercel/vercel-original.svg',
 'Next.js':'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg',
 'Express.js':'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/express/express-original.svg'
};

function scan(){
 document.querySelectorAll<HTMLElement>('.brand-skill,.skill-cms-card').forEach(card=>{
  const name=(card.querySelector('span:last-child')?.textContent||card.querySelector('.skill-cms-main h3')?.textContent||'').trim();
  const src=repair[name];if(!src)return;
  const box=(card.querySelector('.skill-logo-box')||card.querySelector('.skill-icon-wrap')) as HTMLElement|null;if(!box)return;
  let img=box.querySelector('img') as HTMLImageElement|null;
  if(!img){img=document.createElement('img');img.alt=`${name} logo`;box.prepend(img)}
  if(img.dataset.repaired!=='1'){img.src=src;img.dataset.repaired='1';img.style.display='block';img.onerror=()=>{img!.style.display='none'};const fallback=box.querySelector('b') as HTMLElement|null;if(fallback)fallback.style.display='none'}
 });
}

export default function BrandIconRepair(){useEffect(()=>{scan();const obs=new MutationObserver(scan);obs.observe(document.body,{childList:true,subtree:true});const id=setInterval(scan,1800);return()=>{obs.disconnect();clearInterval(id)}},[]);return null}
