import * as THREE from './vendor/three.module.js';

// Night-storm atmosphere: moonlit cloud dome, camera-following rain with
// ground splashes, drifting mist, lantern embers and distant lightning.
// Everything is shader-animated so it costs a handful of draw calls.
export const MOON_DIRECTION = new THREE.Vector3(-.34, .3, -.89).normalize();
const NOISE = `float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(17.,9.);a*=.5;}return v;}`;

function skyDome() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { time: { value: 0 }, flash: { value: 0 }, moon: { value: MOON_DIRECTION.clone() } },
    vertexShader: 'varying vec3 vDir;void main(){vDir=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform float time;uniform float flash;uniform vec3 moon;varying vec3 vDir;${NOISE}
void main(){vec3 d=normalize(vDir);float h=d.y;
vec3 horizon=vec3(.0194,.0382,.0497),zenith=vec3(.004,.009,.019);vec3 col=mix(horizon,zenith,smoothstep(0.,.75,h));
float m=max(dot(d,moon),0.);
vec2 uv=d.xz/(h+.32)*1.35+vec2(time*.012,time*.005);float cloud=fbm(uv),wisp=fbm(uv*2.7-vec2(time*.02,0.));
float density=smoothstep(.38,.78,cloud*.75+wisp*.3);
vec3 lit=vec3(.05,.075,.1)+vec3(.42,.55,.7)*pow(m,10.)*(1.-density*.55);
col=mix(col,mix(vec3(.007,.012,.018),lit,smoothstep(.2,.9,cloud)),density*.92);
float disc=smoothstep(.99915,.99945,m);col+=vec3(1.5,1.72,1.95)*disc*(1.-density*.8)*(.86+.14*noise(d.xy*190.));
col+=vec3(.3,.42,.6)*(pow(m,220.)*.55+pow(m,28.)*.11)*(1.-density*.5);
col+=flash*vec3(.5,.62,.95)*(.1+density*.75)*smoothstep(-.1,.5,h);
col=mix(horizon*(1.+flash*1.3),col,smoothstep(-.02,.2,h));gl_FragColor=vec4(col,1.);}`
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(140, 40, 20), material); dome.renderOrder = -10; dome.frustumCulled = false; return dome;
}

function rainStreaks(count) {
  const positions = new Float32Array(count * 6), ends = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) { const x = Math.random() * 34, y = Math.random() * 17, z = Math.random() * 34; positions.set([x, y, z, x, y, z], i * 6); ends[i * 2 + 1] = 1; }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('end', new THREE.BufferAttribute(ends, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { time: { value: 0 }, center: { value: new THREE.Vector3() }, flash: { value: 0 } },
    vertexShader: `attribute float end;uniform float time;uniform vec3 center;varying float vAlpha;
void main(){vec3 p=position;float speed=13.+fract(p.x*7.31+p.z*3.17)*6.;p.y=mod(p.y-time*speed,17.)-1.;p.x+=p.y*-.07;
p.xz=mod(p.xz-center.xz+17.,34.)-17.+center.xz;p+=end*vec3(-.03,.42,0.);vec4 mv=modelViewMatrix*vec4(p,1.);
vAlpha=(1.-end*.85)*smoothstep(1.,4.,-mv.z)*(1.-smoothstep(16.,26.,-mv.z));gl_Position=projectionMatrix*mv;}`,
    fragmentShader: 'uniform float flash;varying float vAlpha;void main(){gl_FragColor=vec4(vec3(.5,.62,.74)*(1.+flash*3.),vAlpha*.2);}'
  });
  const lines = new THREE.LineSegments(geometry, material); lines.frustumCulled = false; lines.renderOrder = 6; return lines;
}

function rainSplashes(count) {
  const seeds = new Float32Array(count * 3); for (let i = 0; i < seeds.length; i++) seeds[i] = Math.random();
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(seeds, 3));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { time: { value: 0 }, center: { value: new THREE.Vector3() }, scale: { value: 500 } },
    vertexShader: `uniform float time;uniform vec3 center;uniform float scale;varying float vLife;
