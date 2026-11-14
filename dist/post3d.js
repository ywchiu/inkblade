import * as THREE from './vendor/three.module.js';

// HDR scene buffer -> mip-chain bloom -> lens, grade and tone map.
// The scene is rendered in linear light so lanterns, sparks and blades can
// exceed 1.0 and bleed into the lens instead of clipping to flat white.
const VERTEX = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const PREFILTER = `uniform sampler2D source;uniform vec2 texel;uniform float threshold;varying vec2 vUv;
void main(){vec3 c=texture2D(source,vUv+texel*vec2(-.5,-.5)).rgb+texture2D(source,vUv+texel*vec2(.5,-.5)).rgb+texture2D(source,vUv+texel*vec2(-.5,.5)).rgb+texture2D(source,vUv+texel*vec2(.5,.5)).rgb;c=min(c*.25,vec3(14.));
float b=max(c.r,max(c.g,c.b)),knee=threshold*.6,soft=clamp(b-threshold+knee,0.,2.*knee);soft=soft*soft/(4.*knee+1e-4);
gl_FragColor=vec4(c*max(soft,b-threshold)/max(b,1e-4),1.);}`;
const DOWN = `uniform sampler2D source;uniform vec2 texel;varying vec2 vUv;
void main(){vec3 c=texture2D(source,vUv).rgb*4.;c+=texture2D(source,vUv+texel*vec2(-1.,-1.)).rgb+texture2D(source,vUv+texel*vec2(1.,-1.)).rgb+texture2D(source,vUv+texel*vec2(-1.,1.)).rgb+texture2D(source,vUv+texel*vec2(1.,1.)).rgb;gl_FragColor=vec4(c/8.,1.);}`;
const UP = `uniform sampler2D source;uniform sampler2D base;uniform vec2 texel;uniform float spread;varying vec2 vUv;
void main(){vec3 c=texture2D(source,vUv).rgb*4.;
c+=(texture2D(source,vUv+texel*vec2(-1.,0.)).rgb+texture2D(source,vUv+texel*vec2(1.,0.)).rgb+texture2D(source,vUv+texel*vec2(0.,-1.)).rgb+texture2D(source,vUv+texel*vec2(0.,1.)).rgb)*2.;
c+=texture2D(source,vUv+texel*vec2(-1.,-1.)).rgb+texture2D(source,vUv+texel*vec2(1.,-1.)).rgb+texture2D(source,vUv+texel*vec2(-1.,1.)).rgb+texture2D(source,vUv+texel*vec2(1.,1.)).rgb;
gl_FragColor=vec4(texture2D(base,vUv).rgb+c/16.*spread,1.);}`;
const FINAL = `uniform sampler2D sceneTexture;uniform sampler2D bloomTexture;uniform vec2 resolution;uniform float time;uniform float damage;uniform float impact;uniform float bloom;uniform float focus;uniform float ult;uniform float lines;uniform float flash;varying vec2 vUv;
float lum(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
void main(){vec2 px=1./resolution,d=vUv-.5;float r2=dot(d,d);
// Lens fringing grows toward the frame edge and kicks on heavy contact.
vec2 ca=d*(r2*.005+impact*.011);vec3 c=vec3(texture2D(sceneTexture,vUv+ca).r,texture2D(sceneTexture,vUv).g,texture2D(sceneTexture,vUv-ca).b);
float edge=abs(lum(texture2D(sceneTexture,vUv+vec2(px.x,0.)).rgb)-lum(texture2D(sceneTexture,vUv-vec2(px.x,0.)).rgb))+abs(lum(texture2D(sceneTexture,vUv+vec2(0.,px.y)).rgb)-lum(texture2D(sceneTexture,vUv-vec2(0.,px.y)).rgb));c*=1.-smoothstep(.12,.6,edge)*.05;
vec3 glow=texture2D(bloomTexture,vUv).rgb;c+=glow*bloom;
// Split tone: cold ink in the shadows, lamp-warm highlights.
float l=lum(c);c=mix(c,c*vec3(.8,.97,1.14),(1.-smoothstep(0.,.3,l))*.6);c=mix(c,c*vec3(1.1,1.,.86),smoothstep(.35,1.8,l)*.55);
c=mix(vec3(lum(c)),c,1.14);c=max(c,0.);
// Ultimate: the world drops to cold ink and only what glows keeps its colour; focus lines race in from the frame edge.
float lu=lum(c),rad=length(d);c=mix(c,mix(vec3(lu)*vec3(.46,.58,.7)*.34,c,smoothstep(.5,1.9,lu)),ult*(.55+.45*smoothstep(.04,.5,rad)));
float ang=atan(d.y,d.x)*38.197,cell=floor(ang),rnd=fract(sin(cell*12.9898+floor(time*20.)*78.233)*43758.5453);
c+=vec3(1.,.9,.72)*step(.78,rnd)*smoothstep(.2+rnd*.22,.66,rad)*(1.-abs(fract(ang)-.5)*2.)*lines*1.5;
c=mix(c,vec3(2.3,2.1,1.75),flash);
float vig=smoothstep(.28,.98,length(d*vec2(1.,.88)));c*=1.-vig*(.46+focus*.25);
float wound=smoothstep(.22,.72,length(d*vec2(1.,.85)))*damage;c=mix(c,vec3(.42,.018,.009),wound);
gl_FragColor=vec4(c,1.);
#include <tonemapping_fragment>
#include <colorspace_fragment>
float grain=fract(sin(dot(vUv*resolution+fract(time)*61.,vec2(12.9898,78.233)))*43758.5453);gl_FragColor.rgb+=(grain-.5)*.022*(1.-lum(gl_FragColor.rgb)*.6);}`;

