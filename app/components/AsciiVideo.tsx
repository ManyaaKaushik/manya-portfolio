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
  endLead = 0,
  label,
}: {
  src: string;
  className?: string;
  fontSize?: number;
  /** Size glyphs so this many lines fill the box's height (overrides fontSize). */
  rows?: number;
  onEnd?: () => void;
  /** Call onEnd this many seconds before the clip finishes; it keeps drawing to the last frame. */
  endLead?: number;
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
    let w = 1;
    let h = 1;
    let dpr = 1;
    let frame = 0;
    let vfc = 0;
    let done = false;
    // every glyph pre-drawn once in its own colour; frames stamp them instead of shaping text
    const atlas = document.createElement('canvas');
    const actx = atlas.getContext('2d')!;
    const hasVfc = 'requestVideoFrameCallback' in video;
    let told = false;
    const tell = () => {
      if (told) return;
      told = true;
      endRef.current?.();
    };

    const buildAtlas = () => {
      const gw = Math.ceil(cw * dpr);
      const gh = Math.ceil(ch * dpr);
      atlas.width = gw * RAMP.length;
      atlas.height = gh;
      actx.setTransform(dpr, 0, 0, dpr, 0, 0);
      actx.font = `500 ${fs.toFixed(2)}px 'JetBrains Mono Variable', ui-monospace, monospace`;
      actx.textBaseline = 'top';
      const last = RAMP.length - 1;
      for (let i = 1; i <= last; i++) {
        // deep shadows lean towards ink; everything else stays editorial blue
        const k = (i / last) ** 2 * 0.6;
        actx.fillStyle = `rgb(${INK.map((c, j) => Math.round(c + (DEEP[j] - c) * k)).join(',')})`;
        actx.fillText(RAMP[i], (i * gw) / dpr, 0);
      }
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // a fixed line count keeps the drawing cost the same on a laptop or a 4K screen
      fs = rowCount ? Math.max(6, h / rowCount / 1.05) : fontSize;
      cw = fs * 0.62;
      ch = fs * 1.05;
      cols = Math.max(1, Math.floor(w / cw));
      rows = Math.max(1, Math.floor(h / ch));
      sampler.width = cols * 2;
      sampler.height = rows;
      buildAtlas();
      draw();
    };

    const draw = () => {
      if (video.readyState < 2) return;
      // the packed frame squeezes into a (2·cols × rows) grid: one pixel per character
      sctx.drawImage(video, 0, 0, cols * 2, rows);
      const px = sctx.getImageData(0, 0, cols * 2, rows).data;
      ctx.clearRect(0, 0, w, h);
      const last = RAMP.length - 1;
      const gw = Math.ceil(cw * dpr);
      const gh = Math.ceil(ch * dpr);
      const dw = gw / dpr;
      const dh = gh / dpr;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const m = px[(y * cols * 2 + cols + x) * 4] / 255;
          if (m < 0.35) continue;
          const lum = px[(y * cols * 2 + x) * 4] / 255;
          // a gentle curve keeps skin and highlights airy; only true shadows go dense
          const dark = Math.min(1, Math.max(0, Math.pow(1 - lum, 1.35) * 1.1));
          const g = Math.max(1, Math.round(dark * last));
          ctx.globalAlpha = (0.35 + 0.65 * dark) * Math.min(1, (m - 0.35) / 0.4);
          ctx.drawImage(atlas, g * gw, 0, gw, gh, x * cw, y * ch, dw, dh);
        }
      }
      ctx.globalAlpha = 1;
    };

    // redraw only when the clip has a new frame (≈30fps), not on every display refresh
    const loop = () => {
      draw();
      if (endLead && video.duration - video.currentTime <= endLead) tell();
      if (done) return;
      if (hasVfc) vfc = video.requestVideoFrameCallback(loop);
      else frame = requestAnimationFrame(loop);
    };
    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      if (hasVfc) video.cancelVideoFrameCallback(vfc);
      draw();
      tell();
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
    // glyphs drawn before the mono face arrived would be the fallback font
    document.fonts.ready.then(() => !done && (buildAtlas(), draw()));

    return () => {
      done = true;
      cancelAnimationFrame(frame);
      if (hasVfc) video.cancelVideoFrameCallback(vfc);
      ro.disconnect();
      video.removeEventListener('ended', finish);
      video.removeEventListener('error', finish);
      video.pause();
    };
  }, [src, fontSize, rowCount, endLead]);

  return (
    <div className={`relative ${className}`}>
      <video ref={videoRef} src={src} muted playsInline preload="auto" className="pointer-events-none absolute size-px opacity-0" aria-hidden="true" />
      <canvas ref={canvasRef} role="img" aria-label={label} className="block size-full" />
    </div>
  );
}