float hash(float n){return fract(sin(n)*43758.5453);}
void main(){float cycle=time*(1.5+position.z)+position.x*9.;float id=floor(cycle);vLife=fract(cycle);
vec2 cell=vec2(hash(id*1.31+position.x*71.),hash(id*2.17+position.y*53.))*26.-13.;vec3 p=vec3(center.x+cell.x,.03,center.z+cell.y);
vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(scale*(.04+vLife*.15)/max(1.,-mv.z),1.,48.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vLife;void main(){vec2 p=(gl_PointCoord-.5)*vec2(2.,5.2);float r=length(p);float ring=smoothstep(.62,.84,r)*(1.-smoothstep(.86,1.,r));
float a=ring*(1.-vLife)*(1.-vLife)*.22;if(a<.006)discard;gl_FragColor=vec4(.56,.68,.78,a);}`
  });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; points.renderOrder = 5; return points;
}

function mistBank(count) {
  const centers = [], corners = [], seeds = [], index = [];
  for (let i = 0; i < count; i++) {
    const c = [Math.random() * 56, .35 + Math.random() * 1.5, Math.random() * 56], s = Math.random();
    for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { centers.push(...c); corners.push(x, y); seeds.push(s); }
    index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(centers, 3)); geometry.setAttribute('corner', new THREE.Float32BufferAttribute(corners, 2)); geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 1)); geometry.setIndex(index);
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { time: { value: 0 }, center: { value: new THREE.Vector3() }, flash: { value: 0 } },
    vertexShader: `attribute vec2 corner;attribute float seed;uniform float time;uniform vec3 center;varying vec2 vCorner;varying float vFade;varying float vSeed;
void main(){vec3 p=position;p.x+=time*(.35+seed*.5);p.z+=sin(time*.13+seed*40.)*1.6;p.xz=mod(p.xz-center.xz+28.,56.)-28.+center.xz;
vec4 mv=modelViewMatrix*vec4(p,1.);float size=5.+seed*6.;mv.xy+=corner*vec2(size,size*.3);
float edge=length(p.xz-center.xz)/28.;vFade=smoothstep(2.5,9.,-mv.z)*(1.-smoothstep(.72,1.,edge));vCorner=corner;vSeed=seed;gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform float time;uniform float flash;varying vec2 vCorner;varying float vFade;varying float vSeed;${NOISE}
void main(){float r=length(vCorner);float body=pow(max(0.,1.-r*r),2.);float n=fbm(vCorner*1.7+vec2(time*.06+vSeed*31.,vSeed*17.));
float a=body*smoothstep(.25,.8,n)*vFade*.2;if(a<.004)discard;gl_FragColor=vec4(vec3(.1,.145,.175)*(1.+flash*2.2),a);}`
  });
  const mesh = new THREE.Mesh(geometry, material); mesh.frustumCulled = false; mesh.renderOrder = 4; return mesh;
}

function lanternEmbers(origins, perLantern) {
  const positions = [], seeds = [];
  for (const o of origins) for (let i = 0; i < perLantern; i++) { positions.push(o.x, o.y, o.z); seeds.push(Math.random(), Math.random(), Math.random()); }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('seed', new THREE.Float32BufferAttribute(seeds, 3));
  const material = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { time: { value: 0 }, scale: { value: 500 } },
    vertexShader: `attribute vec3 seed;uniform float time;uniform float scale;varying float vLife;
void main(){float life=fract(time*(.16+seed.x*.16)+seed.y);vLife=life;vec3 p=position;p.y+=.1+life*(1.6+seed.z*1.6);
float sway=time*(1.1+seed.x)+seed.y*30.;p.x+=sin(sway)*(.1+life*.5)+life*.6;p.z+=cos(sway*.8)*(.1+life*.45);
vec4 mv=modelViewMatrix*vec4(p,1.);gl_PointSize=clamp(scale*(.016+seed.z*.02)/max(1.,-mv.z),1.,9.);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `varying float vLife;void main(){float r=length(gl_PointCoord-.5)*2.;float a=pow(max(0.,1.-r),1.5)*sin(vLife*3.1416)*(1.-vLife*.4);gl_FragColor=vec4(vec3(5.,1.75,.42)*a,a);}`
  });
  const points = new THREE.Points(geometry, material); points.frustumCulled = false; points.renderOrder = 7; return points;
}

export class Atmosphere {
  constructor(scene, { lanterns = [], mobile = false } = {}) {
    this.sky = skyDome(); this.rain = rainStreaks(mobile ? 700 : 1700); this.splashes = rainSplashes(mobile ? 70 : 170); this.mist = mistBank(mobile ? 26 : 52); this.embers = lanternEmbers(lanterns, mobile ? 5 : 9);
    scene.add(this.sky, this.mist, this.splashes, this.rain, this.embers);
    this.moonlight = new THREE.DirectionalLight('#8fb4e6', .42); this.moonlight.position.copy(MOON_DIRECTION).multiplyScalar(40); scene.add(this.moonlight, this.moonlight.target);
    this.bolt = new THREE.DirectionalLight('#c3d6ff', 0); scene.add(this.bolt, this.bolt.target);
    this.flash = 0; this.strikeAge = 99; this.nextStrike = 7 + Math.random() * 6; this.strikes = 0; this.center = new THREE.Vector3();
  }
  update(dt, t, camera, focus) {
    this.center.set(focus.x, 0, focus.z); this.sky.position.copy(camera.position);
    this.moonlight.position.copy(MOON_DIRECTION).multiplyScalar(40).add(this.center); this.moonlight.target.position.copy(this.center);
    // A strike is a hard flash, a short dark gap, then a softer afterglow.
    this.nextStrike -= dt; this.strikeAge += dt;
    if (this.nextStrike <= 0) { this.nextStrike = 11 + Math.random() * 15; this.strikeAge = 0; this.strikes++; const a = Math.random() * Math.PI * 2; this.boltOffset = new THREE.Vector3(Math.sin(a) * 30, 26, Math.cos(a) * 30); }
    const s = this.strikeAge; this.flash = s > 1.4 ? 0 : Math.max(Math.exp(-s * 16), s > .13 ? .6 * Math.exp(-(s - .13) * 9) : 0);
    if (this.boltOffset) { this.bolt.position.copy(this.center).add(this.boltOffset); this.bolt.target.position.copy(this.center); } this.bolt.intensity = this.flash * 5.5;
    const scale = camera.projectionMatrix.elements[5] * 380;
    for (const m of [this.sky, this.rain, this.splashes, this.mist, this.embers]) { const u = m.material.uniforms; u.time.value = t; if (u.flash) u.flash.value = this.flash; if (u.center) u.center.value.copy(u === this.rain.material.uniforms ? camera.position : this.center); if (u.scale) u.scale.value = scale; }
  }
  snapshot() { return { flash: this.flash, strikes: this.strikes, nextStrike: this.nextStrike }; }
}
