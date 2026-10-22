import * as THREE from 'three';
import { stationZ } from '../stations';
import { keyed } from './work';
import type { Chapter, TableWorld, View } from '../world';

/*
 * Night, then dawn. The camera leans back and drifts up the table over the whole day, moonlit,
 * while the night passes; at first light it comes down where the morning began, and the scroll
 * loops round to the top without a seam.
 */

export class Outro implements Chapter {
  readonly id = 'outro' as const;
  readonly group = new THREE.Group();
  private world: TableWorld | null = null;

  async build(world: TableWorld) {
    this.world = world;
  }

  view(u: number, aspect: number): View {
    const portrait = aspect < 0.8;
    const w = this.world;
    const from = w?.chapter('contact')?.view(1, aspect) ?? { x: 0, z: stationZ('contact', portrait), w: 70, h: 50 };
    const to = w?.chapter('hero')?.view(0, aspect) ?? { x: 0, z: 0, w: 100, h: 60 };
    // lean back, then drift up the table over the whole day, then come down at first light
    const high = portrait ? 120 : 150;
    const upA: View = { x: from.x * 0.5, z: from.z - high * 0.15, w: high * (portrait ? 0.55 : 1.6), h: high };
    const upB: View = { x: to.x, z: to.z + high * 0.2, w: upA.w, h: high };
    // one unbroken glide through the four, never pausing at the top (zoom on a log scale, so the pull-back feels even)
    const at = [0, 0.22, 0.8, 1];
    const path = [from, upA, upB, to];
    const curve = (get: (v: View) => number) => keyed(u, path.map((v, i) => [at[i], get(v)] as [number, number]));
    return { x: curve(v => v.x), z: curve(v => v.z), w: Math.exp(curve(v => Math.log(v.w))), h: Math.exp(curve(v => Math.log(v.h))) };
  }

  update() {}
}