export class PostFX {
  constructor(renderer, { mobile = false } = {}) {
    this.renderer = renderer;
    const hdr = renderer.capabilities.isWebGL2 && (renderer.extensions.has('EXT_color_buffer_float') || renderer.extensions.has('EXT_color_buffer_half_float'));
    const type = hdr ? THREE.HalfFloatType : THREE.UnsignedByteType;
    this.hdr = hdr; this.levels = mobile ? 4 : 6;
    this.sceneTarget = new THREE.WebGLRenderTarget(1, 1, { samples: mobile ? 0 : 4, type });
    const make = () => new THREE.WebGLRenderTarget(1, 1, { type, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
    this.down = Array.from({ length: this.levels }, make); this.up = Array.from({ length: this.levels - 1 }, make);
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); this.scene = new THREE.Scene();
    const pass = (fragmentShader, uniforms, toneMapped = false) => new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped });
    this.prefilter = pass(PREFILTER, { source: { value: null }, texel: { value: new THREE.Vector2() }, threshold: { value: hdr ? 1.05 : .82 } });
    this.downPass = pass(DOWN, { source: { value: null }, texel: { value: new THREE.Vector2() } });
    this.upPass = pass(UP, { source: { value: null }, base: { value: null }, texel: { value: new THREE.Vector2() }, spread: { value: .92 } });
    this.final = pass(FINAL, { sceneTexture: { value: this.sceneTarget.texture }, bloomTexture: { value: null }, resolution: { value: new THREE.Vector2(1, 1) }, time: { value: 0 }, damage: { value: 0 }, impact: { value: 0 }, bloom: { value: hdr ? .22 : .3 }, focus: { value: 0 }, ult: { value: 0 }, lines: { value: 0 }, flash: { value: 0 } }, true);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.final); this.quad.frustumCulled = false; this.scene.add(this.quad);
  }
  get uniforms() { return this.final.uniforms; }
  setSize(width, height) {
    this.sceneTarget.setSize(width, height); this.final.uniforms.resolution.value.set(width, height);
    let w = width, h = height;
    for (let i = 0; i < this.levels; i++) { w = Math.max(2, Math.round(w / 2)); h = Math.max(2, Math.round(h / 2)); this.down[i].setSize(w, h); this.up[i]?.setSize(w, h); }
  }
  blit(material, target) { this.quad.material = material; this.renderer.setRenderTarget(target); this.renderer.render(this.scene, this.camera); }
  render(scene, camera) {
    const r = this.renderer;
    r.setRenderTarget(this.sceneTarget); r.render(scene, camera);
    const stats = { calls: r.info.render.calls, triangles: r.info.render.triangles };
    let source = this.sceneTarget;
    this.prefilter.uniforms.source.value = source.texture; this.prefilter.uniforms.texel.value.set(1 / source.width, 1 / source.height); this.blit(this.prefilter, this.down[0]);
    for (let i = 1; i < this.levels; i++) { source = this.down[i - 1]; this.downPass.uniforms.source.value = source.texture; this.downPass.uniforms.texel.value.set(1 / source.width, 1 / source.height); this.blit(this.downPass, this.down[i]); }
    let blurred = this.down[this.levels - 1];
    for (let i = this.levels - 2; i >= 0; i--) { const u = this.upPass.uniforms; u.source.value = blurred.texture; u.base.value = this.down[i].texture; u.texel.value.set(1 / blurred.width, 1 / blurred.height); this.blit(this.upPass, this.up[i]); blurred = this.up[i]; }
    this.final.uniforms.bloomTexture.value = blurred.texture; this.blit(this.final, null);
    return stats;
  }
}
