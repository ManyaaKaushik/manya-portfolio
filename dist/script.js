const $ = (selector) => document.querySelector(selector);
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
let paused = reduced.matches;
try { paused = paused || localStorage.getItem('manya-motion') === 'paused'; } catch {}
const motionButton = $('#motion-toggle');
function setMotion(value) {
  paused = value;
  document.body.classList.toggle('motion-off', paused);
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.setAttribute('aria-label', paused ? 'Enable scroll animation' : 'Pause scroll animation');
  motionButton.querySelector('span').textContent = paused ? '▷' : 'Ⅱ';
  motionButton.querySelector('.motion-label').textContent = paused ? 'Enable motion' : 'Pause motion';
  try { localStorage.setItem('manya-motion', paused ? 'paused' : 'enabled'); } catch {}
  requestTick();
}
motionButton.addEventListener('click', () => setMotion(!paused));
reduced.addEventListener('change', event => setMotion(event.matches));
const progress = $('.reading-progress');
const hero = $('.hero');
const heroCopy = $('.hero-copy');
const portrait = $('.portrait');
const leftLeaves = $('.canopy-left');
const rightLeaves = $('.canopy-right');
const heroFlowers = $('.hero-flowers');
let ticking = false;
function updateScroll() {
  const scroll = window.scrollY;
  const total = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = `scaleX(${total > 0 ? scroll / total : 0})`;
  if (!paused && !reduced.matches) {
    const ratio = Math.min(1, Math.max(0, scroll / Math.max(1, hero.offsetHeight - window.innerHeight)));
    heroCopy.style.transform = `translate3d(0,${ratio * -100}px,0)`;
    heroCopy.style.opacity = String(1 - ratio * .65);
    portrait.style.transform = `translate3d(0,${ratio * -40}px,0) rotate(${ratio * -3}deg)`;
    leftLeaves.style.transform = `translate3d(${-ratio * 20}px,${-ratio * 90}px,0) rotate(${-ratio * 7}deg)`;
    rightLeaves.style.transform = `translate3d(${ratio * 20}px,${-ratio * 70}px,0) rotate(${ratio * 7}deg)`;
    heroFlowers.style.transform = `translate3d(0,${ratio * -35}px,0) scale(${1 + ratio * .18})`;
  }
  ticking = false;
}
function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(updateScroll); } }
window.addEventListener('scroll', requestTick, { passive: true });
window.addEventListener('resize', requestTick);
setMotion(paused);
const storyObserver = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('active', entry.isIntersecting)), { rootMargin: '-20% 0px -25% 0px', threshold: .15 });
document.querySelectorAll('.story article').forEach(article => storyObserver.observe(article));
const sectionObserver = new IntersectionObserver(entries => entries.forEach(entry => {
  const link = document.querySelector(`.header nav a[href="#${entry.target.id}"]`);
  if (link) entry.isIntersecting ? link.setAttribute('aria-current', 'location') : link.removeAttribute('aria-current');
}), { rootMargin: '-20% 0px -50% 0px' });
document.querySelectorAll('section[id]').forEach(section => sectionObserver.observe(section));
const testimonials = [
  ['Manya has a great mix of strategy and design sense. She made it easy for us to turn complex ideas into something clear and scalable.', 'Anshumali Jain', 'Ex-Google, Founder, Celebto'],
  ['Manya stands out for her dedication, optimism, and thoughtful creativity. She’s professional yet approachable, making collaboration effortless and enjoyable. Dependable and curious, she brings clarity, care, and great energy to every project.', 'Aastha Lathia', 'Co-worker, IIT Delhi'],
  ['She instantly understood what the project needed and delivered exactly what we had in mind — reliable, clear, and a joy to work with.', 'Gaurav Giri', 'Client, Freelance']
];
let quoteIndex = 0;
function showQuote(step) {
  quoteIndex = (quoteIndex + step + testimonials.length) % testimonials.length;
  const [text, name, role] = testimonials[quoteIndex];
  $('#quote-text').textContent = `“${text}”`;
  $('#quote-name').textContent = name;
  $('#quote-role').textContent = role;
  $('#quote-counter').textContent = `${quoteIndex + 1} / ${testimonials.length}`;
}
$('#quote-prev').addEventListener('click', () => showQuote(-1));
$('#quote-next').addEventListener('click', () => showQuote(1));
$('#year').textContent = new Date().getFullYear();
// A lightweight, original pixel garden. Animation runs only while visible.
const canvas = $('#seed-canvas');
const context = canvas.getContext('2d');
const plants = [];
let canvasWidth = 1, canvasHeight = 1, gardenVisible = false, gardenFrame = 0;
const colors = ['#c47a64', '#d7b348', '#a3a8c3', '#b8c978', '#e5b6ba'];
function resizeGarden() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  canvasWidth = rect.width; canvasHeight = rect.height;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawGarden();
}
function pixel(x,y,size,color) { context.fillStyle=color; context.fillRect(Math.round(x/3)*3, Math.round(y/3)*3,size,size); }
function drawGarden() {
  context.clearRect(0,0,canvasWidth,canvasHeight);
  const ground = canvasHeight - 22;
  for(let i=0;i<canvasWidth;i+=7) {
    const h=6+(Math.sin(i*4.7)*.5+.5)*18;
    pixel(i,ground-h,2,h>16?'#8a9a64':'#acb98a');
    context.fillStyle='#80915f';context.fillRect(i,ground-h,1,h);
  }
  let growing = false;
  plants.forEach(plant => {
    const elapsed = performance.now()-plant.born;
    const t = paused || reduced.matches ? 1 : Math.min(1,elapsed/900);
    const eased = 1-Math.pow(1-t,3);
    if(t<1)growing=true;
    const x=plant.x*canvasWidth, height=plant.height*eased, y=ground-height;
    for(let j=0;j<height;j+=4)pixel(x+Math.sin(j*.025)*5,ground-j,3,'#627b48');
    if(eased>.45){for(let j=0;j<18;j+=3){pixel(x-j*.6,ground-height*.45-j,5,'#819750');pixel(x+j*.6,ground-height*.65-j,4,'#718b49');}}
    if(eased>.7){const size=plant.size*((eased-.7)/.3);for(let a=0;a<8;a++){const angle=a*Math.PI/4;pixel(x+Math.cos(angle)*size-4,y+Math.sin(angle)*size-4,8,plant.color);}pixel(x-4,y-4,8,'#70522c');pixel(x-1,y-3,3,'#efda8a');}
  });
  if(growing&&gardenVisible)gardenFrame=requestAnimationFrame(drawGarden);else gardenFrame=0;
}
function plant(x,initial=false) {
  if(plants.length>=24){$('#seed-status').textContent='Your garden is in full bloom. Start afresh to grow another.';return;}
  plants.push({x:Math.max(.06,Math.min(.94,x)),height:55+Math.random()*Math.max(60,canvasHeight*.47),size:10+Math.random()*9,color:colors[plants.length%colors.length],born:initial?0:performance.now()});
  if(!initial)$('#seed-status').textContent=`${plants.length} little ${plants.length===1?'possibility':'possibilities'}, and room for more.`;
  if(!gardenFrame)drawGarden();
}
$('#plant-seed').addEventListener('click',()=>plant(.08+Math.random()*.84));
canvas.addEventListener('click',event=>plant((event.clientX-canvas.getBoundingClientRect().left)/canvasWidth));
$('#clear-garden').addEventListener('click',()=>{plants.length=0;$('#seed-status').textContent='A fresh start. What will you grow?';drawGarden();});
new ResizeObserver(resizeGarden).observe(canvas);
new IntersectionObserver(entries=>{gardenVisible=entries[0].isIntersecting;if(gardenVisible&&!gardenFrame)drawGarden();else if(!gardenVisible&&gardenFrame){cancelAnimationFrame(gardenFrame);gardenFrame=0;}},{rootMargin:'100px'}).observe(canvas);
resizeGarden();[.12,.27,.46,.64,.81,.9].forEach(x=>plant(x,true));
