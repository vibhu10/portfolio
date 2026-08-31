import type {Config} from 'tailwindcss';

const config:Config={
 content:['./app/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}'],
 theme:{extend:{colors:{ink:'#070A10',panel:'#101621',panel2:'#151C29',line:'#253142',muted:'#8492A4',accent:'#7C5CFF',cyan:'#3FD4FF'}}},
 plugins:[]
};
export default config;
