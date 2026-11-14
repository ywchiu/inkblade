import * as THREE from './vendor/three.module.js';
import { arcGeometry } from './ultimate3d.js';

// What the hero's newer moves show beyond the body and the blade trail: the ink crescent of 飛墨斬,
// the talisman ring of 敕令 · 鎮, and the ground shocks of 崩山斷 and 躍淵斬. The crescent is drawn
// where the simulation says its shot is (game.arts), so what is seen is what can hit; the ring is
// drawn at the radius the simulation strikes. Ground waves, pillars and dust are borrowed from the
// world's existing pools (world.ultimate, world.combatVFX) when it has them.

const VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const NOISE = 'float hash(float n){return fract(sin(n)*43758.5453);}float noise(float x){float i=floor(x),f=fract(x);return mix(hash(i),hash(i+1.),f*f*(3.-2.*f));}';
// Ink and light in one pass: rgb is added to the scene, alpha blots out what is behind it.
const INK = { transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
const LIGHT = { transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending };
const GOLD = '#ffc978';

// A crescent moon along uv.x: the leading edge (uv.y = 1) is the full arc and burns gold,
// the trailing edge is cut away toward both tips and frays into bristles.
const CRESCENT = `uniform float fade;uniform float seed;uniform vec3 glow;varying vec2 vUv;${NOISE}
void main(){float x=vUv.x,taper=pow(max(0.,sin(3.14159*x)),.7);
float v=(vUv.y-(1.-taper))/max(taper,.001);
float body=smoothstep(0.,.3,v+(noise(x*38.+seed)-.5)*.36)*step(.001,taper);
body*=1.-smoothstep(.35,.9,noise(vUv.y*23.+seed*3.)-x*.0+.1-v)*.5;
float rim=smoothstep(.72,.97,vUv.y)*taper;
float streak=.6+.4*noise(x*90.+seed*7.);
gl_FragColor=vec4(glow*(rim*rim*3.1+body*.16*streak)*fade,body*fade*.9);}`;
// A talisman ring on the ground: a hot rim at the strike radius, a turning dashed band inside it
// and eight broken bars pointing in at the planted blade.
const WARD = `uniform float alpha;uniform float time;uniform float burst;uniform vec3 tint;varying vec2 vUv;
void main(){vec2 p=vUv-.5;float r=length(p)*2.,a=atan(p.y,p.x);
float rims=smoothstep(.02,0.,abs(r-.97))*1.4+smoothstep(.008,0.,abs(r-.86))+smoothstep(.006,0.,abs(r-.3));
float dashes=step(.5,fract(a*6.3662+time*.6))*smoothstep(.018,0.,abs(r-.915)-.03);
float bars=step(.42,fract(a*1.2732-time*.15))*smoothstep(.012,0.,abs(fract(a*1.2732+.5)-.5)*r-.02)*step(.36,r)*step(r,.8);
float wash=(1.-smoothstep(0.,1.,r))*.1+burst*smoothstep(.55,.97,r)*.35;
float v=(rims+dashes*.8+bars*.6+wash)*alpha*(1.-step(1.,r));
gl_FragColor=vec4(tint*v*2.5,v);}`;

const shader = (fragmentShader, uniforms, base) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, ...base });
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
// Height the crescent flies at, and how wide it is drawn for a shot of the given radius.
const FLIGHT = 1.05, ARC = { radius: 1.5, width: .78, span: 1.42 };

function glyph(text) {
  // The character written at the centre of the ring. Outside a browser there is nothing to draw it on.
  try {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d'); c.clearRect(0, 0, 256, 256); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 200px "Noto Serif TC","Songti TC","PMingLiU",serif'; c.fillText(text, 128, 138);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace; return map;
  } catch { return null; }
}

