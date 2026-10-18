'use client';

import { useEffect, useRef, useState } from 'react';
import BotanicalResolve from './BotanicalResolve';

const projects = [
  { id:'carey',name:'CAREY',type:'Service design',collection:'Garden study',plant:'/assets/carey.png',color:'#e3dfed',ink:'#4d405f',description:'A service-design study from my Polymath’s Garden. A space to explore the relationships between people, systems, and care.' },
  { id:'solis',name:'Solis',type:'Internet of things',collection:'Garden study',plant:'/assets/sunflower.png',color:'#efe3af',ink:'#605224',description:'An Internet of Things study from my Polymath’s Garden. One of the ways I explore connections between the digital and the physical.' },
  { id:'sceneria',name:'SCENERIA',type:'Tangible user interface',collection:'Garden study',plant:'/assets/sceneria.png',color:'#dce8d3',ink:'#354d38',description:'A tangible user interface study from my Polymath’s Garden. Exploring interaction beyond the screen.' },
  { id:'safety',name:'A little more trust.',type:'Digital scam prevention',collection:'Case study',plant:'/assets/lotus.png',color:'#e7e6f0',ink:'#3d3755',image:'/assets/scam.png',url:'https://manyaa.me/works/scam-prevention',description:'An assistance layer within existing operating systems to help people recognise digital scams and find a clearer path to recovery.',detail:'Systems thinking · Design for responsible technology' },
  { id:'sakhi',name:'Sakhi',type:'Agentic AI · Voice interfaces',collection:'Case study',plant:'/assets/flowers.png',color:'#efe0d3',ink:'#593a32',image:'/assets/sakhi.png',url:'https://manyaa.me/works/sakhi',description:'Designed with and for Self-Help Groups, Sakhi makes bookkeeping a voice-driven collaboration between women and AI.',detail:'Human–AI collaboration · Multimodal interactions' },
  { id:'celebto',name:'Celebto',type:'Personalised travel companion',collection:'Case study',plant:'/assets/botanical.png',color:'#dce7eb',ink:'#293e49',image:'/assets/celebto.png',url:'https://manyaa.me/works/celebto',description:'A personalised travel companion that turns trip planning into journeys shaped around each traveller’s own rhythm.',detail:'Launched product · Web app design' },
];

export default function ProjectSpecimens() {
  const [selected,setSelected] = useState(null);
  const [filter,setFilter] = useState('all');
  const dialogRef=useRef(null),triggerRef=useRef(null),originRef=useRef({x:50,y:50}),closing=useRef(false);
  useEffect(()=>{
    if(!selected)return;
    const dialog=dialogRef.current;
    dialog.showModal();
    window.dispatchEvent(new CustomEvent('garden:overlay',{detail:{open:true}}));
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches||document.body.classList.contains('motion-off');
    if(!reduced){
      const {x,y}=originRef.current;
      dialog.animate([{clipPath:`circle(0% at ${x}% ${y}%)`},{clipPath:`circle(150% at ${x}% ${y}%)`}],{duration:650,easing:'cubic-bezier(.16,1,.3,1)'});
      dialog.querySelector('.case-bloom')?.animate([{transform:'scale(.35) rotate(-12deg)',filter:'blur(5px)'},{transform:'scale(1) rotate(0deg)',filter:'blur(0px)'}],{duration:850,easing:'cubic-bezier(.16,1,.3,1)'});
    }
    return()=>{window.dispatchEvent(new CustomEvent('garden:overlay',{detail:{open:false}}));};
  },[selected]);
  function open(project,event){
    const rect=event.currentTarget.getBoundingClientRect();
    originRef.current={x:(rect.left+rect.width/2)/innerWidth*100,y:(rect.top+rect.height/2)/innerHeight*100};
    triggerRef.current=event.currentTarget;
    setSelected(project);
  }
  async function close(){
    if(closing.current)return;
    closing.current=true;
    const dialog=dialogRef.current;
    if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!document.body.classList.contains('motion-off')){
      const {x,y}=originRef.current;
      try{await dialog.animate([{clipPath:`circle(150% at ${x}% ${y}%)`},{clipPath:`circle(0% at ${x}% ${y}%)`}],{duration:420,easing:'cubic-bezier(.7,0,.8,.3)'}).finished;}catch{}
    }
    dialog.close();setSelected(null);closing.current=false;
    requestAnimationFrame(()=>triggerRef.current?.focus({preventScroll:true}));
  }
  const visible=projects.filter(p=>filter==='all'||(filter==='work'?p.url:!p.url));
  return <>
    <div className="specimen-filters" role="group" aria-label="Choose a collection"><button aria-pressed={filter==='all'} onClick={()=>setFilter('all')}>The whole garden</button><button aria-pressed={filter==='work'} onClick={()=>setFilter('work')}>Published case studies</button><button aria-pressed={filter==='studies'} onClick={()=>setFilter('studies')}>Garden studies</button></div>
    <div className="specimen-field">{visible.map((p,i)=><button key={p.id} className={'specimen species-'+p.id} onClick={event=>open(p,event)} aria-label={'Explore '+p.name+' — '+p.type} style={{'--species-color':p.color,'--species-ink':p.ink,'--lean':`${(i%3-1)*6}deg`}}>
      <div className="specimen-plant"><BotanicalResolve src={p.plant} alt="" /></div>
      <div className="specimen-tag"><span className="specimen-name">{p.name}</span><span className="specimen-type">{p.type}</span><span className="specimen-collection">{p.collection}<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 16 16 4M5 4h11v11"/></svg></span></div>
    </button>)}</div>
    <dialog ref={dialogRef} className="specimen-dialog" aria-labelledby="case-title" onCancel={event=>{event.preventDefault();close();}} style={selected?{'--case-color':selected.color,'--case-ink':selected.ink}:undefined}>
      {selected&&<div className="case-scroll" data-lenis-prevent>
        <button className="case-close" onClick={close}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12 4-6 6 6 6"/></svg>Back to the garden</button>
        <div className="case-hero"><div className="case-copy"><h2 id="case-title">{selected.name}</h2><p className="case-type">{selected.type}</p><p className="case-description">{selected.description}</p>{selected.detail&&<p className="case-detail">{selected.detail}</p>}<a className="underlined" href={selected.url||`mailto:manya.manuseema@gmail.com?subject=${encodeURIComponent('Let’s talk about '+selected.name)}`} target={selected.url?'_blank':undefined} rel="noopener noreferrer">{selected.url?'Read the full case study':'Let’s talk about this study'} <span aria-hidden="true">↗</span></a></div><img className="case-bloom" src={selected.plant} alt="Botanical specimen" /></div>
        {selected.image&&<div className="case-artwork"><img src={selected.image} alt={selected.name+' project overview'} /><a className="underlined" href={selected.url} target="_blank" rel="noopener noreferrer">Research, decisions & the full story <span aria-hidden="true">↗</span></a></div>}
        {!selected.url&&<p className="study-note">From the study collection. More process and detail available in conversation.</p>}
      </div>}
    </dialog>
  </>;
}
