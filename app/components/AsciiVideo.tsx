'use client';

import { useEffect, useRef } from 'react';

/*
 * Plays a pre-cut clip as live ASCII. The source video is packed side by side: the left half
 * is the subject in greyscale (background already white), the right half its matte. Each
 * frame is sampled once per character cell; darker cells get denser glyphs, and cells outside
 * the matte are left as bare paper, so only the person is drawn.
 */

// light → dark; enough steps for faces and fabric, without the noisy heavy glyphs
const RAMP = " .,:;-=+icoxsa*%#&@";
const INK = [54, 95, 186]; // --color-blue
const DEEP = [28, 35, 51]; // --color-ink

export default function AsciiVideo({
  src,
  className = '',
  fontSize = 9,
  rows: rowCount,
  onEnd,
  label,
}: {
  src: string;
  className?: string;
  fontSize?: number;
  /** Size glyphs so this many lines fill the box's height (overrides fontSize). */
  rows?: number;
  onEnd?: () => void;
  label: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const video = videoRef.current!;
    const ctx = canvas.getContext('2d')!;
    const sampler = document.createElement('canvas');
    const sctx = sampler.getContext('2d', { willReadFrequently: true })!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cols = 1;
    let rows = 1;
    let cw = 1;
    let ch = 1;
    let fs = fontSize;
    let frame = 0;
    let done = false;

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // a fixed line count keeps the drawing cost the same on a laptop or a 4K screen
      fs = rowCount ? Math.max(6, r.height / rowCount / 1.05) : fontSize;
      cw = fs * 0.62;
      ch = fs * 1.05;
      cols = Math.max(1, Math.floor(r.width / cw));
      rows = Math.max(1, Math.floor(r.height / ch));
      sampler.width = cols * 2;
      sampler.height = rows;
      draw();
    };

    const draw = () => {
      if (video.readyState < 2) return;
      // the packed frame squeezes into a (2·cols × rows) grid: one pixel per character
      sctx.drawImage(video, 0, 0, cols * 2, rows);
      const px = sctx.getImageData(0, 0, cols * 2, rows).data;
      const r = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, r.width, r.height);
      ctx.font = `500 ${fs.toFixed(2)}px 'JetBrains Mono Variable', ui-monospace, monospace`;
      ctx.textBaseline = 'top';
      const last = RAMP.length - 1;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const m = px[(y * cols * 2 + cols + x) * 4] / 255;
          if (m < 0.35) continue;
          const lum = px[(y * cols * 2 + x) * 4] / 255;
          // a gentle curve keeps skin and highlights airy; only true shadows go dense
          const dark = Math.min(1, Math.max(0, Math.pow(1 - lum, 1.35) * 1.1));
          const c = RAMP[Math.max(1, Math.round(dark * last))];
          // deep shadows lean towards ink; everything else stays editorial blue
          const k = dark * dark * 0.6;
          const a = (0.35 + 0.65 * dark) * Math.min(1, (m - 0.35) / 0.4);
          ctx.fillStyle = `rgba(${Math.round(INK[0] + (DEEP[0] - INK[0]) * k)},${Math.round(INK[1] + (DEEP[1] - INK[1]) * k)},${Math.round(INK[2] + (DEEP[2] - INK[2]) * k)},${a.toFixed(3)})`;
          ctx.fillText(c, x * cw, y * ch);
        }
      }
    };

    const loop = () => {
      draw();
      if (!done) frame = requestAnimationFrame(loop);
    };
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      draw();
      endRef.current?.();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    const onReady = () => {
      if (reduced) {
        // one still frame (the thumbs up), no motion
        video.currentTime = Math.max(0, video.duration - 0.6);
        video.addEventListener('seeked', () => finish(), { once: true });
        return;
      }
      video.play().then(
        () => (frame = requestAnimationFrame(loop)),
        () => finish(),
      );
    };
    if (video.readyState >= 2) onReady();
    else video.addEventListener('loadeddata', onReady, { once: true });

    return () => {
      done = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      video.removeEventListener('ended', finish);
      video.removeEventListener('error', finish);
      video.pause();
    };
  }, [src, fontSize, rowCount]);

  return (
    <div className={`relative ${className}`}>
      <video ref={videoRef} src={src} muted playsInline preload="auto" className="pointer-events-none absolute size-px opacity-0" aria-hidden="true" />
      <canvas ref={canvasRef} role="img" aria-label={label} className="block size-full" />
    </div>
  );
}