export class HeroArts {
  constructor(scene) {
    this.scene = scene; this.group = new THREE.Group(); scene.add(this.group);
    const gold = () => ({ value: new THREE.Color(GOLD) });
    const arc = arcGeometry(ARC.radius, ARC.width, ARC.span, { segments: 40 });
    // Flat on the ground plane with the bulge leading, banked a little so it reads from the chase camera.
    this.crescents = Array.from({ length: 4 }, () => {
      const mesh = new THREE.Mesh(arc, shader(CRESCENT, { fade: { value: 0 }, seed: { value: 0 }, glow: gold() }, INK)), bank = new THREE.Group(), pivot = new THREE.Group();
      mesh.rotation.x = Math.PI / 2; mesh.renderOrder = 4; mesh.frustumCulled = false; bank.rotation.z = .3; bank.add(mesh); pivot.add(bank); pivot.visible = false; this.group.add(pivot);
      return { pivot, mesh, shot: null, age: 0, fade: 0, speed: 0, puff: 0 };
    });
    this.ward = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shader(WARD, { alpha: { value: 0 }, time: { value: 0 }, burst: { value: 0 }, tint: gold() }, LIGHT));
    this.ward.rotation.x = -Math.PI / 2; this.ward.position.y = .07; this.ward.visible = false; this.ward.renderOrder = 2; this.group.add(this.ward);
    const map = glyph('鎮');
    this.mark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map, color: GOLD, opacity: 0, ...LIGHT }));
    this.mark.rotation.x = -Math.PI / 2; this.mark.position.y = .09; this.mark.visible = false; this.mark.renderOrder = 3; this.group.add(this.mark);
    this.clock = 0; this.clear();
  }
  clear() {
    for (const c of this.crescents) { c.shot = null; c.fade = 0; c.age = 0; c.pivot.visible = false; c.mesh.material.uniforms.fade.value = 0; }
    this.sealing = null; this.wardAlpha = 0; this.burst = 0; this.markLife = 0; this.ward.visible = false; this.mark.visible = false; this.casts = 0; this.shocks = 0;
  }
  // One simulation event. `world` lends its shared pools; every use is optional so the module stands alone.
  emit(e, game, world = {}) {
    const p = game.player, fx = world.combatVFX, ult = world.ultimate, shake = v => { if (world.shake != null) world.shake = Math.max(world.shake, v); };
    if (e.type === 'swing' && e.art === 'seal') { this.sealing = { x: p.x, z: p.z, radius: 4.5, released: false }; this.casts++; return; }
    if (e.type === 'art-end') { for (let i = 0; i < 10; i++) fx?.smoke.emit(new THREE.Vector3(e.x, FLIGHT * (.6 + Math.random() * .6), e.z), new THREE.Vector3((Math.random() - .5) * 2 + Math.sin(e.yaw) * 2, .2 + Math.random() * .8, (Math.random() - .5) * 2 + Math.cos(e.yaw) * 2), i % 3 ? '#1b2a2e' : '#566a6c', .22 + Math.random() * .25, .3 + Math.random() * .3); return; }
    if (e.type !== 'art') return;
    const fwdX = Math.sin(e.yaw), fwdZ = Math.cos(e.yaw);
    if (e.art === 'inkWave') { this.casts++; fx?.dust(e.x + fwdX * .8, e.z + fwdZ * .8, 12, 1, fwdX * 2.4, fwdZ * 2.4); return; }
    this.shocks++;
    // The ring is drawn so its hot edge sits on the strike radius (the wave's rim rides at .88 of its size).
    ult?.wave(e.x, e.z, .5, e.radius / .88, e.art === 'seal' ? .58 : .42);
    if (e.art === 'crash') {
      const bx = e.x + fwdX * 1.5, bz = e.z + fwdZ * 1.5; fx?.dust(bx, bz, 26, 2.6); shake(.13);
      for (let i = 0; i < 5; i++) ult?.spike(bx, bz, e.yaw - Math.PI / 2 + (i - 2) * .34 + (Math.random() - .5) * .12, 1.5 + Math.random() * 1.3, .42 + Math.random() * .3, .5);
    } else if (e.art === 'leap') { fx?.dust(e.x, e.z, 36, 3.4); fx?.ring?.(e.x, e.z, e.radius, '#c9b68c'); shake(.15); }
    else if (e.art === 'seal') {
      const s = this.sealing ||= { x: e.x, z: e.z, radius: e.radius }; s.x = e.x; s.z = e.z; s.radius = e.radius; s.released = true; this.burst = 1; this.markLife = 1;
      fx?.dust(e.x, e.z, 46, 4.8); ult?.pillar(e.x + fwdX * .7, e.z + fwdZ * .7, .5, .6); shake(.22);
      for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, v = 5 + Math.random() * 4; fx?.sparks.emit(new THREE.Vector3(e.x + Math.sin(a) * .5, .25, e.z + Math.cos(a) * .5), new THREE.Vector3(Math.sin(a) * v, .8 + Math.random() * 2.6, Math.cos(a) * v), i % 3 ? '#ffd48a' : '#fff6dc', .05 + Math.random() * .06, .32 + Math.random() * .35); }
    }
  }
  // Called once per rendered frame with real time (0 when paused); `game` is null on the title screen.
  update(step, game, world = {}) {
    if (!game) { if (this.active()) this.clear(); return; }
    this.clock += step;
    const shots = game.arts || [], fx = world.combatVFX;
    for (const shot of shots) {
      let c = this.crescents.find(v => v.shot === shot.id);
      if (!c) { c = this.crescents.find(v => v.shot == null && v.fade <= 0) || this.crescents.reduce((a, b) => (a.fade < b.fade ? a : b)); c.shot = shot.id; c.age = 0; c.fade = 0; c.mesh.material.uniforms.seed.value = (shot.id * 7.31) % 40; }
      c.age += step; c.fade = Math.min(1, c.fade + step / .05); c.speed = shot.speed; c.yaw = shot.yaw;
      c.pivot.position.set(shot.x, FLIGHT, shot.z); c.pivot.rotation.y = shot.yaw; c.pivot.scale.setScalar(shot.radius / .85 * (1 + Math.min(.18, c.age * .3))); c.pivot.visible = true;
      // Ink shed along the flight, at blade height and along the ground under it.
      c.puff -= step; if (c.puff <= 0 && step > 0 && !game.hitStop) { c.puff = .03; for (let i = 0; i < 2; i++) fx?.smoke.emit(new THREE.Vector3(shot.x + (Math.random() - .5) * 1.3 * Math.cos(shot.yaw), FLIGHT + (Math.random() - .5) * .3, shot.z - (Math.random() - .5) * 1.3 * Math.sin(shot.yaw)), new THREE.Vector3(-Math.sin(shot.yaw) * 1.5, (Math.random() - .3) * .5, -Math.cos(shot.yaw) * 1.5), i ? '#16252a' : '#4d6164', .16 + Math.random() * .2, .2 + Math.random() * .22); fx?.dust(shot.x, shot.z, 1, .5); }
    }
    for (const c of this.crescents) {
      // A crescent whose shot is gone (spent, or out of range) drifts on a little and thins out.
      if (c.shot != null && !shots.some(s => s.id === c.shot)) c.shot = null;
      if (c.shot == null && c.fade > 0) { c.fade = Math.max(0, c.fade - step / .16); c.pivot.position.x += Math.sin(c.yaw) * c.speed * .35 * step; c.pivot.position.z += Math.cos(c.yaw) * c.speed * .35 * step; c.pivot.scale.multiplyScalar(1 + step * 1.6); c.pivot.visible = c.fade > 0; }
      c.mesh.material.uniforms.fade.value = c.fade;
    }
    // The ring gathers while the blade goes up, flares when it is planted, then lets go.
    const s = this.sealing, p = game.player; let want = 0;
    if (s && !s.released) { if (p.move === 'seal' && p.state === 'heavy') { const k = smooth((p.total - p.timer) / .55); want = .25 + .45 * k; s.x = p.x; s.z = p.z; this.ward.scale.setScalar(s.radius * (1.25 - .25 * k)); } else this.sealing = null; }
    else if (s) { want = this.burst > .02 ? 1 : 0; this.ward.scale.setScalar(s.radius * (1 + (1 - this.burst) * .06)); if (this.burst <= .02 && this.wardAlpha < .01) this.sealing = null; }
    this.burst = Math.max(0, this.burst - step / .75); this.wardAlpha += (want - this.wardAlpha) * (1 - Math.exp(-step * (want > this.wardAlpha ? 20 : 5)));
    this.ward.visible = this.wardAlpha > .01; if (s) this.ward.position.set(s.x, .07, s.z);
    const u = this.ward.material.uniforms; u.alpha.value = this.wardAlpha; u.time.value = this.clock; u.burst.value = this.burst;
    this.markLife = Math.max(0, this.markLife - step / 1.1); this.mark.visible = this.markLife > 0 && !!this.mark.material.map;
    if (this.mark.visible && s) { const k = 1 - this.markLife; this.mark.position.set(s.x, .09, s.z); this.mark.rotation.z = world.camera ? Math.atan2(world.camera.position.x - s.x, world.camera.position.z - s.z) : 0; this.mark.scale.setScalar(2.4 + k * .5); this.mark.material.opacity = smooth(k / .08) * (1 - smooth((k - .45) / .55)); this.mark.material.color.set(GOLD).multiplyScalar(1.8); }
  }
  active() { return this.crescents.some(c => c.fade > 0 || c.shot != null) || !!this.sealing || this.wardAlpha > .01 || this.markLife > 0; }
  snapshot() { return { crescents: this.crescents.filter(c => c.pivot.visible).length, flying: this.crescents.filter(c => c.shot != null).length, ward: +this.wardAlpha.toFixed(3), wardRadius: this.ward.visible ? +this.ward.scale.x.toFixed(2) : 0, mark: this.mark.visible, casts: this.casts, shocks: this.shocks, positions: this.crescents.filter(c => c.pivot.visible).map(c => c.pivot.position.toArray().map(v => +v.toFixed(2))) }; }
}
