'use client';

export default function TechSizeTuning(){return <style>{`
.technology-tools-split .v2-skill-grid{grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:9px!important}
.technology-tools-split .v2-skill{min-height:92px!important;padding:10px 7px!important;gap:8px!important}
.technology-tools-split .skill-logo-box{width:40px!important;height:40px!important;border-radius:10px!important}
.technology-tools-split .skill-logo-box img{width:26px!important;height:26px!important;max-width:26px!important;max-height:26px!important}
.technology-tools-split .v2-skill span{font-size:10px!important;text-align:center;line-height:1.25}
@media(max-width:1150px){.technology-tools-split .v2-skill-grid{grid-template-columns:repeat(6,minmax(0,1fr))!important}}
@media(max-width:950px){.technology-tools-split .v2-skill-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important}}
@media(max-width:760px){.technology-tools-split .v2-skill-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}}
@media(max-width:560px){.technology-tools-split .v2-skill-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}}
@media(max-width:400px){.technology-tools-split .v2-skill-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
`}</style>}
