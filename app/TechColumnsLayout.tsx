'use client';

export default function TechColumnsLayout(){return <style>{`
@media(min-width:901px){
  .technology-tools-split{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;column-gap:34px!important;align-items:start!important}
  .technology-tools-split>label{grid-column:1/-1;margin-bottom:16px}
  .technology-tools-split>.skill-split-head{display:contents!important}
  .technology-tools-split>.skill-split-head>div:first-child{grid-column:1;grid-row:2}
  .technology-tools-split>.skill-split-head>.skill-count-pills{grid-column:1/-1;grid-row:1;justify-content:flex-end;margin-top:-2px}
  .technology-tools-split>.v2-skill-grid:first-of-type{grid-column:1;grid-row:3}
  .technology-tools-split>.skill-divider{display:none!important}
  .technology-tools-split>h2.skill-kind-title{grid-column:2;grid-row:2;margin-top:0!important}
  .technology-tools-split>h2.skill-kind-title + .skill-kind-copy{grid-column:2;grid-row:2;align-self:end;margin-top:50px!important}
  .technology-tools-split>.v2-skill-grid:last-of-type{grid-column:2;grid-row:3}
  .technology-tools-split .v2-skill-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:9px!important;margin-top:18px!important}
  .technology-tools-split>h2.skill-kind-title + .skill-kind-copy + .v2-skill-grid{margin-top:18px!important}
}
@media(min-width:1150px){
  .technology-tools-split .v2-skill-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}
}
@media(max-width:900px){
  .technology-tools-split{display:block!important}
  .technology-tools-split>.skill-divider{display:block!important}
}
`}</style>}
