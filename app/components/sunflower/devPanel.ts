import GUI from 'lil-gui';
import { DEFAULT_PARAMS, type SunflowerParams, type SunflowerScene } from './scene';

/*
 * Development-only tweak panel for the sunflower. Loaded by SunflowerScroll under `next dev`
 * only, so neither this file nor lil-gui ships in the production export.
 * Tweaks persist in localStorage; “Copy changed values” puts the edits on the clipboard so they
 * can be pasted into DEFAULT_PARAMS in scene.ts.
 */

const STORE = 'sunflower:dev-params';
const OPEN = 'sunflower:dev-open';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function mountDevPanel(scene: SunflowerScene) {
  const P = scene.params;
  const saved = read<Partial<SunflowerParams>>(STORE);
  if (saved) for (const k of Object.keys(DEFAULT_PARAMS) as (keyof SunflowerParams)[]) if (k in saved) Object.assign(P, { [k]: saved[k] });

  const gui = new GUI({ title: 'Sunflower · dev', width: 280 });
  const el = gui.domElement;
  el.classList.add('sunflower-dev');
  Object.assign(el.style, { top: '84px', right: '16px', maxHeight: 'calc(100svh - 120px)', zIndex: '60' });

  const live = gui.addFolder('Live');
  const readout = {
    get bloom() {
      return Math.round(scene.bloomNow * 100) / 100;
    },
    get velocity() {
      return Math.round(scene.scrollVelocity * 100) / 100;
    },
  };
  live.add(readout, 'bloom').disable().listen();
  live.add(readout, 'velocity').name('scroll velocity').disable().listen();
  live.add(P, 'scrub').name('pin scroll position');
  live.add(P, 'scrubProgress', 0, 1, 0.001).name('position');
  live.add({ flick: () => scene.kick(1.4) }, 'flick').name('↓ Flick down');
  live.add({ flick: () => scene.kick(-1.4) }, 'flick').name('↑ Flick up');

  const bloom = gui.addFolder('Bloom');
  bloom.add(P, 'bloomStart', 0, 1, 0.01).name('openness at top');
  bloom.add(P, 'bloomEnd', 0.05, 0.8, 0.01).name('fully open at scroll');
  bloom.add(P, 'bloomStiffness', 2, 120, 1).name('spring stiffness');
  bloom.add(P, 'bloomDamping', 0.5, 30, 0.1).name('spring damping');

  const feel = gui.addFolder('Feel & sensitivity');
  feel.add(P, 'scrollSensitivity', 0, 3, 0.01).name('scroll sensitivity');
  feel.add(P, 'pointerSensitivity', 0, 3, 0.01).name('pointer sensitivity');
  feel.add(P, 'wind', 0, 3, 0.01).name('wind from motion');
  feel.add(P, 'flutter', 0, 4, 0.01).name('petal flutter');
  feel.add(P, 'breeze', 0, 4, 0.01).name('idle breeze');
  feel.add(P, 'headStiffness', 0.2, 3, 0.01).name('head stiffness');
  feel.add(P, 'headDamping', 0.2, 4, 0.01).name('head damping');
  feel.add(P, 'stemStiffness', 0.2, 3, 0.01).name('stem stiffness');
  feel.add(P, 'stemDamping', 0.2, 4, 0.01).name('stem damping');
  feel.add(P, 'petalStiffness', 0.2, 3, 0.01).name('petal stiffness');
  feel.add(P, 'petalDamping', 0.2, 4, 0.01).name('petal damping');
  feel.add(P, 'leafSway', 0, 4, 0.01).name('leaf sway');

  const look = gui.addFolder('Look');
  look.add(P, 'headSize', 0.6, 1.6, 0.01).name('head size');
  look.add(P, 'headTilt', -40, 40, 0.5).name('head tilt °');
  look.add(P, 'petalLength', 0.5, 1.8, 0.01).name('petal length');
  look.add(P, 'petalWidth', 0.5, 2, 0.01).name('petal width');
  look.add(P, 'petalArch', -1.5, 1.5, 0.01).name('petal arch');
  look.addColor(P, 'petalBase').name('petal base');
  look.addColor(P, 'petalMid').name('petal middle');
  look.addColor(P, 'petalTip').name('petal tip');
  look.addColor(P, 'stemColor').name('stem & leaves');

  const light = gui.addFolder('Light & camera');
  light.add(P, 'exposure', 0.4, 1.6, 0.01);
  light.add(P, 'keyLight', 0, 5, 0.01).name('key light');
  light.add(P, 'envLight', 0, 1.5, 0.01).name('ambient');
  light.add(P, 'shadow', 0, 0.6, 0.01).name('shadow on page');
  light.add(P, 'pollen');
  light.add(P, 'parallax', 0, 3, 0.01).name('pointer parallax');
  light.add(P, 'cameraFollow', 1, 30, 0.1).name('camera follow speed');

  // only edits are stored, so changing DEFAULT_PARAMS in code still takes effect
  const changed = (withDebug: boolean) =>
    Object.fromEntries(
      (Object.keys(DEFAULT_PARAMS) as (keyof SunflowerParams)[])
        .filter(k => (withDebug || (k !== 'scrub' && k !== 'scrubProgress')) && P[k] !== DEFAULT_PARAMS[k])
        .map(k => [k, P[k]]),
    );

  const actions = {
    copy: () => {
      const text = JSON.stringify(changed(false), null, 2);
      navigator.clipboard?.writeText(text).catch(() => {});
      console.info('[sunflower] changed params\n', text);
    },
    reset: () => {
      Object.assign(P, DEFAULT_PARAMS);
      gui.controllersRecursive().forEach(c => c.updateDisplay());
      write(STORE, {});
    },
  };
  gui.add(actions, 'copy').name('Copy changed values');
  gui.add(actions, 'reset').name('Reset to defaults');

  // feel and bloom are the usual suspects; the rest start folded
  for (const f of [live, look, light]) f.close();
  gui.onChange(() => write(STORE, changed(true)));
  gui.onOpenClose(g => g === gui && write(OPEN, !gui._closed));
  if (read<boolean>(OPEN) !== true) gui.close();

  return () => gui.destroy();
}
