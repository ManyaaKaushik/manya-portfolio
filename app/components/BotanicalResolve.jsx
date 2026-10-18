'use client';

import { useEffect, useRef } from 'react';

/** One visual language: characters become pigment, then a botanical image. */
export default function BotanicalResolve({ src, alt, mode = 'flower' }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current, image = imageRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sample = document.createElement('canvas');
    const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
    const columns = 57, rows = 76;
    let pixels = null, visible = false, last = -1;
    const clamp = x => Math.min(1, Math.max(0, x));
    function ready() {
      sample.width = columns; sample.height = rows;
      sampleCtx.clearRect(0, 0, columns, rows);
      const fit = Math.min(columns / image.naturalWidth, rows / image.naturalHeight);
      const w = image.naturalWidth * fit, h = image.naturalHeight * fit;
      sampleCtx.drawImage(image, (columns - w) / 2, rows - h, w, h);
      pixels = sampleCtx.getImageData(0, 0, columns, rows).data;
      last = -1; paint();
    }
    function paint(event) {
      if (!visible || !pixels) return;
      const r = wrap.getBoundingClientRect();
      const quiet = event?.detail?.paused || matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('motion-off');
      const mobile = innerWidth <= 760;
      const parent = mode === 'seed' ? wrap.closest('.chapter') : null;
      const local = parent ? Number(getComputedStyle(parent).getPropertyValue('--local')) : clamp((innerHeight - r.top) / (innerHeight * .85));
      const p = quiet || mobile ? 1 : local;
      if (Math.abs(p - last) < .006 && canvas.width > 0) return;
      last = p;
      wrap.style.setProperty('--resolve', p.toFixed(3));
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(r.width * ratio); canvas.height = Math.round(r.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.clearRect(0, 0, r.width, r.height);
      if (mobile || quiet) return;
      if (p > .9 || p < .045) return;
      const grow = clamp((p - .05) / .55), real = clamp((p - .58) / .28);
      const cellX = r.width / columns, cellY = r.height / rows;
      const dithering = p > .37;
      ctx.font = `${Math.max(5, cellX * .95)}px monospace`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 1 - real;
      const chars = '.:;*+x#@';
      for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
        const i = (y * columns + x) * 4;
        const red = pixels[i], green = pixels[i + 1], blue = pixels[i + 2], alpha = pixels[i + 3];
        const light = (red + green + blue) / 765;
        if (alpha < 90 || light > .95 || y < rows * (1 - grow)) continue;
        const jitter = (1 - grow) * Math.sin(x * 7 + y * 3) * 7;
        ctx.fillStyle = dithering ? `rgb(${red},${green},${blue})` : '#55633a';
        if (dithering) ctx.fillRect(x * cellX + jitter, y * cellY, cellX * .7, cellY * .7);
        else ctx.fillText(chars[Math.min(7, Math.floor((1 - light) * 8))], x * cellX + jitter, y * cellY);
      }
    }
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) { last = -1; paint(); } }, { rootMargin: '100px' });
    observer.observe(wrap);
    image.addEventListener('load', ready);
    if (image.complete && image.naturalWidth) ready();
    const resize = () => { last = -1; paint(); };
    window.addEventListener('garden:tick', paint);
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); image.removeEventListener('load', ready); window.removeEventListener('garden:tick', paint); window.removeEventListener('resize', resize); };
  }, [src, mode]);
  return <div ref={wrapRef} className={'botanical-resolve resolve-' + mode}>
    <img ref={imageRef} className="resolved-image" src={src} alt={alt} decoding="async" />
    <canvas ref={canvasRef} aria-hidden="true" />
    {mode === 'seed' && <pre className="ascii-seed" aria-hidden="true">{'  .\n (:)\n  ˙'}</pre>}
  </div>;
}
