'use client';

import { useEffect, useRef, useState } from 'react';
import PixelGarden from './PixelGarden';
import { useMotionPaused } from './ScrollExperience';

const vertex='attribute vec2 position;varying vec2 uv;void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}';
const fragment=`precision mediump float;varying vec2 uv;uniform float time;uniform float palette;uniform vec2 pointer;
float field(vec2 p){return sin(p.x*7.+sin(p.y*4.+time*.3))*sin(p.y*6.-time*.2);}
void main(){vec2 p=uv;float f=field(p);float g=field(p*1.5+vec2(time*.025,0.));vec3 a=vec3(.25,.40,.26);vec3 b=vec3(.74,.79,.38);vec3 c=vec3(.84,.56,.52);if(palette>0.5){a=vec3(.24,.30,.45);b=vec3(.54,.49,.70);c=vec3(.94,.68,.39);}vec3 color=mix(a,b,smoothstep(-.9,.9,f));color=mix(color,c,smoothstep(.35,.9,g)*.6);float pollen=0.;for(int i=0;i<16;i++){float n=float(i);vec2 seed=vec2(fract(sin(n*43.3)*45.1),fract(sin(n*17.7)*62.7));vec2 drift=vec2(sin(time*.4+n)*.025,cos(time*.3+n)*.03);drift+=normalize(seed-pointer+vec2(.001))*exp(-length(seed-pointer)*10.)*.10;float d=length(p-seed-drift);pollen+=smoothstep(.006,.002,d)*.5;}color+=pollen;float glow=exp(-length(p-pointer)*10.);color+=vec3(.2,.17,.05)*glow;gl_FragColor=vec4(color,1.);}`;

function ShaderPatch(){
 const ref=useRef(null),paletteRef=useRef(0),pausedRef=useRef(false),restartRef=useRef(null);
 const [palette,setPalette]=useState(0),[fallback,setFallback]=useState(true),[eligible,setEligible]=useState(false);
 const paused=useMotionPaused();
 useEffect(()=>{pausedRef.current=paused;restartRef.current?.();},[paused]);
 useEffect(()=>{paletteRef.current=palette;restartRef.current?.();},[palette]);
 useEffect(()=>{const media=matchMedia('(min-width: 761px) and (prefers-reduced-motion: no-preference)');const change=()=>setEligible(media.matches);change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);},[]);
 useEffect(()=>{
  const canvas=ref.current;
  if(!eligible){setFallback(true);return;}
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
  if(!gl){setFallback(true);return;}
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null;}return s;}
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
  if(!vs||!fs){setFallback(true);return;}
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){setFallback(true);return;}
  setFallback(false);
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const time=gl.getUniformLocation(program,'time'),color=gl.getUniformLocation(program,'palette'),pointer=gl.getUniformLocation(program,'pointer');
  let frame=0,visible=false,mouse=[.5,.5],last=0;
  const resize=()=>{const r=canvas.getBoundingClientRect();canvas.width=Math.min(900,Math.round(r.width));canvas.height=Math.min(560,Math.round(r.height));gl.viewport(0,0,canvas.width,canvas.height);};
  const draw=t=>{frame=0;if(!visible||document.hidden)return;if(t-last>30||pausedRef.current){gl.uniform1f(time,pausedRef.current?0:t*.001);gl.uniform1f(color,paletteRef.current);gl.uniform2f(pointer,...mouse);gl.drawArrays(gl.TRIANGLES,0,6);last=t;}if(!pausedRef.current)frame=requestAnimationFrame(draw);};
  restartRef.current=()=>{if(visible&&!frame)frame=requestAnimationFrame(draw);};
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!frame)frame=requestAnimationFrame(draw);if(!visible){cancelAnimationFrame(frame);frame=0;}});observer.observe(canvas);
  const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else if(visible&&!frame)frame=requestAnimationFrame(draw);};
  const move=e=>{const r=canvas.getBoundingClientRect();mouse=[(e.clientX-r.left)/r.width,1-(e.clientY-r.top)/r.height];};
  const ro=new ResizeObserver(resize);ro.observe(canvas);resize();canvas.addEventListener('pointermove',move);document.addEventListener('visibilitychange',visibility);
  return()=>{restartRef.current=null;cancelAnimationFrame(frame);observer.disconnect();ro.disconnect();canvas.removeEventListener('pointermove',move);document.removeEventListener('visibilitychange',visibility);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);};
 },[eligible]);
 return <div className={'shader-patch '+(fallback?'shader-static':'')} style={{'--palette':palette}}><canvas ref={ref} aria-label="A flowing botanical color field with pollen responding to your pointer" role="img"/><div className="shader-label"><h3>Colour, in the wild.</h3><p>{fallback?'A quiet colour study.':'Move through the light. Scatter a little pollen.'}</p></div><button onClick={()=>setPalette(p=>1-p)} aria-pressed={palette===1}>Change the light <span aria-hidden="true">↗</span></button></div>;
}

const prompts=['What if technology felt as familiar as a conversation with Grandma?','What if a tiny daily ritual could grow into something meaningful?','What if an interface started with someone’s voice, rather than a screen?','What if the most useful design decision was to leave something out?'];
export default function Greenhouse(){
 const [prompt,setPrompt]=useState(0);
 return <div className="greenhouse-plots"><ShaderPatch/><PixelGarden/><div className="what-if"><h3>Curiosity is a practice.</h3><p aria-live="polite">{prompts[prompt]}</p><button className="underlined" onClick={()=>setPrompt(p=>(p+1)%prompts.length)}>Ask another “what if” <span aria-hidden="true">↗</span></button><span className="experiment-note">Small browser experiments, made for this garden.</span></div><a className="ai-plot" href="https://manyaa.me/works/sakhi" target="_blank" rel="noopener noreferrer"><span className="ascii-voice" aria-hidden="true">{'..|.||..|||.||||.|||..||.|..'}</span><h3>When an idea<br /><em>finds its voice.</em></h3><p>Sakhi · Agentic AI & voice-led bookkeeping</p><span className="underlined">Explore human–AI collaboration <span aria-hidden="true">↗</span></span></a></div>;
}
