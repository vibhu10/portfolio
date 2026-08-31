'use client';

import {useMemo,useState} from 'react';

const exact:Record<string,string[]>={
 'HTML5':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg'],
 'CSS3':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg'],
 'JavaScript':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg'],
 'TypeScript':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/typescript/typescript-original.svg'],
 'React':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg'],
 'React.js':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg'],
 'React Native':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg'],
 'Next.js':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nextjs/nextjs-original.svg','https://cdn.simpleicons.org/nextdotjs'],
 'Tailwind CSS':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/tailwindcss/tailwindcss-original.svg'],
 'Chakra UI':['https://cdn.simpleicons.org/chakraui'],
 'Redux':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redux/redux-original.svg'],
 'Node.js':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nodejs/nodejs-original.svg'],
 'Express.js':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/express/express-original.svg','https://cdn.simpleicons.org/express'],
 'Python':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg'],
 'FastAPI':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/fastapi/fastapi-original.svg'],
 'REST API':['https://cdn.simpleicons.org/swagger'],
 'JWT':['https://cdn.simpleicons.org/jsonwebtokens'],
 'OAuth':['https://cdn.simpleicons.org/auth0'],
 'WebSockets':['https://cdn.simpleicons.org/socketdotio'],
 'MongoDB':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mongodb/mongodb-original.svg'],
 'PostgreSQL':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postgresql/postgresql-original.svg'],
 'MySQL':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/mysql/mysql-original.svg'],
 'Redis':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/redis/redis-original.svg'],
 'OpenAI API':['https://cdn.simpleicons.org/openai'],
 'LLM APIs':['https://cdn.simpleicons.org/openai'],
 'Embeddings':['https://cdn.simpleicons.org/openai'],
 'RAG':['https://cdn.simpleicons.org/openai'],
 'Vector Databases':['https://cdn.simpleicons.org/qdrant'],
 'AI Agents':['https://cdn.simpleicons.org/openai'],
 'VS Code':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vscode/vscode-original.svg'],
 'Visual Studio':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/visualstudio/visualstudio-original.svg'],
 'Chrome DevTools':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/chrome/chrome-original.svg'],
 'Git':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg'],
 'GitHub':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/github/github-original.svg','https://cdn.simpleicons.org/github'],
 'GitHub Actions':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/githubactions/githubactions-original.svg'],
 'GitLab':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/gitlab/gitlab-original.svg'],
 'Postman':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/postman/postman-original.svg'],
 'Playwright':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/playwright/playwright-original.svg'],
 'Jest':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jest/jest-plain.svg'],
 'Vitest':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitest/vitest-original.svg'],
 'Cypress':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cypressio/cypressio-original.svg'],
 'npm':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/npm/npm-original-wordmark.svg'],
 'pnpm':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/pnpm/pnpm-original.svg'],
 'Yarn':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/yarn/yarn-original.svg'],
 'Vite':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vitejs/vitejs-original.svg'],
 'Webpack':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/webpack/webpack-original.svg'],
 'Docker':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg'],
 'Docker Compose':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/docker/docker-original.svg'],
 'Kubernetes':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/kubernetes/kubernetes-original.svg'],
 'Nginx':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/nginx/nginx-original.svg'],
 'AWS':['https://cdn.simpleicons.org/amazonwebservices','https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/amazonwebservices/amazonwebservices-plain-wordmark.svg'],
 'Azure':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/azure/azure-original.svg'],
 'Google Cloud':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/googlecloud/googlecloud-original.svg'],
 'DigitalOcean':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/digitalocean/digitalocean-original.svg'],
 'Vercel':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vercel/vercel-original.svg','https://cdn.simpleicons.org/vercel'],
 'Netlify':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/netlify/netlify-original.svg'],
 'Supabase':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/supabase/supabase-original.svg'],
 'Firebase':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/firebase/firebase-original.svg'],
 'Stripe':['https://cdn.simpleicons.org/stripe'],
 'n8n':['https://cdn.simpleicons.org/n8n'],
 'Figma':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/figma/figma-original.svg'],
 'Jira':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/jira/jira-original.svg'],
 'Slack':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/slack/slack-original.svg'],
 'Bootstrap':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/bootstrap/bootstrap-original.svg'],
 'Sass':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/sass/sass-original.svg'],
 'Vue.js':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/vuejs/vuejs-original.svg'],
 'Angular':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/angular/angular-original.svg'],
 'GraphQL':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/graphql/graphql-plain.svg'],
 'Django':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/django/django-plain.svg'],
 'PHP':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/php/php-original.svg'],
 'Laravel':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/laravel/laravel-original.svg'],
 'Java':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg'],
 'Spring':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/spring/spring-original.svg'],
 'C#':['https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/csharp/csharp-original.svg'],
};

const aliases:Record<string,string>={
 'nextjs':'nextdotjs','nodejs':'nodedotjs','reactnative':'react','vscode':'visualstudiocode','githubactions':'githubactions','googlecloud':'googlecloud','amazonwebservices':'amazonwebservices','aws':'amazonwebservices','dotnet': 'dotnet','csharp':'sharp','cplusplus':'cplusplus','c++':'cplusplus','c#':'sharp','mssql':'microsoftsqlserver','sqlserver':'microsoftsqlserver','restapi':'swagger','websocket':'socketdotio','websockets':'socketdotio','openaiapi':'openai','aiagents':'openai','llmapis':'openai','vectordatabases':'qdrant'
};

function compact(name:string){return name.toLowerCase().replace(/[^a-z0-9+#]/g,'')}
function simpleSlug(name:string){const key=compact(name);return aliases[key]||key.replace(/\+/g,'plus').replace(/#/g,'sharp')}
function devSlug(name:string){const key=compact(name);const map:Record<string,string>={nextjs:'nextjs',nodejs:'nodejs',reactjs:'react',vuejs:'vuejs',csharp:'csharp',cplusplus:'cplusplus',visualstudiocode:'vscode',vscode:'vscode',googlecloud:'googlecloud',githubactions:'githubactions',chrome:'chrome',chromedevtools:'chrome'};return map[key]||key.replace(/\+/g,'plus').replace(/#/g,'sharp')}

export function skillIconCandidates(name:string){
 const s=simpleSlug(name),d=devSlug(name);
 const generated=[
  `https://cdn.simpleicons.org/${s}`,
  `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${d}/${d}-original.svg`,
  `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${d}/${d}-plain.svg`,
 ];
 return [...new Set([...(exact[name]||[]),...generated])];
}

export function SkillLogo({name,className='',title}:{name:string;className?:string;title?:string}){
 const candidates=useMemo(()=>skillIconCandidates(name),[name]);
 const[index,setIndex]=useState(0);
 const src=candidates[index];
 if(!src)return <span className={className} aria-label={title||name}>◇</span>;
 return <img className={className} src={src} alt={`${name} logo`} title={title||name} loading='lazy' onError={()=>setIndex(i=>i<candidates.length-1?i+1:candidates.length)}/>;
}
