'use client';

import {useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import TechnologyToolsShowcase from './TechnologyToolsShowcase';

export default function TechnologyToolsMount(){
 const[target,setTarget]=useState<HTMLElement|null>(null);
 useEffect(()=>{setTarget(document.getElementById('skills'))},[]);
 if(!target)return null;
 return createPortal(<><TechnologyToolsShowcase/><style>{`
.v2-about{grid-template-columns:1fr!important;gap:44px!important}
.v2-about>div:first-child{max-width:860px}
.v2-about #skills{display:block!important;grid-column:1/-1!important;width:100%!important;max-width:none!important}
.v2-about #skills>label,.v2-about #skills>h2,.v2-about #skills>.v2-skill-grid{display:none!important}
.v2-about #skills>.ai-stack-showcase{display:block!important;width:100%!important;margin:0!important;padding:8px 0 22px!important}
`}</style></>,target)
}
