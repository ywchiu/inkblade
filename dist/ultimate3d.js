import * as THREE from './vendor/three.module.js';

// 墨破山河. Everything the ultimate shows beyond the hero's own animation: the close-up while
// ink gathers, the whirl of the flurry and the cuts that land. It follows the combat timeline
// (game.ultimate()), so stopped time and hit-stop keep picture and damage together; the
// pieces already in the air run on real time so a hit-stop never freezes them mid-frame.

const VERT = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const NOISE = 'float hash(float n){return fract(sin(n)*43758.5453);}float noise(float x){float i=floor(x),f=fract(x);return mix(hash(i),hash(i+1.),f*f*(3.-2.*f));}';
// Ink and light in one pass: rgb is added to the scene, alpha blots out what is behind it.
const INK = { transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
const LIGHT = { transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: THREE.AdditiveBlending };
const GOLD = '#ffc978';

// A brush stroke along uv.x: full in the middle, tapering to both ends, bristles parting toward the tail.
const STROKE = `uniform float reveal;uniform float fade;uniform float seed;uniform float ink;uniform vec3 glow;varying vec2 vUv;${NOISE}
void main(){float x=vUv.x,y=abs(vUv.y*2.-1.);
float width=pow(max(0.,sin(3.14159*x)),.6)*(.6+.4*noise(x*7.+seed));
float body=1.-smoothstep(width*.6,width,y+(noise(x*46.+seed*3.)-.5)*.16);
body*=1.-smoothstep(.45,.95,noise(vUv.y*31.+seed*5.)+x*.75-.35)*.8;
float wipe=1.-smoothstep(reveal-.1,reveal,x);
float core=(1.-smoothstep(0.,width*.3+.001,y))*wipe;
float lead=smoothstep(reveal-.22,reveal,x)*wipe*body;
float ember=body*wipe*(1.-smoothstep(width*.2,width*.95,y))*fade;
gl_FragColor=vec4(glow*(core*core*2.6*fade+lead*3.2)+vec3(1.,.36,.12)*ember*.55,body*wipe*fade*ink);}`;
// A talisman circle on the ground: two rims, a turning dashed band and broken inner bars.
const SEAL = `uniform float alpha;uniform float time;uniform vec3 tint;varying vec2 vUv;
void main(){vec2 p=vUv-.5;float r=length(p)*2.,a=atan(p.y,p.x);
float rims=smoothstep(.014,0.,abs(r-.96))+smoothstep(.009,0.,abs(r-.8))+smoothstep(.007,0.,abs(r-.44));
float dashes=step(.5,fract(a*5.7296+time*.5))*smoothstep(.02,0.,abs(r-.88)-.04);
float bars=step(.34,fract(-a*1.2732+time*.22))*smoothstep(.02,0.,abs(r-.62)-.07)*step(.3,fract(r*14.));
float v=(rims+dashes*.8+bars*.7+(1.-smoothstep(0.,1.,r))*.1)*alpha*(1.-step(1.,r));
gl_FragColor=vec4(tint*v*2.4,v);}`;
// An ink wave racing outward along the ground behind a hot rim.
const WAVE = `uniform float fade;uniform float seed;uniform vec3 glow;varying vec2 vUv;${NOISE}
void main(){vec2 p=vUv-.5;float r=length(p)*2.,a=atan(p.y,p.x);
float edge=.88+.07*noise(a*9.+seed)+.03*noise(a*31.+seed*2.);
float body=smoothstep(edge-.36,edge-.02,r)*(1.-smoothstep(edge,edge+.02,r));
gl_FragColor=vec4(glow*smoothstep(.05,0.,abs(r-edge))*2.8*fade,body*(.5+.5*noise(a*70.+seed*4.))*fade*.86);}`;
const PILLAR = `uniform float fade;uniform float time;uniform vec3 tint;varying vec2 vUv;${NOISE}
void main(){float streak=.4+.6*noise(vUv.x*60.+time*3.)*noise(vUv.x*17.-time*5.+vUv.y*3.);
float v=pow(1.-vUv.y,1.3)*streak*fade;gl_FragColor=vec4(mix(tint,vec3(1.),pow(1.-vUv.y,4.)*.7)*v*5.,v);}`;
// Motes spiral in toward the blade, slow at first and fastest as they arrive.
const MOTES_VERT = `attribute vec3 offset;attribute float phase;uniform vec3 target;uniform float time;uniform float power;varying float vAlpha;
void main(){float k=fract(phase+time*(.5+.45*fract(phase*7.3))),d=1.-k*k,ang=k*k*2.8,c=cos(ang),s=sin(ang);
vec3 o=vec3(offset.x*c-offset.z*s,offset.y,offset.x*s+offset.z*c)*d;vec4 mv=modelViewMatrix*vec4(target+o,1.);
gl_PointSize=clamp((.02+.065*k)*620./max(.4,-mv.z),1.5,40.);vAlpha=smoothstep(0.,.2,k)*(1.-smoothstep(.88,1.,k))*power;gl_Position=projectionMatrix*mv;}`;
const MOTES_FRAG = 'uniform vec3 tint;varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.,f=pow(max(0.,1.-r*r),2.)*vAlpha;if(f<.01)discard;gl_FragColor=vec4(mix(tint,vec3(1.),f*.45)*f*4.2,f);}';

const shader = (fragmentShader, uniforms, base) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader, uniforms, ...base });
const smooth = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// A band along a circle, uv.x running around it. The middle of the band passes through the
// origin unless `centred`, so a slash can be placed on what it cuts and a ring on who it circles.
export function arcGeometry(radius, width, span, { centred = false, segments = 48 } = {}) {
  const position = [], uv = [], index = [];
  for (let i = 0; i <= segments; i++) {
    const u = i / segments, a = (u - .5) * span;
    for (const v of [0, 1]) { const r = radius + (v - .5) * width; position.push(Math.sin(a) * r, Math.cos(a) * r - (centred ? 0 : radius), 0); uv.push(u, v); }
    if (i < segments) { const k = i * 2; index.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(index);
  return geometry;
}

// Where the camera sits while ink gathers, in two shots. First the face: off one shoulder, low,
// drifting in. Then, as the blade goes up, a cut to the other side and down near the ground,
// looking up the whole figure to the sword. `k` is how far the gathering has gone (0..1),
// `side` which shoulder the first shot takes (±1).
export const SECOND_SHOT = .58;
export function closeUp(hero, head, k, side, portrait = false) {
  const fx = Math.sin(hero.yaw), fz = Math.cos(hero.yaw), rx = Math.cos(hero.yaw), rz = -Math.sin(hero.yaw);
  const from = (angle, distance) => { const dx = fx * Math.cos(angle) + rx * Math.sin(angle), dz = fz * Math.cos(angle) + rz * Math.sin(angle); return { dx, dz, x: hero.x + dx * distance, z: hero.z + dz * distance }; };
  if (k < SECOND_SHOT) {
    const u = k / SECOND_SHOT, at = from(side * (1 - .3 * u), (portrait ? 3 : 2.55) - .7 * u);
    // Frame the face left of centre; the move's name is written down the right of the screen.
    const shift = portrait ? 0 : .24;
    return { position: new THREE.Vector3(at.x, head.y - .5 + .2 * u, at.z), look: new THREE.Vector3(head.x + at.dz * shift, head.y + .02, head.z - at.dx * shift), fov: (portrait ? 44 : 31) - 4 * u };
  }
  const u = (k - SECOND_SHOT) / (1 - SECOND_SHOT), at = from(-side * (.5 - .12 * u), (portrait ? 4.2 : 3.15) - .45 * u), shift = portrait ? 0 : .42;
  return { position: new THREE.Vector3(at.x, .42 + .1 * u, at.z), look: new THREE.Vector3(hero.x + at.dz * shift, head.y + .4, hero.z - at.dx * shift), fov: (portrait ? 58 : 44) - 3 * u };
}

const SLASH_ROLLS = [-.62, .7, -1.25, .22];

export class UltimateFX {
  constructor(scene, { mobile = false } = {}) {
    this.scene = scene; this.group = new THREE.Group(); scene.add(this.group);
    const gold = () => ({ value: new THREE.Color(GOLD) });
    // Blade glow: two crossed cards along the blade, riding on the sword itself.
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 128;
    const c = canvas.getContext('2d'), image = c.createImageData(32, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 32; x++) { const u = (x + .5) / 32 * 2 - 1, v = (y + .5) / 128, a = Math.exp(-u * u * 16) * Math.pow(Math.sin(Math.PI * v), .45); image.data.set([255, 255, 255, a * 255], (y * 32 + x) * 4); }
    c.putImageData(image, 0, 0);
    this.bladeMaterial = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), color: GOLD, opacity: 0, ...LIGHT });
    // A shaft of light that carries the raised blade on into the sky: brightest at the steel, thinning out with height.
    // Seen from below it is strongly foreshortened, so no mipmaps: a coarse level would flatten it into a hard-edged slab.
    const ray = document.createElement('canvas'); ray.width = 32; ray.height = 128;
    const rc = ray.getContext('2d'), rays = rc.createImageData(32, 128);
    for (let y = 0; y < 128; y++) for (let x = 0; x < 32; x++) { const across = (x + .5) / 32 * 2 - 1, up = 1 - (y + .5) / 128, a = (Math.exp(-across * across * 14) * .55 + Math.exp(-across * across * 90) * .45) * smooth(up / .07) * Math.pow(1 - up, 1.6); rays.data.set([255, 255, 255, a * 255], (y * 32 + x) * 4); }
    rc.putImageData(rays, 0, 0);
    const rayMap = new THREE.CanvasTexture(ray); rayMap.generateMipmaps = false; rayMap.minFilter = THREE.LinearFilter;
    const shaft = new THREE.PlaneGeometry(.62, 10); shaft.translate(0, 5, 0);
    this.beam = new THREE.Mesh(shaft, new THREE.MeshBasicMaterial({ map: rayMap, color: GOLD, opacity: 0, ...LIGHT })); this.beam.visible = false; this.beam.renderOrder = 5; this.beam.frustumCulled = false; this.group.add(this.beam);
    this.root = new THREE.Vector3(); this.aim = new THREE.Vector3(0, 1, 0);
    this.blade = new THREE.Group(); this.blade.visible = false;
    for (const turn of [0, Math.PI / 2]) { const card = new THREE.Mesh(new THREE.PlaneGeometry(.3, 1.22), this.bladeMaterial); card.position.y = -.66; card.rotation.y = turn; card.renderOrder = 5; this.blade.add(card); }
    // Lights stay in the scene at zero so casting never recompiles every material.
    this.bladeLight = new THREE.PointLight('#ffca82', 0, 9, 1.6); this.keyLight = new THREE.PointLight('#fff0d8', 0, 9, 1.4); scene.add(this.bladeLight, this.keyLight);
    const count = mobile ? 110 : 260, offset = new Float32Array(count * 3), phase = new Float32Array(count);
    for (let i = 0; i < count; i++) { const a = i * 2.39996, y = (i / count - .5) * 2, r = Math.sqrt(1 - y * y) * (2.2 + (i * 7 % 13) / 13 * 2.2); offset.set([Math.cos(a) * r, y * 1.5 + .3, Math.sin(a) * r], i * 3); phase[i] = (i * .6180339) % 1; }
    const motes = new THREE.BufferGeometry(); motes.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3)); motes.setAttribute('offset', new THREE.Float32BufferAttribute(offset, 3)); motes.setAttribute('phase', new THREE.Float32BufferAttribute(phase, 1));
    this.motes = new THREE.Points(motes, new THREE.ShaderMaterial({ vertexShader: MOTES_VERT, fragmentShader: MOTES_FRAG, uniforms: { target: { value: new THREE.Vector3() }, time: { value: 0 }, power: { value: 0 }, tint: gold() }, ...LIGHT }));
    this.motes.frustumCulled = false; this.motes.visible = false; this.group.add(this.motes);
    this.seal = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shader(SEAL, { alpha: { value: 0 }, time: { value: 0 }, tint: gold() }, LIGHT));
    this.seal.rotation.x = -Math.PI / 2; this.seal.visible = false; this.group.add(this.seal);
    const stroke = () => shader(STROKE, { reveal: { value: 0 }, fade: { value: 0 }, seed: { value: 0 }, ink: { value: .92 }, glow: gold() }, INK);
    // Whirl: two ink bands turning around the hero through the flurry.
    this.whirls = [[2.3, 1, 1.1, .16, -17], [3.5, 1.25, .62, -.11, 13]].map(([radius, width, height, tilt, speed], i) => {
      const mesh = new THREE.Mesh(arcGeometry(radius, width, Math.PI * 1.7, { centred: true, segments: 72 }), stroke()), pivot = new THREE.Group();
      mesh.rotation.x = -Math.PI / 2; mesh.material.uniforms.seed.value = 3 + i * 5; mesh.renderOrder = 2; pivot.rotation.z = tilt; pivot.add(mesh); pivot.visible = false; this.group.add(pivot);
      return { pivot, mesh, height, speed };
    });
    const slashGeometry = arcGeometry(2.6, .9, 1.35);
    this.slashes = Array.from({ length: mobile ? 10 : 16 }, () => { const mesh = new THREE.Mesh(slashGeometry, stroke()), pivot = new THREE.Group(); mesh.renderOrder = 4; pivot.add(mesh); pivot.visible = false; this.group.add(pivot); return { pivot, mesh, life: 0, total: 1, roll: 0, size: 1 }; });
    const plane = new THREE.PlaneGeometry(2, 2);
    this.waves = Array.from({ length: 6 }, () => { const mesh = new THREE.Mesh(plane, shader(WAVE, { fade: { value: 0 }, seed: { value: 0 }, glow: gold() }, INK)); mesh.rotation.x = -Math.PI / 2; mesh.visible = false; mesh.renderOrder = 1; this.group.add(mesh); return { mesh, life: 0, total: 1, from: 0, to: 1 }; });
    const tube = new THREE.CylinderGeometry(1, 1, 1, 40, 1, true); tube.translate(0, .5, 0);
    this.pillars = Array.from({ length: 8 }, () => { const mesh = new THREE.Mesh(tube, shader(PILLAR, { fade: { value: 0 }, time: { value: 0 }, tint: gold() }, LIGHT)); mesh.visible = false; mesh.renderOrder = 3; this.group.add(mesh); return { mesh, life: 0, total: 1, radius: 1 }; });
    // Ink thrown outward along the ground from where the last cut lands.
    const blade = new THREE.PlaneGeometry(1, 1); blade.translate(.5, 0, 0);
    this.spikes = Array.from({ length: mobile ? 9 : 18 }, () => { const mesh = new THREE.Mesh(blade, stroke()), pivot = new THREE.Group(); mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 1; pivot.add(mesh); pivot.visible = false; this.group.add(pivot); return { pivot, mesh, life: 0, total: 1 }; });
    this.cursor = { slash: 0, wave: 0, pillar: 0, spike: 0 }; this.head = new THREE.Vector3(); this.tip = new THREE.Vector3(); this.clock = 0; this.casts = 0;
    this.clear();
  }
  // The glow rides on whichever sword the hero model carries (the placeholder is replaced once assets load).
  attach(model) { if (model?.weapon && this.blade.parent !== model.weapon) model.weapon.add(this.blade); }
  clear() {
    this.active = false; this.released = false; this.fired = 0; this.flash = 0; this.dark = 0; this.lines = 0; this.pull = 0; this.glow = 0; this.side = 1;
    this.blade.visible = false; this.beam.visible = false; this.beam.material.opacity = 0; this.bladeMaterial.opacity = 0; this.bladeLight.intensity = 0; this.keyLight.intensity = 0; this.motes.visible = false; this.seal.visible = false;
    for (const w of this.whirls) w.pivot.visible = false;
    for (const pool of [this.slashes, this.waves, this.pillars, this.spikes]) for (const item of pool) { item.life = 0; (item.pivot || item.mesh).visible = false; }
  }
  slash(x, y, z, roll, size, life = .4) { const s = this.slashes[this.cursor.slash++ % this.slashes.length]; s.pivot.position.set(x, y, z); s.roll = roll; s.size = size; s.life = s.total = life; s.mesh.material.uniforms.seed.value = Math.random() * 40; s.pivot.visible = true; }
  wave(x, z, from, to, life = .45) { const w = this.waves[this.cursor.wave++ % this.waves.length]; w.mesh.position.set(x, .07, z); w.from = from; w.to = to; w.life = w.total = life; w.mesh.material.uniforms.seed.value = Math.random() * 40; w.mesh.visible = true; }
  spike(x, z, angle, length, width, life = .55) { const s = this.spikes[this.cursor.spike++ % this.spikes.length]; s.pivot.position.set(x, .08, z); s.pivot.rotation.y = angle; s.mesh.scale.set(length, width, 1); s.life = s.total = life; s.mesh.material.uniforms.seed.value = Math.random() * 40; s.pivot.visible = true; }
  pillar(x, z, radius, life = .6, y = 0) { const p = this.pillars[this.cursor.pillar++ % this.pillars.length]; p.mesh.position.set(x, y, z); p.radius = radius; p.life = p.total = life; p.mesh.visible = true; }

  // Called once per rendered frame. `step` is real time (0 when paused). Returns how the camera
  // should treat this frame: a close-up placement, a pull-back amount, and whether to cut.
  update(step, game, world) {
    const u = game?.status === 'playing' ? game.ultimate?.() : null, vfx = world.combatVFX;
    this.clock += step; this.flash = Math.max(0, this.flash - step * 4.5);
    let shot = null, dark = 0, lines = 0, glow = 0, pull = 0, beam = 0;
    if (u) {
      const p = game.player, model = world.player, first = !this.active, hits = u.move.hits, last = hits.at(-1);
      if (first) { this.active = true; this.released = false; this.fired = 0; this.casts++; this.attach(model); const cam = world.camera.position; this.side = (cam.x - p.x) * Math.cos(p.yaw) - (cam.z - p.z) * Math.sin(p.yaw) >= 0 ? 1 : -1; }
      const head = model.head ? model.head.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(p.x, 1.6, p.z); this.head.lerp(head, first ? 1 : 1 - Math.exp(-step * 9));
      if (model.weapon) { this.tip.set(0, -.62, 0).applyMatrix4(model.weapon.matrixWorld); this.root.set(0, -.2, 0).applyMatrix4(model.weapon.matrixWorld); this.aim.copy(this.tip).sub(this.root).normalize(); } else { this.tip.set(p.x, 1.2, p.z); this.root.copy(this.tip); this.aim.set(0, 1, 0); }
      if (u.charging) {
        const k = u.age / u.charge;
        dark = .92 * smooth(u.age / .16); lines = smooth((k - .12) / .5); glow = .12 + .88 * Math.pow(k, 1.5);
        shot = { ...closeUp(p, this.head, k, this.side, world.camera.aspect < .8), cut: first };
        this.seal.visible = true; this.seal.position.set(p.x, .06, p.z); this.seal.scale.setScalar(3.7 - 2.1 * smooth(k)); this.seal.material.uniforms.alpha.value = Math.min(1, u.age / .2) * (.55 + .45 * k);
        this.motes.visible = true; this.motes.material.uniforms.power.value = .3 + .7 * k;
        // The blade answers as it goes up: a shaft of light from the sword into the sky.
        beam = smooth((k - SECOND_SHOT - .1) / .16);
      } else {
        if (!this.released) {
          this.released = true; this.flash = 1; shot = { cut: true }; world.shake = Math.max(world.shake, .2);
          this.wave(p.x, p.z, 1.2, u.move.range + .4, .5); vfx?.dust(p.x, p.z, 46, 4.6);
          for (let i = 0; i < 46; i++) { const a = i / 46 * Math.PI * 2; vfx?.sparks.emit(this.tip, new THREE.Vector3(Math.sin(a) * (4 + Math.random() * 5), 1 + Math.random() * 4, Math.cos(a) * (4 + Math.random() * 5)), i % 3 ? '#ffd48a' : '#fff6dc', .05 + Math.random() * .07, .35 + Math.random() * .4); }
        }
        const through = (u.age - u.charge) / (last.at - u.charge), after = (u.age - last.at) / (u.total - last.at);
        dark = through < 1 ? .38 : 0; glow = through < 1 ? 1 : 1 - smooth(after / .6); pull = through < 1 ? 1 - .5 * through : 0;
        this.motes.material.uniforms.power.value *= Math.exp(-step * 14);
        this.seal.scale.setScalar(this.seal.scale.x + step * 16); this.seal.material.uniforms.alpha.value *= Math.exp(-step * 9);
        for (const w of this.whirls) { const m = w.mesh.material.uniforms; w.pivot.visible = through < 1.25; w.pivot.position.set(p.x, w.height, p.z); w.pivot.rotation.y = u.age * w.speed; m.reveal.value = Math.min(1.3, (u.age - u.charge) / .14 * 1.3); m.fade.value = 1 - smooth((through - .82) / .43); }
        while (this.fired < hits.length && u.age >= hits[this.fired].at) this.strike(hits[this.fired], this.fired++, u.move.range, game, world);
        shot ||= { pull };
      }
      this.seal.material.uniforms.time.value = this.clock; this.motes.material.uniforms.time.value = this.clock; this.motes.material.uniforms.target.value.copy(this.tip);
    } else if (this.active) {
      // Ended or cut short (victory, defeat, restart): let go of everything that is tied to the cast.
      this.active = false; this.motes.visible = false; this.seal.visible = false; for (const w of this.whirls) w.pivot.visible = false;
    }
    const ease = rate => 1 - Math.exp(-step * rate);
    this.dark += (dark - this.dark) * ease(dark > this.dark ? 22 : 7); this.lines += (lines - this.lines) * ease(14); this.glow += (glow - this.glow) * ease(u ? 30 : 6); this.pull += (pull - this.pull) * ease(pull > this.pull ? 40 : 5);
    const shaftMaterial = this.beam.material, cam = world.camera.position; shaftMaterial.opacity += (beam - shaftMaterial.opacity) * ease(beam ? 18 : 26); this.beam.visible = shaftMaterial.opacity > .01;
    if (this.beam.visible) {
      // Runs along the blade and turns about it to face the lens.
      const along = this.aim, facing = new THREE.Vector3().subVectors(cam, this.root); facing.addScaledVector(along, -facing.dot(along));
      if (facing.lengthSq() < 1e-6) facing.set(1, 0, 0).addScaledVector(along, -along.x); facing.normalize();
      this.beam.position.copy(this.root); this.beam.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(along, facing), along, facing));
      this.beam.scale.x = 1 + Math.sin(this.clock * 43) * .12; shaftMaterial.color.set(GOLD).multiplyScalar(2.9);
    }
    this.blade.visible = this.glow > .01; this.bladeMaterial.opacity = Math.min(1, this.glow * 1.2); this.bladeMaterial.color.set(GOLD).multiplyScalar(1 + this.glow * 1.5 + Math.sin(this.clock * 31) * .2 * this.glow);
    this.bladeLight.position.copy(this.tip); this.bladeLight.intensity = this.glow * 26;
    // A key light off the camera's shoulder keeps the face readable once the world goes dark.
    // The key sits above the lens for the face shot, and below the chest for the low shot so the upturned figure is not a silhouette.
    if (shot?.position) { const low = shot.position.y < 1; this.keyLight.position.copy(shot.position).lerp(this.head, low ? .4 : .25).setY(this.head.y + (low ? -.75 : .45)); }
    this.keyLight.intensity = shot?.position ? (shot.position.y < 1 ? 13 : 8) * this.dark * Math.max(1, this.keyLight.position.distanceToSquared(this.head) / 2.2) : this.keyLight.intensity * Math.exp(-step * 12);
    const camera = world.camera.quaternion;
    for (const s of this.slashes) { if (s.life <= 0) continue; s.life -= step; const age = s.total - s.life, m = s.mesh.material.uniforms; s.pivot.visible = s.life > 0; s.pivot.quaternion.copy(camera).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), s.roll)); s.pivot.scale.setScalar(s.size * (1 + age * .35)); m.reveal.value = Math.min(1.3, age / .075 * 1.3); m.fade.value = 1 - smooth((age - .11) / (s.total - .11)); }
    for (const w of this.waves) { if (w.life <= 0) continue; w.life -= step; const k = 1 - Math.max(0, w.life) / w.total; w.mesh.visible = w.life > 0; w.mesh.scale.setScalar(w.from + (w.to - w.from) * (1 - Math.pow(1 - k, 2.4))); w.mesh.material.uniforms.fade.value = 1 - smooth((k - .35) / .65); }
    for (const s of this.spikes) { if (s.life <= 0) continue; s.life -= step; const age = s.total - s.life, m = s.mesh.material.uniforms; s.pivot.visible = s.life > 0; m.reveal.value = Math.min(1.3, age / .11 * 1.3); m.fade.value = 1 - smooth((age - .16) / (s.total - .16)); }
    for (const p of this.pillars) { if (p.life <= 0) continue; p.life -= step; const k = 1 - Math.max(0, p.life) / p.total, m = p.mesh.material.uniforms; p.mesh.visible = p.life > 0; p.mesh.scale.set(p.radius * (.55 + k * .9), 7.5, p.radius * (.55 + k * .9)); m.fade.value = Math.pow(1 - k, 1.4); m.time.value = this.clock; }
    return shot;
  }
  // A pause or a story scene can land on the brightest frame; let the screen come back while everything else holds.
  settle(dt) { this.flash = Math.max(0, this.flash - dt * 4.5); }
  // One scheduled hit: a stroke across everything it reaches, and on the last one the full release.
  strike(hit, index, range, game, world) {
    const p = game.player, reach = u => Math.hypot(u.x - p.x, u.z - p.z) <= range + u.radius * .3;
    let targets = game.targets().filter(e => (e.hp > 0 || e.impact?.time > 0) && reach(e)).slice(0, 6);
    if (!targets.length) targets = [{ x: p.x + Math.sin(p.yaw) * 2.4, z: p.z + Math.cos(p.yaw) * 2.4, kindId: 'none' }];
    for (const [i, e] of targets.entries()) {
      const kind = e.kindId || game.spec.id, y = kind === 'oni' ? 1.75 : kind === 'wolf' ? .8 : 1.2, size = kind === 'oni' ? 1.5 : 1.05;
      if (!hit.final) { this.slash(e.x, y, e.z, SLASH_ROLLS[(index + i) % 4] + (Math.random() - .5) * .3, size, .42); continue; }
      this.slash(e.x, y + .3, e.z, -1.42, size * 2, .6); this.slash(e.x, y, e.z, .16, size * 1.5, .5);
      this.pillar(e.x, e.z, .7 * size, .7); if (i < 2) this.pillar(e.x, e.z, .3 * size, .5); this.wave(e.x, e.z, .5, 3.4 * size, .55); world.combatVFX?.dust(e.x, e.z, 40, 4.2);
      const spikes = Math.floor(this.spikes.length / Math.min(targets.length, 2)); if (i < 2) for (let k = 0; k < spikes; k++) this.spike(e.x, e.z, (k + Math.random() * .7) / spikes * Math.PI * 2, (2.4 + Math.random() * 2.2) * size, .5 + Math.random() * .5);
    }
    if (hit.final) { this.flash = Math.max(this.flash, .65); world.shake = Math.max(world.shake, .3); }
  }
  snapshot() { return { active: this.active, casts: this.casts, released: this.released, fired: this.fired, dark: this.dark, lines: this.lines, glow: this.glow, flash: this.flash, slashes: this.slashes.filter(s => s.life > 0).length, waves: this.waves.filter(w => w.life > 0).length, pillars: this.pillars.filter(p => p.life > 0).length, spikes: this.spikes.filter(s => s.life > 0).length }; }
}
