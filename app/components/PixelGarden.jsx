'use client';

import { useEffect, useRef, useState } from 'react';
import { useMotionPaused } from './ScrollExperience';

export default function PixelGarden() {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const paused = useMotionPaused();
  const pausedRef = useRef(paused);
  const [status, setStatus] = useState('A tiny browser experiment, made for this garden.');
  useEffect(() => { pausedRef.current = paused; engineRef.current?.draw(); }, [paused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    const plants = [];
    const colors = ['#c47a64', '#d7b348', '#a3a8c3', '#b8c978', '#e5b6ba'];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1, height = 1, visible = false, frame = 0;
    const pixel = (x, y, size, color) => {
      context.fillStyle = color;
      context.fillRect(Math.round(x / 3) * 3, Math.round(y / 3) * 3, size, size);
    };
    function draw() {
      cancelAnimationFrame(frame);
      frame = 0;
      context.clearRect(0, 0, width, height);
      const ground = height - 22;
      for (let i = 0; i < width; i += 7) {
        const h = 6 + (Math.sin(i * 4.7) * .5 + .5) * 18;
        pixel(i, ground - h, 2, h > 16 ? '#8a9a64' : '#acb98a');
        context.fillStyle = '#80915f';
        context.fillRect(i, ground - h, 1, h);
      }
      let growing = false;
      plants.forEach(plant => {
        const t = pausedRef.current || reduced.matches ? 1 : Math.min(1, (performance.now() - plant.born) / 900);
        const eased = 1 - Math.pow(1 - t, 3);
        if (t < 1) growing = true;
        const x = plant.x * width, stemHeight = plant.height * eased, y = ground - stemHeight;
        for (let j = 0; j < stemHeight; j += 4) pixel(x + Math.sin(j * .025) * 5, ground - j, 3, '#627b48');
        if (eased > .45) for (let j = 0; j < 18; j += 3) {
          pixel(x - j * .6, ground - stemHeight * .45 - j, 5, '#819750');
          pixel(x + j * .6, ground - stemHeight * .65 - j, 4, '#718b49');
        }
        if (eased > .7) {
          const size = plant.size * ((eased - .7) / .3);
          for (let a = 0; a < 8; a++) {
            const angle = a * Math.PI / 4;
            pixel(x + Math.cos(angle) * size - 4, y + Math.sin(angle) * size - 4, 8, plant.color);
          }
          pixel(x - 4, y - 4, 8, '#70522c');
          pixel(x - 1, y - 3, 3, '#efda8a');
        }
      });
      if (growing && visible) frame = requestAnimationFrame(draw);
    }
    function resize() {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * ratio);
      canvas.height = Math.round(rect.height * ratio);
      width = rect.width; height = rect.height;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw();
    }
    function plant(x, initial = false) {
      if (plants.length >= 24) {
        setStatus('Your garden is in full bloom. Start afresh to grow another.');
        return;
      }
      plants.push({ x: Math.max(.06, Math.min(.94, x)), height: 55 + Math.random() * Math.max(60, height * .47), size: 10 + Math.random() * 9, color: colors[plants.length % colors.length], born: initial ? -1000 : performance.now() });
      if (!initial) setStatus(`${plants.length} little ${plants.length === 1 ? 'possibility' : 'possibilities'}, and room for more.`);
      draw();
    }
    engineRef.current = {
      draw,
      plant: x => plant(x),
      clear() { plants.length = 0; setStatus('A fresh start. What will you grow?'); draw(); },
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibilityObserver = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible) draw(); else { cancelAnimationFrame(frame); frame = 0; }
    }, { rootMargin: '100px' });
    visibilityObserver.observe(canvas);
    resize();
    [.12, .27, .46, .64, .81, .9].forEach(x => plant(x, true));
    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      engineRef.current = null;
    };
  }, []);

  function plantAtPointer(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    engineRef.current?.plant((event.clientX - rect.left) / rect.width);
  }
  return (
    <div className="seed-experiment">
      <div className="seed-top"><h3>A small space to grow.</h3><button id="clear-garden" className="quiet-button" onClick={() => engineRef.current?.clear()}>Start afresh ↺</button></div>
      <canvas ref={canvasRef} id="seed-canvas" role="img" onClick={plantAtPointer} aria-label="An interactive pixel garden. Use the Plant a seed button or tap the soil to add flowers." />
      <div className="seed-bottom">
        <p id="seed-status" aria-live="polite">{status}</p>
        <button id="plant-seed" className="pill-button" onClick={() => engineRef.current?.plant(.08 + Math.random() * .84)}>Plant a seed <span aria-hidden="true">+</span></button>
      </div>
    </div>
  );
}
