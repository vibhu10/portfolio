export type Kind='GS'|'GSAT';
export type Q={id:string;kind:Kind;topic:string;q:string;o:string[];a:number;why:string;tip:string;year?:number;sourceType?:string};
export const official={
 home:'https://hppsc.hp.gov.in/',
 mains:'https://hppsc.hp.gov.in/hppsc1/WriteReadData/LINKS/Amended%20Syllabus%20of%20HPAS%20Main%20Examination2fbbc628-97dc-4a52-b27d-dee8b034408d.pdf',
 archive:'https://himexam.com/hpas-previous-question-papers-pdf-download/',
 solved:'https://hpgeneralstudies.com/previous-years-question-papers-himachal-pradesh-has-allied-services-examination/'
};
const modern=new Set([2010,2011,2013,2014,2016,2017,2018,2020,2021,2023,2024,2025]);
const archived=new Set([2005,2006,2007,2009,2012,2015,2019,2022]);
export const papers=Array.from({length:26},(_,i)=>{const year=2025-i;const legacy=year<2010;const status=modern.has(year)?'Verified':archived.has(year)?'Archive':'Not verified';return{year,gs:status,gsat:legacy?'N/A':status,url:status==='Verified'||status==='Archive'?official.archive:official.solved,legacy}});
export const gsPriority=[
 ['Himachal history, geography, culture & development',96],['HP economy, governance, schemes & current issues',92],['Indian Polity & Governance',86],['Current Affairs',84],['Indian History & National Movement',79],['Indian & World Geography',76],['Environment, Biodiversity & Climate',74],['Economy & Social Development',72],['General Science',64]
] as const;
export const gsatPriority=[
 ['Logical reasoning & analytical ability',95],['Basic numeracy',92],['Data interpretation',88],['Comprehension',84],['General mental ability',82],['English comprehension',72],['Decision making & interpersonal skills',68]
] as const;
export const prelim=[
 ['p1','GS','Himachal Pradesh: history, geography, polity, art, culture and socio-economic development','Very High'],
 ['p2','GS','Current events of national, international and Himachal Pradesh importance','Very High'],
 ['p3','GS','Indian and World Geography','High'],['p4','GS','Indian Polity and Governance','Very High'],
 ['p5','GS','Economic and Social Development','High'],['p6','GS','Environment, biodiversity and climate change','High'],
 ['p7','GS','General Science','Medium'],['p8','GSAT','Comprehension','High'],
 ['p9','GSAT','Interpersonal and communication skills','Medium'],['p10','GSAT','Logical reasoning and analytical ability','Very High'],
 ['p11','GSAT','Decision making and problem solving','Medium'],['p12','GSAT','General mental ability','High'],
 ['p13','GSAT','Basic numeracy and data interpretation (Class X level)','Very High']
] as const;
export const mains=[
 ['m1','English','English language: comprehension, précis, usage and composition','High'],
 ['m2','Hindi','Hindi language and composition','High'],['m3','Essay','Essay on multiple topics','Very High'],
 ['m4','GS-I','History, culture, geography and society of India and Himachal Pradesh','Very High'],
 ['m5','GS-II','Governance, Constitution, polity, social justice and international relations','Very High'],
 ['m6','GS-III','Economy, science & technology, environment, disaster management and security','Very High'],
 ['m7','Optional-I','Optional subject Paper I','High'],['m8','Optional-II','Optional subject Paper II','High']
] as const;
export const questions:Q[]=[
 {id:'g1',kind:'GS',topic:'Himachal Pradesh',year:2024,q:'Which river is most closely associated with the Bhakra Dam project?',o:['Beas','Ravi','Satluj','Chenab'],a:2,why:'Bhakra Dam is built across the Satluj River near the Himachal–Punjab boundary.',tip:'Revise HP rivers together with dams, tributaries and hydropower projects.'},
 {id:'g2',kind:'GS',topic:'Himachal Pradesh',q:'The Great Himalayan National Park is located primarily in which district?',o:['Kullu','Kangra','Chamba','Sirmaur'],a:0,why:'The Great Himalayan National Park is in Kullu district and is a UNESCO World Heritage Site.',tip:'Protected areas, districts and UNESCO designations are high-value HP facts.'},
 {id:'g3',kind:'GS',topic:'Polity',q:'Which Part of the Constitution contains Fundamental Rights?',o:['Part II','Part III','Part IV','Part V'],a:1,why:'Fundamental Rights are contained in Part III of the Constitution of India.',tip:'Learn Parts III and IV together with major Articles and landmark amendments.'},
 {id:'g4',kind:'GS',topic:'Environment',q:'A Ramsar site is internationally recognized mainly for the conservation of what?',o:['Grasslands','Wetlands','Deserts','Coral reefs only'],a:1,why:'The Ramsar Convention is the international treaty for conservation and wise use of wetlands.',tip:'Pair environmental conventions with their subject, year and Indian sites.'},
 {id:'g5',kind:'GS',topic:'History',q:'The Indian National Congress was founded in which year?',o:['1885','1905','1919','1920'],a:0,why:'The Indian National Congress was founded in 1885.',tip:'Build a timeline of national movement events rather than memorising isolated dates.'},
 {id:'g6',kind:'GS',topic:'Economy',q:'Repo rate is the rate at which which institution lends short-term funds to commercial banks?',o:['SEBI','RBI','NABARD only','Finance Commission'],a:1,why:'The Reserve Bank of India lends to commercial banks at the repo rate against eligible securities.',tip:'Know monetary-policy tools by direction of money flow and intended effect.'},
 {id:'a1',kind:'GSAT',topic:'Basic Numeracy',q:'An item costing ₹800 is sold for ₹920. What is the profit percentage?',o:['12%','15%','18%','20%'],a:1,why:'Profit = 120. Profit % = 120/800 × 100 = 15%.',tip:'Profit percentage uses cost price as the denominator.'},
 {id:'a2',kind:'GSAT',topic:'Basic Numeracy',q:'If 3/5 of a number is 48, what is the number?',o:['72','80','90','96'],a:1,why:'Number = 48 × 5/3 = 80.',tip:'Translate the sentence into an equation before calculating.'},
 {id:'a3',kind:'GSAT',topic:'Logical Reasoning',q:'P is taller than Q and Q is taller than R. Which statement must be true?',o:['R is taller than P','P is taller than R','P equals R','Nothing follows'],a:1,why:'The relation is transitive: P > Q and Q > R, therefore P > R.',tip:'Convert verbal ordering into symbols.'},
 {id:'a4',kind:'GSAT',topic:'Data Interpretation',q:'A class has 40 students and 60% are girls. How many boys are there?',o:['12','16','20','24'],a:1,why:'Girls = 24, so boys = 40 − 24 = 16.',tip:'For percentage questions, compute the known group first and subtract when quicker.'},
 {id:'a5',kind:'GSAT',topic:'Comprehension',q:'A policy may be well designed yet fail if citizens cannot access information about it. What is the central idea?',o:['Rules are unnecessary','Communication is important to implementation','Citizens should write all policy','Information replaces administration'],a:1,why:'The statement links policy success to accessible information and communication.',tip:'Choose the option covering the whole passage, not an extreme inference.'},
 {id:'a6',kind:'GSAT',topic:'General Mental Ability',q:'If today is Monday, what day will it be 45 days later?',o:['Tuesday','Wednesday','Thursday','Friday'],a:2,why:'45 mod 7 = 3; three days after Monday is Thursday.',tip:'Reduce day-cycle questions modulo 7.'}
];
