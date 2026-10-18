'use client';

import Lenis from 'lenis';
import { createContext, useContext, useEffect, useRef, useState } from 'react';

const MotionContext = createContext(false);
export const useMotionPaused = () => useContext(MotionContext);
const chapters = [ ['arrival','Hello, I’m Manya'], ['about','A few pages of me'], ['work','Selected work'], ['greenhouse','Experiments'], ['blogs','Writing'], ['pollinators','Kind words'], ['beyond','Plant a flower'] ];

export default function ScrollExperience({children}) {
 const [paused,setPaused]=useState(false);
 const [active,setActive]=useState('arrival');
 const [growthWord,setGrowthWord]=useState('A little possibility');
 const maxGrowth=useRef(0);
 useEffect(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let saved=false;try{saved=localStorage.getItem('manya-motion')==='paused';}catch{}
  setPaused(saved||reduced.matches);
  const change=e=>setPaused(e.matches);reduced.addEventListener('change',change);
  return()=>reduced.removeEventListener('change',change);
 },[]);
 useEffect(()=>{
  document.body.classList.toggle('motion-off',paused);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const lenis=(!paused&&!reduced.matches)?new Lenis({autoRaf:true,lerp:.085,smoothWheel:true,syncTouch:false,anchors:{offset:0},stopInertiaOnNavigate:true,respectReducedMotion:true}):null;
  const sections=[...document.querySelectorAll('.chapter')];
  let frame=0,stage=-1;
  const clamp=n=>Math.min(1,Math.max(0,n));
  function update(){
   frame=0;
   const mobile=matchMedia('(max-width: 760px)').matches;
   const y=window.scrollY,vh=innerHeight,total=document.documentElement.scrollHeight-vh;
   const progress=clamp(y/Math.max(1,total));
   maxGrowth.current=Math.max(maxGrowth.current,progress);
   const root=document.documentElement;
   root.style.setProperty('--progress',progress.toFixed(4));
   root.style.setProperty('--growth',maxGrowth.current.toFixed(4));
   root.style.setProperty('--daylight',Math.min(1,progress*1.7).toFixed(3));
   sections.forEach(section=>{
    const r=section.getBoundingClientRect();
    const pinned=section.hasAttribute('data-pinned')&&!mobile&&!paused;
    const p=pinned?clamp(-r.top/Math.max(1,r.height-vh)):clamp((vh*.8-r.top)/Math.max(1,r.height+vh*.3));
    section.style.setProperty('--local',p.toFixed(4));
    if(section.id==='arrival'){
     const showBoth=mobile||paused||reduced.matches;
     section.classList.toggle('is-introduced',p>.35);
     const welcome=section.querySelector('.welcome-copy'),professional=section.querySelector('.professional-copy');
     if(welcome){welcome.inert=!showBoth&&p>.35;welcome.setAttribute('aria-hidden',String(!showBoth&&p>.35));}
     if(professional){professional.inert=!showBoth&&p<=.35;professional.setAttribute('aria-hidden',String(!showBoth&&p<=.35));}
    }
    if(section.id==='roots')section.style.setProperty('--root-progress',clamp((vh*.8-r.top)/(r.height-vh*.35)).toFixed(4));
   });
   const next=Math.min(4,Math.floor(maxGrowth.current*5));
   if(next!==stage){stage=next;setGrowthWord(['A little possibility','Taking root','Branching out','In full bloom','Still becoming'][next]);}
   window.dispatchEvent(new CustomEvent('garden:tick',{detail:{scroll:y,viewport:vh,paused:paused||reduced.matches,mobile}}));
  }
  const requestTick=()=>{if(!frame)frame=requestAnimationFrame(update);};
  window.addEventListener('scroll',requestTick,{passive:true});
  window.addEventListener('resize',requestTick);
  lenis?.on('scroll',requestTick);
  const onOverlay=e=>{document.body.classList.toggle('case-open',e.detail.open);if(e.detail.open)lenis?.stop();else{lenis?.start();requestTick();}};
  window.addEventListener('garden:overlay',onOverlay);
  const observer=new IntersectionObserver(entries=>{
   entries.forEach(entry=>{if(entry.isIntersecting){setActive(entry.target.id);entry.target.classList.add('has-grown');}});
  },{rootMargin:'-25% 0px -50% 0px',threshold:0});
  sections.forEach(section=>observer.observe(section));
  const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('is-grown');}),{threshold:.12});
  document.querySelectorAll('.root-story,.pressed-note,.specimen').forEach(node=>reveal.observe(node));
  requestTick();
  return()=>{lenis?.destroy();cancelAnimationFrame(frame);observer.disconnect();reveal.disconnect();window.removeEventListener('scroll',requestTick);window.removeEventListener('resize',requestTick);window.removeEventListener('garden:overlay',onOverlay);document.body.classList.remove('case-open','motion-off');};
 },[paused]);
 function toggle(){const next=!paused;setPaused(next);try{localStorage.setItem('manya-motion',next?'paused':'enabled');}catch{}}
 return <MotionContext.Provider value={paused}>
  <div className="garden-world" aria-hidden="true"><div className="world-dawn"/><div className="world-noon"/></div>
  <nav className="vine-nav" aria-label="Explore the garden"><div className="vine-stem" aria-hidden="true"><span/></div>{chapters.map(([id,label],i)=><a key={id} href={'#'+id} className={'vine-leaf leaf-'+i} aria-label={label} aria-current={active===id?'location':undefined}><svg viewBox="0 0 24 34" aria-hidden="true"><path d="M12 30C-2 19 0 6 20 2c5 16-1 24-8 28Z"/><path d="M12 30 17 8"/></svg><span>{label}</span></a>)}</nav>
  {children}
  <div className="growth-status" aria-hidden="true"><span className="growth-mark"/>{growthWord}</div>
  <button id="motion-toggle" className="motion-toggle" onClick={toggle} aria-pressed={paused} aria-label={paused?'Enable scroll animation':'Pause scroll animation'}><svg viewBox="0 0 20 20" aria-hidden="true">{paused?<path d="m7 4 8 6-8 6Z"/>:<path d="M7 4v12M13 4v12"/>}</svg><span>{paused?'Motion off':'Motion on'}</span></button>
 </MotionContext.Provider>;
}
