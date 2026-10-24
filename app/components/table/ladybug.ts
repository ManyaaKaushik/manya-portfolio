import * as THREE from 'three';
import { withSun } from './light';
import { clamp, damp, rng } from './util';
import type { TableWorld } from './world';

/*
 * A ladybug who lives on the table. She wanders about whatever's on screen while the sun is up,
 * stops now and then, and scurries off if the pointer comes too close. When the camera moves to
 * another chapter she walks in from the edge, and at dusk she tucks herself away.
 */

const HEIGHT = 0.42; // just above the stacked paper
const WALK = 2.6; // cm/s
const RUN = 11;

export class Ladybug {
  readonly group = new THREE.Group();
  private body = new THREE.Group();
  private x = 26;
  private z = 18;
  private heading = 2.3;
  private turn = 0;
  private speed = 0;
  private pause = 1.5;
  private walkFor = 4;
  private fleeFor = 0;
  private gait = 0;
  private shown = 0;
  private found = false;
  private rand = rng(77);
  private ray = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private hit = new THREE.Vector3();

  constructor(world: TableWorld) {
    const shell = withSun(new THREE.MeshStandardMaterial({ color: '#c8281c', roughness: 0.22, metalness: 0.05 }), 'ladybug');
    const black = withSun(new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.45 }), 'ladybug-dark');
    const white = new THREE.MeshBasicMaterial({ color: '#f4efe4' });

    // the shell: a dome, a seam down the middle, seven spots
    const R = 0.5;
    const S = new THREE.Vector3(0.92, 0.62, 1.1);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), shell);
    dome.scale.copy(S);
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, R * 2 * S.z * 0.86), black);
    seam.position.set(0, R * S.y - 0.003, 0.06);
    this.body.add(dome, seam);
    const spot = new THREE.CircleGeometry(1, 14);
    const spots: [number, number, number][] = [
      // azimuth (0 = forward), polar from the top, size
      [0.55, 0.8, 0.12],
      [-0.55, 0.8, 0.12],
      [1.6, 0.95, 0.11],
      [-1.6, 0.95, 0.11],
      [2.45, 0.75, 0.1],
      [-2.45, 0.75, 0.1],
      [Math.PI, 0.45, 0.09],
    ];
    for (const [az, pol, size] of spots) {
      const n = new THREE.Vector3(Math.sin(pol) * Math.sin(az), Math.cos(pol), -Math.sin(pol) * Math.cos(az));
      const p = new THREE.Vector3(n.x * R * S.x, n.y * R * S.y, n.z * R * S.z);
      // the ellipsoid's normal, so the spot lies flat on the shell
      const normal = new THREE.Vector3(n.x / S.x, n.y / S.y, n.z / S.z).normalize();
      const m = new THREE.Mesh(spot, black);
      m.scale.setScalar(size);
      m.position.copy(p).addScaledVector(normal, 0.004);
      m.lookAt(m.position.clone().add(normal));
      this.body.add(m);
    }
    // head, with the two pale cheek marks ladybugs have
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), black);
    head.scale.set(1.15, 0.8, 0.8);
    head.position.set(0, 0, -R * S.z + 0.02);
    this.body.add(head);
    for (const side of [-1, 1]) {
      const cheek = new THREE.Mesh(spot, white);
      cheek.scale.setScalar(0.055);
      cheek.rotation.x = -Math.PI / 2;
      cheek.position.set(side * 0.13, 0.17, -R * S.z - 0.06);
      this.body.add(cheek);
    }
    this.body.traverse(o => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    this.body.scale.setScalar(1.15);
    this.group.add(this.body);
    this.group.position.set(this.x, HEIGHT, this.z);
    world.scene.add(this.group);

    world.hotspots.push({
      object: this.body,
      cursor: 'pointer',
      onEnter: () => (this.fleeFor = Math.max(this.fleeFor, 0.2)),
      onClick: () => {
        this.scurry(this.heading + (this.rand() - 0.5) * 2);
        if (!this.found) world.onToast?.('You found the ladybug. That’s good luck ✿');
        this.found = true;
      },
    });
  }

  private scurry(heading: number) {
    this.heading = heading;
    this.fleeFor = 1.3;
    this.pause = 0;
  }

  update(dt: number, world: TableWorld) {
    const awake = world.daylight > 0.3 && !world.reduced;
    this.shown = damp(this.shown, awake ? 1 : 0, 4, dt);
    this.group.visible = this.shown > 0.01;
    if (!this.group.visible) return;
    this.group.scale.setScalar(this.shown);
    if (!awake) return;

    const v = world.view;
    const hw = v.w / 2;
    const hh = v.h / 2;
    // left far behind by the camera: walk back in from the nearest edge
    if (Math.abs(this.x - v.x) > hw + 8 || Math.abs(this.z - v.z) > hh + 8) {
      const side = Math.floor(this.rand() * 4);
      const along = (this.rand() - 0.5) * 1.4;
      this.x = v.x + (side < 2 ? (side ? hw + 1.5 : -hw - 1.5) : along * hw);
      this.z = v.z + (side < 2 ? along * hh : side === 2 ? hh + 1.5 : -hh - 1.5);
      this.heading = Math.atan2(-(v.x - this.x), -(v.z - this.z)) + (this.rand() - 0.5) * 0.6;
      this.pause = 0;
      this.walkFor = 6;
    }

    // keep away from the pointer
    if (performance.now() - world.pointerAt < 1500) {
      this.ray.setFromCamera(world.pointer, world.camera);
      if (this.ray.ray.intersectPlane(this.plane, this.hit)) {
        const dx = this.x - this.hit.x;
        const dz = this.z - this.hit.z;
        const near = Math.max(4.5, v.h * 0.06);
        if (dx * dx + dz * dz < near * near && this.fleeFor < 0.5) this.scurry(Math.atan2(-dx, -dz));
      }
    }

    if (this.fleeFor > 0) {
      this.fleeFor -= dt;
      this.speed = damp(this.speed, RUN, 10, dt);
    } else if (this.pause > 0) {
      this.pause -= dt;
      this.speed = damp(this.speed, 0, 8, dt);
      if (this.pause <= 0) this.walkFor = 3 + this.rand() * 6;
    } else {
      this.walkFor -= dt;
      this.speed = damp(this.speed, WALK, 4, dt);
      // a wandering line, and back towards the middle of the view when near an edge
      this.turn = damp(this.turn, (this.rand() - 0.5) * 3, 1.5, dt);
      this.heading += this.turn * dt;
      const ex = (this.x - v.x) / (hw - 3);
      const ez = (this.z - v.z) / (hh - 3);
      if (Math.max(Math.abs(ex), Math.abs(ez)) > 0.85) {
        const home = Math.atan2(-(v.x - this.x), -(v.z - this.z));
        this.heading += Math.atan2(Math.sin(home - this.heading), Math.cos(home - this.heading)) * clamp(dt * 2.5);
      }
      if (this.walkFor <= 0) this.pause = 0.8 + this.rand() * 2.6;
    }

    this.x += -Math.sin(this.heading) * this.speed * dt;
    this.z += -Math.cos(this.heading) * this.speed * dt;
    this.gait += this.speed * dt * 9;
    this.group.position.set(this.x, HEIGHT, this.z);
    const r = this.group.rotation;
    r.y += Math.atan2(Math.sin(this.heading - r.y), Math.cos(this.heading - r.y)) * (1 - Math.exp(-14 * dt));
    this.body.rotation.z = Math.sin(this.gait) * 0.05 * clamp(this.speed / WALK);
    if (this.speed > 0.2) world.kick();
  }
}
