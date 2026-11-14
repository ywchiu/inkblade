import { CampaignField } from './campaign-world3d.js';
import { CombatVFX } from './combat-vfx.js';
import { playerMove } from './attack-moves.js';
import { EnemyThreats } from './enemy-threats.js';
import { buildTemple, updateTemple } from './environment3d.js';
import { DodgeEchoes } from './dodge-effects.js';
import * as THREE from './vendor/three.module.js';
import { loadCharacter, loadSkin, SKINS, animateCharacter } from './characters3d.js';
import { WeaponTrails } from './weapon-trails.js';
import { ImpactFeedback } from './impact3d.js';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import { angleDiff, clamp } from './combat3d.js';
import { PostFX } from './post3d.js';
import { Atmosphere } from './atmosphere3d.js';
import { UltimateFX } from './ultimate3d.js';
import { HeroArts } from './hero-arts3d.js';
const TAU=Math.PI*2;
export function mountainGeometry(radius,height){const g=new THREE.CylinderGeometry(.2,radius,height,28,22);const a=g.attributes.position;for(let i=0;i<a.count;i++){const y=a.getY(i),v=clamp((y+height/2)/height,0,1);const oldRadius=Math.hypot(a.getX(i),a.getZ(i));if(oldRadius<.001)continue;const angle=Math.atan2(a.getZ(i),a.getX(i));const profile=Math.pow(1-v,.48)*(1+.13*Math.sin(v*18+angle*3)+.1*Math.sin(angle*7));const nr=radius*profile; a.setX(i,Math.cos(angle)*nr+Math.sin(v*3)*radius*.25);a.setZ(i,Math.sin(angle)*nr);a.setY(i,y+Math.sin(angle*4+v*8)*.14*radius*Math.sin(v*Math.PI));}a.needsUpdate=true;g.computeVertexNormals();return g;}
const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const gradient=new THREE.DataTexture(new Uint8Array([90,160,215,255]),4,1,THREE.RedFormat);gradient.minFilter=gradient.magFilter=THREE.NearestFilter;gradient.needsUpdate=true;
const material=(color,extra={})=>new THREE.MeshToonMaterial({color,gradientMap:gradient,...extra});
const M={ink:material('#293b38'),dark:material('#1f302e'),cream:material('#d8d6bf'),cloth:material('#a9b3a3'),green:material('#52665c'),red:material('#853e33'),gold:material('#9c8c5e'),skin:material('#b1a58d'),steel:material('#d4ded4'),stone:material('#87918a'),moss:material('#667360'),mask:material('#d1cbb3'),black:material('#162825'),wood:material('#4a5246'),leaf:material('#53665b',{side:THREE.DoubleSide}),outline:new THREE.MeshBasicMaterial({color:'#21352f',side:THREE.BackSide}),ember:new THREE.MeshBasicMaterial({color:'#cf6841'})};
const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,12,8),rock=new THREE.DodecahedronGeometry(1,0);
function part(parent,geo,mat,x=0,y=0,z=0,sx=1,sy=1,sz=1,outline=false){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);if(outline){const edge=new THREE.Mesh(geo,M.outline);edge.scale.setScalar(1.025);edge.castShadow=false;edge.receiveShadow=false;m.add(edge);}return m;}
function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
function rod(parent,a,b,r1,r2,mat,segments=8){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p);const m=part(parent,new THREE.CylinderGeometry(r2,r1,d.length(),segments),mat);m.position.copy(p.add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;}
function curve(parent,points,mat,r=.025){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return part(parent,new THREE.TubeGeometry(c,16,r,5,false),mat);}
function clothPanel(width,length,mat){const vertices=[],uv=[],indices=[],cols=8,rows=10;for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const t=x/cols-.5,v=y/rows;vertices.push(t*width*(.7+v*.4),-v*length,.05+Math.sin(t*Math.PI*5)*.025+v*v*.27);uv.push(x/cols,v);}for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.userData.original=Float32Array.from(vertices);return m;}
function sword(parent,red=false){const g=group(parent,0,-.38,0);part(g,new THREE.CylinderGeometry(.035,.035,.3,8),M.dark,0,0,0);for(let i=0;i<6;i++)part(g,new THREE.TorusGeometry(.038,.006,4,8),M.gold,0,-.13+i*.047,0).rotation.x=Math.PI/2;part(g,new THREE.CylinderGeometry(.1,.1,.025,12),M.gold,0,-.17,0,1,1,.65);const blade=part(g,cube,red?M.mask:M.steel,0,-.78,0,.045,1.2,.075,true);part(g,new THREE.ConeGeometry(.045,.17,4),M.steel,0,-1.46,0,1,1,1).rotation.z=Math.PI;part(g,cube,M.cream,.026,-.79,0,.012,1.2,.077);g.rotation.x=-Math.PI/2;return g;}
function human(enemy=false){const root=new THREE.Group(),body=group(root),hips=group(body,0,.96,0),torso=group(body,0,1.36,0);const cloth=enemy?M.ink:M.cream,armor=enemy?M.red:M.ink;
 part(torso,new THREE.CylinderGeometry(.24,.2,.55,9),cloth,0,0,0,1,1,.72,true);
 // Crossed lapels, layered shoulder armor and leather belt.
 const lapel=part(torso,cube,enemy?M.dark:M.cloth,0,.04,.165,.12,.47,.035);lapel.rotation.z=-.42;
 part(torso,new THREE.CylinderGeometry(.245,.24,.12,10),M.red,0,-.25,0,1,1,.78);
 part(torso,cube,M.gold,0,-.25,.19,.1,.085,.035);
 for(const sign of[-1,1]){for(let i=0;i<3;i++){const a=part(torso,cube,armor,sign*.32,.15-i*.055,0,.24,.065,.34,true);a.rotation.z=sign*-.2;}}
 const skirt=part(hips,new THREE.CylinderGeometry(.2,.41,.64,10,1,true),cloth,0,-.22,0,1,1,.8,true);
 for(let i=0;i<10;i++){const a=i*TAU/10;rod(hips,[Math.sin(a)*.21,.08,Math.cos(a)*.17],[Math.sin(a)*.4,-.54,Math.cos(a)*.32],.009,.004,enemy?M.dark:M.cloth,4);}
 const head=group(body,0,1.84,0);part(head,sphere,M.skin,0,0,0,.15,.2,.145,true);
 part(head,new THREE.CylinderGeometry(.157,.13,.19,10),enemy?M.mask:M.dark,0,-.07,.01,1,1,.95);
 part(head,cube,M.dark,0,.025,.137,.21,.027,.023);
 if(enemy){
  part(head,cube,M.red,0,-.025,.16,.16,.014,.02);for(const sign of[-1,1]){const brow=part(head,cube,M.dark,sign*.067,.05,.14,.09,.03,.035);brow.rotation.z=sign*.3;const horn=part(head,new THREE.ConeGeometry(.052,.31,7),M.gold,sign*.13,.21,0);horn.rotation.z=sign*-.35;}
  part(head,sphere,M.dark,0,.08,-.01,.165,.19,.14);const knot=part(head,sphere,M.dark,0,.21,-.08,.085,.095,.08);
 }else{
  part(head,new THREE.ConeGeometry(.48,.17,32),M.gold,0,.2,0,1,1,1,true);
  part(head,new THREE.CylinderGeometry(.48,.49,.025,32),M.ink,0,.115,0);
  for(let i=0;i<24;i++){const a=i*TAU/24;rod(head,[0,.285,0],[Math.sin(a)*.47,.12,Math.cos(a)*.47],.004,.004,M.wood,4);}
  curve(head,[[-.12,.1,.08],[-.13,-.22,.08],[0,-.24,.12],[.13,-.22,.08],[.12,.1,.08]],M.wood,.008);
 }
 const arms=[],legs=[];
 for(const sign of[-1,1]){
  const arm=group(body,sign*.3,1.53,0);part(arm,new THREE.CylinderGeometry(.11,.085,.34,8),cloth,0,-.17,0,1,1,1,true);
  const elbow=group(arm,0,-.34,0);part(elbow,new THREE.CylinderGeometry(.083,.063,.31,8),enemy?M.dark:M.cloth,0,-.15,0,1,1,1,true);part(elbow,new THREE.CylinderGeometry(.088,.07,.16,8),armor,0,-.22,0);part(elbow,sphere,M.skin,0,-.34,0,.062,.082,.065);arms.push({upper:arm,lower:elbow});
  const leg=group(hips,sign*.15,-.16,0);part(leg,new THREE.CylinderGeometry(.12,.09,.4,9),enemy?M.dark:M.ink,0,-.2,0);const knee=group(leg,0,-.38,0);part(knee,new THREE.CylinderGeometry(.085,.055,.37,8),M.dark,0,-.17,0);part(knee,cube,armor,0,-.13,.06,.12,.25,.06);part(knee,cube,M.dark,0,-.36,.06,.16,.12,.29,true);legs.push({upper:leg,lower:knee});
 }
 const weapon=sword(arms[1].lower,enemy);
 const sheath=rod(torso,[-.23,-.2,0],[-.5,-1,-.14],.04,.028,M.dark);const cape=clothPanel(.66,.95,material(enemy?'#403d32':'#324943',{side:THREE.DoubleSide}));cape.position.set(0,1.64,-.17);cape.rotation.y=Math.PI;body.add(cape);
 const scarf=clothPanel(.12,.68,material('#934736',{side:THREE.DoubleSide}));scarf.position.set(-.1,1.63,-.18);scarf.rotation.z=.5;scarf.rotation.y=Math.PI;body.add(scarf);
 return {root,body,torso,hips,head,arms,legs,cape,scarf,weapon,type:'human'};
}
function wolf(){const root=new THREE.Group(),body=group(root);part(body,sphere,M.ink,0,.83,0,.42,.4,.88,true);part(body,sphere,M.dark,0,1.02,.57,.44,.48,.42,true);for(let i=0;i<11;i++){const a=i*TAU/11;const spike=part(body,new THREE.ConeGeometry(.15,.52,5),i%2?M.ink:M.green,Math.sin(a)*.36,1.05+Math.cos(a)*.33,.35);spike.rotation.x=-.75;spike.rotation.z=-a;}
 const head=group(body,0,1.23,.91);part(head,rock,M.ink,0,0,0,.3,.32,.4,true);part(head,new THREE.ConeGeometry(.19,.5,5),M.green,0,-.05,.33,1,1,1,true).rotation.x=Math.PI/2;part(head,sphere,M.dark,0,-.04,.58,.12,.08,.06);
 for(const sign of[-1,1]){part(head,new THREE.ConeGeometry(.12,.42,4),M.dark,sign*.2,.3,-.1).rotation.z=-sign*.16;part(head,sphere,M.ember,sign*.245,.035,.17,.025,.032,.09);for(let i=0;i<2;i++)part(head,new THREE.ConeGeometry(.025,.14,5),M.mask,sign*(.09+i*.05),-.15,.31).rotation.z=Math.PI;}
 const legs=[];for(const x of[-.28,.28])for(const z of[-.6,.55]){const leg=group(body,x,.72,z);part(leg,new THREE.CylinderGeometry(.12,.065,.4,7),M.ink,0,-.18,0);const knee=group(leg,0,-.35,0);part(knee,new THREE.CylinderGeometry(.065,.045,.32,7),M.dark,0,-.15,.025);part(knee,sphere,M.ink,0,-.3,.1,.1,.07,.17);legs.push({upper:leg,lower:knee});}
 const tail=group(body,0,1,-.75);part(tail,new THREE.ConeGeometry(.22,1.18,6),M.ink,0,.26,-.37).rotation.x=-.9;
 return{root,body,head,legs,tail,type:'wolf'};}
function oni(){const root=new THREE.Group(),body=group(root),torso=group(body,0,1.55,0);part(torso,rock,M.stone,0,0,0,.8,.95,.5,true);part(torso,rock,M.green,0,-.65,0,.58,.4,.4,true);for(const sign of[-1,1]){part(torso,rock,M.ink,sign*.43,.28,.27,.3,.4,.23);part(torso,new THREE.ConeGeometry(.2,.65,5),M.stone,sign*.75,.62,-.02).rotation.z=sign*-.7;}
 const head=group(body,0,2.65,.05);part(head,rock,M.mask,0,0,0,.42,.52,.33,true);part(head,cube,M.dark,0,-.16,.3,.36,.12,.05);
 for(const sign of[-1,1]){const eye=part(head,cube,M.ember,sign*.17,.04,.3,.18,.045,.035);eye.rotation.z=sign*.2;const horn=part(head,new THREE.ConeGeometry(.12,.76,7),M.ink,sign*.32,.47,-.06);horn.rotation.z=-sign*.5;part(head,new THREE.ConeGeometry(.045,.17,5),M.mask,sign*.12,-.17,.36);}
 const arms=[],legs=[];for(const sign of[-1,1]){const arm=group(body,sign*.81,2.04,0);part(arm,rock,M.stone,0,-.23,0,.33,.51,.35,true);const elbow=group(arm,0,-.57,0);part(elbow,rock,M.green,0,-.22,.02,.3,.48,.3,true);part(elbow,rock,M.ink,0,-.53,.08,.37,.28,.36);arms.push({upper:arm,lower:elbow});const leg=group(body,sign*.37,.9,0);part(leg,rock,M.stone,0,-.22,0,.33,.5,.31);const knee=group(leg,0,-.42,0);part(knee,rock,M.green,0,-.21,0,.28,.43,.3);part(knee,rock,M.ink,0,-.38,.12,.35,.15,.43);legs.push({upper:leg,lower:knee});}
 curve(torso,[[0,.7,.43],[-.15,.35,.49],[.12,.05,.52],[-.06,-.25,.48],[.1,-.6,.34]],M.ember,.022);
 for(let i=0;i<12;i++)part(torso,rock,M.moss,-.6+(i%4)*.13,.73+Math.sin(i)*.05,-.2+Math.floor(i/4)*.15,.14,.045,.1);
 return{root,body,torso,head,arms,legs,type:'oni'};}
function disposeModel(root){root.traverse(o=>{if(o.isMesh){if(![cube,sphere,rock].includes(o.geometry))o.geometry.dispose();if(!Object.values(M).includes(o.material))o.material.dispose();}});}
// Danger zones read as heat rising off the stone: a hot rim, a faint fill and inward pulses.
function auraMaterial(color){return new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:{tint:{value:new THREE.Color(color)},alpha:{value:1},time:{value:0}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 tint;uniform float alpha;uniform float time;varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;float rim=smoothstep(.9,.965,r)*(1.-smoothstep(.975,1.,r));float fill=pow(r,3.)*.2*(1.-step(1.,r));float pulse=.5+.5*sin(r*24.+time*8.);float a=(rim*1.6+fill*(.45+.55*pulse))*alpha;gl_FragColor=vec4(tint*2.4*a,a);}'});}
export class InkWorld {
 constructor(canvas){
  this.canvas=canvas;this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.mobile=!!globalThis.matchMedia?.('(pointer:coarse)').matches;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.scene=new THREE.Scene();this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.04;this.scene.background=new THREE.Color('#26373f');this.scene.fog=new THREE.FogExp2('#26373f',.022);this.camera=new THREE.PerspectiveCamera(48,1,.1,170);this.camera.position.set(7,4.8,11);this.camera.lookAt(0,1,0);this.orbitYaw=0;this.orbitPitch=.34;this.distance=7.2;this.target=new THREE.Vector3();this.lastCameraMode='';this.effects=[];this.petals=[];this.occluders=[];this.clock=0;this.shake=0;
  const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.environmentMap=pmrem.fromScene(room,.04);this.scene.environment=this.environmentMap.texture;this.scene.environmentIntensity=.38;room.dispose();pmrem.dispose();this.hemisphere=new THREE.HemisphereLight('#b3cadc','#171a20',.8);this.scene.add(this.hemisphere);const sun=new THREE.DirectionalLight('#c8dff2',2.4);sun.position.set(-9,17,6);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:1,far:70});sun.shadow.bias=-.0007;sun.shadow.normalBias=.045;this.scene.add(sun);this.sun=sun;this.scene.add(sun.target);const rim=new THREE.DirectionalLight('#cf9b69',.8);rim.position.set(8,9,-12);this.scene.add(rim);this.rim=rim;
  this.combatVFX=new CombatVFX(this.scene);this.enemyThreats=new EnemyThreats(this.scene);this.feedback=new ImpactFeedback(this.scene);this.ultimate=new UltimateFX(this.scene,{mobile:this.mobile});this.heroArts=new HeroArts(this.scene);this.buildEnvironment();this.rain.visible=false;this.atmosphere=new Atmosphere(this.scene,{lanterns:this.fireLights.map(l=>l.position),mobile:this.mobile});this.player=human();this.scene.add(this.player.root);this.setEnemy('oni');this.assetsLoaded=false;this.assetsReady=this.loadAssets();
  this.lockRing=new THREE.Mesh(new THREE.RingGeometry(.66,.69,64),new THREE.MeshBasicMaterial({color:'#d9c6a1',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));this.lockRing.rotation.x=-Math.PI/2;this.lockRing.position.y=.045;this.scene.add(this.lockRing);
  this.telegraph=new THREE.Mesh(new THREE.CircleGeometry(1,72),auraMaterial('#ff4b2b'));this.telegraph.onBeforeRender=()=>{const u=this.telegraph.material.uniforms;u.alpha.value=this.telegraph.material.opacity;u.time.value=this.clock;};this.telegraph.rotation.x=-Math.PI/2;this.telegraph.position.y=.055;this.scene.add(this.telegraph);
  this.slashGeometry=new THREE.RingGeometry(1.35,1.52,36,1,0,Math.PI*1.2);
  this.makePost();this.resize();
 }
 makePost(){this.post=new PostFX(this.renderer,{mobile:this.mobile});this.postMaterial=this.post.final;}
 buildEnvironment(){buildTemple(this, mountainGeometry);}
 async loadAssets(){
  const [hero,monster,ronin,wolfModel]=await Promise.all(['hero','oni','ronin','wolf'].map(loadCharacter));
  this.scene.remove(this.player.root);disposeModel(this.player.root);this.player=hero;this.scene.add(hero.root);this.generatedMonster=monster;this.generatedEnemies={oni:monster,ronin,wolf:wolfModel};this.weaponTrails=new WeaponTrails(this.scene,hero,monster,ronin);this.dodgeEchoes=new DodgeEchoes(this.scene,hero);this.enemyEchoes=Object.fromEntries(Object.entries(this.generatedEnemies).map(([id,m])=>[id,new DodgeEchoes(this.scene,m)]));this.campaignField=new CampaignField(this);this.assetsLoaded=true;this.setEnemy(this.enemyKind);
  // Role bodies arrive in their own time; the campaign uses each one from the next foe it dresses.
  this.skins={};for(const name of SKINS)loadSkin(name).then(model=>{if(model)this.skins[name]=model;});
 }
 setEnemy(type){for(const echoes of Object.values(this.enemyEchoes||{}))echoes.clear();this.enemyKind=type;if(this.enemy){this.scene.remove(this.enemy.root);if(!this.enemy.generated)disposeModel(this.enemy.root);}this.enemy=this.generatedEnemies?.[type]||(type==='wolf'?wolf():type==='oni'?oni():human(true));this.weaponTrails?.clear();this.scene.add(this.enemy.root);}

 resize(){const r=this.canvas.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());this.post?.setSize(size.x,size.y);}
 resetCamera(){this.campaignField?.reset();for(const m of [this.player,...Object.values(this.generatedEnemies||{})]){m.motionTransition=null;m.footwork=null;m.clothMotion=null;m.lastMotion=null;}this.combatVFX.clear();for(const echoes of Object.values(this.enemyEchoes||{}))echoes.clear();this.enemyThreats.clear();this.dodgeEchoes?.clear();this.lockYaw=null;this.weaponTrails?.clear();this.feedback.clear();this.ultimate.clear();this.heroArts.clear();this.shake=0;for(const fx of this.effects){this.scene.remove(fx.mesh);fx.material?.dispose();if(fx.ring)fx.mesh.geometry.dispose();}this.effects=[];this.lastCameraMode='';this.orbitYaw=0;this.orbitPitch=.34;this.distance=7.2;}
 orbit(dx,dy){this.orbitYaw-=dx*.006;this.orbitPitch=clamp(this.orbitPitch+dy*.004,.14,.82);}
 movement(x,z,locked=false,player,enemy){let yaw=this.orbitYaw;if(locked&&player&&enemy)yaw=Math.atan2(player.x-enemy.x,player.z-enemy.z);const right={x:Math.cos(yaw),z:-Math.sin(yaw)},forward={x:-Math.sin(yaw),z:-Math.cos(yaw)};return{x:right.x*x+forward.x*z,z:right.z*x+forward.z*z};}
 animateModel(model,actor,t,dt,isPlayer){if(model.generated){animateCharacter(model,actor,t,dt);return;}const {root,body,arms,legs,torso,head}=model;root.position.set(actor.x,0,actor.z);root.rotation.y=actor.yaw;const walk=actor.speed>0?Math.sin(t*actor.speed*3.2):0;
  body.position.y=actor.speed>0?Math.abs(walk)*.045:Math.sin(t*2)*.012;body.rotation.set(0,0,0);
  if(actor.state==='dead'){body.rotation.z=isPlayer?-1.45:1.45;body.position.y=.22;}
  else if(actor.state==='roll'){const progress=1-actor.timer/actor.total;body.rotation.x=-progress*TAU;body.position.y=.55;root.rotation.y=Math.atan2(actor.rollX,actor.rollZ);}
  else if(actor.state==='hurt'||actor.state==='stagger'){body.rotation.x=-.16;body.rotation.z=Math.sin(t*21)*.035;}
  if(actor.flash>0)root.scale.setScalar(1+Math.sin(t*70)*.012);else root.scale.setScalar(1);
  for(let i=0;i<legs.length;i++){legs[i].upper.rotation.x=walk*(i%2?1:-1)*(model.type==='wolf'?.7:.5);legs[i].lower.rotation.x=Math.max(0,-walk*(i%2?1:-1))*.5;}
  if(model.type==='wolf'){model.tail.rotation.y=Math.sin(t*3)*.22;head.rotation.x=actor.state==='windup'?.2:actor.state==='attack'?-.2:0;if(actor.state==='windup')body.position.y=-.15;if(actor.state==='attack')body.position.y=Math.sin((1-actor.timer/actor.total)*Math.PI)*.45;return;}
  const progress=actor.total>0?clamp(1-actor.timer/actor.total,0,1):0;
  for(let i=0;i<arms.length;i++){arms[i].upper.rotation.set(-.08+walk*(i%2?-.3:.3),0,i%2?-.12:.12);arms[i].lower.rotation.x=-.2;}
  if(torso)torso.rotation.y=0;
  if(model.type==='human'){
   arms[1].upper.rotation.x=-.25;arms[1].lower.rotation.x=-.55;
   if(['light','heavy','special','attack'].includes(actor.state)){
    const heavy=actor.state==='heavy'||actor.state==='special';const cut=progress<.4?progress/.4:1-(progress-.4)/.6;
    torso.rotation.y=(progress<.42?-.65:1.1*(1-progress));arms[1].upper.rotation.x=heavy?-1.8+Math.sin(progress*Math.PI)*2.3:-.8;arms[1].upper.rotation.z=-.6+Math.sin(progress*Math.PI)*1.45;arms[1].upper.rotation.y=-1.15+progress*3.0;arms[1].lower.rotation.x=-.6+progress*.9;
    arms[0].upper.rotation.x=-.5;arms[0].upper.rotation.z=.3;
   }else if(actor.state==='windup'){arms[1].upper.rotation.x=-1.5;arms[1].upper.rotation.z=-.6;arms[1].lower.rotation.x=-.5;torso.rotation.y=-.5;}
   else if(actor.state==='guard'){arms[1].upper.rotation.x=-1.1;arms[1].upper.rotation.y=-.5;arms[1].upper.rotation.z=.5;arms[0].upper.rotation.x=-1;arms[0].lower.rotation.x=-.7;}
   else if(actor.state==='heal'){arms[0].upper.rotation.x=-1.3;arms[0].lower.rotation.x=-1;}
   for(const cloth of[model.cape,model.scarf]){const attr=cloth.geometry.attributes.position,orig=cloth.userData.original;for(let i=0;i<attr.count;i++){const v=-orig[i*3+1];attr.setZ(i,orig[i*3+2]+Math.sin(t*4+orig[i*3]*5+v*5)*v*.065+actor.speed*.018*v);}attr.needsUpdate=true;}
  }else if(model.type==='oni'){
   if(actor.state==='windup'){arms.forEach((a,i)=>{a.upper.rotation.x=-2.2*(1-actor.timer/actor.total);a.upper.rotation.z=i?-.2:.2;});body.rotation.x=.1;}
   if(actor.state==='attack'){arms.forEach(a=>{a.upper.rotation.x=-2.2+Math.sin(progress*Math.PI*.8)*2.8;});body.rotation.x=Math.sin(progress*Math.PI)*.28;}
  }
 }
 effect(event,game){const e=event;this.feedback.emit(e,game);this.combatVFX.emit(e,game);this.heroArts.emit(e,game,this);
  if(e.type==='perfect-dodge'){const material=new THREE.MeshBasicMaterial({color:'#ead19b',transparent:true,opacity:.65,depthWrite:false,side:THREE.DoubleSide});const mesh=new THREE.Mesh(new THREE.RingGeometry(.7,.75,48),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(e.x,.045,e.z);this.scene.add(mesh);this.effects.push({mesh,material,life:.3,max:.3,ring:true});}

  if((e.type==='swing'||e.type==='special')&&!this.player.generated||e.type==='enemy-swing'&&!this.enemy.generated){
   const actor=e.type==='enemy-swing'?game.enemy:game.player,heavy=e.heavy||e.type==='special';const mat=new THREE.MeshBasicMaterial({color:e.type==='enemy-swing'?'#a5523b':e.type==='special'?'#ac573b':'#d9dec9',side:THREE.DoubleSide,transparent:true,opacity:.8,depthWrite:false});const mesh=new THREE.Mesh(this.slashGeometry,mat);const g=group(this.scene,actor.x,1.1,actor.z);g.rotation.y=actor.yaw;mesh.rotation.x=heavy?-.9:-Math.PI/2;mesh.rotation.z=-.6;mesh.position.z=.6;g.add(mesh);if(heavy)g.scale.setScalar(e.type==='special'?2:1.3);this.effects.push({mesh:g,material:mat,life:heavy?.55:.35,max:heavy?.55:.35,delay:e.type==='swing'?(heavy?.25:.13):.05,slash:true});g.visible=false;
  }
  if(e.type==='slam'||e.type==='stagger'){const mat=new THREE.MeshBasicMaterial({color:'#a3573c',side:THREE.DoubleSide,transparent:true,opacity:.65,depthWrite:false});const mesh=new THREE.Mesh(new THREE.RingGeometry(.85,1,64),mat);mesh.rotation.x=-Math.PI/2;mesh.position.set(e.x,.06,e.z);this.scene.add(mesh);this.effects.push({mesh,material:mat,life:.7,max:.7,ring:true});this.shake=.13;}
 }
 update(game,{mode='title',locked=true,dt=.016,paused=false}={}){const step=paused?0:dt,motionStep=game.status==='playing'&&game.hitStop>0?0:step;this.clock+=motionStep;const t=this.clock;const title=mode==='title';
  const p=title?{x:4.2,z:1.8,yaw:.5,state:'idle',speed:0,flash:0}:game.player;const e=title?{x:1.6,z:-3.6,yaw:.2,state:'idle',speed:0,flash:0}:game.enemy;
  const battle=!!game.campaign&&!title;const ult=title?null:game.ultimate?.(),enemyStep=ult?.charging?0:motionStep;this.campaignField?.update(game,t,enemyStep,battle);this.enemy.root.visible=!battle;if(battle){const target=this.campaignField.models.get(e.id);this.campaignTarget=target;}else this.campaignTarget=null;
  this.sun.position.set(p.x-9,17,p.z+6);this.sun.target.position.set(p.x,0,p.z);this.rain.position.z=battle?p.z:0;
  updateTemple(this,motionStep,t,[p,e]);this.animateModel(this.player,p,t,motionStep,true);if(!battle)this.animateModel(this.enemy,e,t,enemyStep,false);this.weaponTrails?.update(motionStep,p,e,this.campaignTarget||this.enemy);const age=p.total-p.timer,move=playerMove(p),burst=['heavy','special','light'].includes(p.state)&&['heavy','spin','riposte','execute','dashCut','rising','sweep'].includes(move.id)&&age>=move.impact-.045&&age<move.impact+.16,whirl=!!ult&&!ult.charging&&age<move.impact-.2;
  this.dodgeEchoes?.update(motionStep,p,{active:p.state==='roll'||p.state==='dash'||burst||whirl,start:['roll','dash'].includes(p.state)?.035:whirl?ult.charge+.08:move.impact-.045});
  for(const [id,echoes] of Object.entries(this.enemyEchoes||{}))echoes.update(motionStep,e,{active:!battle&&id===this.enemyKind&&e.state==='attack'&&(e.moveData?.speed>6||e.moveData?.advance>5),start:.08});
  this.combatVFX.update(step,game,!title);
  for(const [model,actor] of [[this.player,p],[this.enemy,e]]){if(!model.generated&&actor.impact?.time>0&&actor.state!=='dead'){const hit=actor.impact,k=Math.pow(hit.time/hit.total,1.7)*hit.strength;const localZ=hit.dirX*Math.sin(actor.yaw)+hit.dirZ*Math.cos(actor.yaw);model.body.rotation.x+=localZ*.38*k;model.body.rotation.z+=(hit.id%2?1:-1)*.15*k;}}
  for(const leaf of this.petals){leaf.position.x-=step*leaf.userData.speed;leaf.position.y+=Math.sin(t+leaf.userData.phase)*step*.15;leaf.rotation.set(t*.4,leaf.userData.phase,t*.2);if(leaf.position.x<-19)leaf.position.x=19;}
  this.lockRing.visible=!title&&locked&&e.hp>0&&game.status==='playing';this.lockRing.position.set(e.x,.04,e.z);this.lockRing.material.color.set(e.exposed?'#e6ae54':'#d9c6a1');this.lockRing.scale.setScalar((game.spec.id==='oni'?1.9:1.1)*(e.scale||1));
  this.enemyThreats.update(game,!title&&game.status==='playing');
  this.telegraph.visible=!title&&e.state==='windup'&&!e.moveData?.lane;if(this.telegraph.visible){const slam=e.kind==='slam';const size=slam?(e.moveData?.range||4.1):game.spec.range*.72;this.telegraph.position.set(e.x,.06,e.z);this.telegraph.scale.setScalar(size);this.telegraph.material.opacity=.25+(1-e.timer/e.total)*.6;}
  for(const fx of this.effects){if(fx.delay>0){fx.delay-=step;continue;}fx.mesh.visible=true;fx.life-=step;const k=Math.max(0,fx.life/fx.max);if(fx.velocity){fx.mesh.position.addScaledVector(fx.velocity,step);fx.velocity.y-=step*8;fx.mesh.scale.multiplyScalar(Math.pow(.3,step));}if(fx.material)fx.material.opacity=k*.8;if(fx.slash)fx.mesh.rotation.y+=step*3.4;if(fx.ring)fx.mesh.scale.setScalar(1+(1-k)*4);}
  this.effects=this.effects.filter(fx=>{if(fx.life>0)return true;this.scene.remove(fx.mesh);fx.material?.dispose();if(fx.ring)fx.mesh.geometry.dispose();return false;});
  this.feedback.restoreCamera(this.camera);const shot=this.ultimate.update(step,title?null:game,this);this.heroArts.update(step,title?null:game,this);if(paused)this.ultimate.settle(dt);
  // Nothing may stand between the lens and the hero's face during the close-up.
  if(shot?.position){const a=shot.position,dx=p.x-a.x,dz=p.z-a.z,blocks=v=>{const u=clamp(((v.x-a.x)*dx+(v.z-a.z)*dz)/(dx*dx+dz*dz),-.25,.85);return Math.hypot(a.x+dx*u-v.x,a.z+dz*u-v.z)<v.radius+.75;};
   if(battle){for(const foe of game.enemies)if(blocks(foe)){const m=this.campaignField.models.get(foe.id);if(m)m.root.visible=false;}}else if(blocks(e))this.enemy.root.visible=false;}
const camPos=new THREE.Vector3(),look=new THREE.Vector3();const baseFov=this.camera.aspect<.8?60:48,speedFov=title?0:['roll','dash'].includes(p.state)?3.5:Math.max(0,Math.min(2.5,((p.speed||0)-3)*1.3)),cutFov=burst?1.4:0,desiredFov=shot?.fov??baseFov+speedFov+cutFov+this.ultimate.pull*7;if(Math.abs(this.camera.fov-desiredFov)>.001){this.camera.fov+= (desiredFov-this.camera.fov)*(shot?.cut||shot?.fov?1:1-Math.exp(-step*10));this.camera.updateProjectionMatrix();}
  if(title){camPos.set(7.8+Math.sin(t*.045)*.6,4.3,10);look.set(this.camera.aspect<.8?2.5:.5,1.15,.1);}
  else if(locked&&e.hp>0){
   const desiredYaw=Math.atan2(p.x-e.x,p.z-e.z)+.17;if(this.lockYaw==null||this.lastCameraMode!==mode)this.lockYaw=desiredYaw;const delta=Math.atan2(Math.sin(desiredYaw-this.lockYaw),Math.cos(desiredYaw-this.lockYaw));this.lockYaw+=delta*(1-Math.exp(-step*5));const yaw=this.lockYaw;this.orbitYaw=yaw;const dist=Math.hypot(p.x-e.x,p.z-e.z);look.set(p.x+(e.x-p.x)*.4,1.05,p.z+(e.z-p.z)*.4);const back=clamp((battle?6.2:4.9)+dist*.24,battle?7:5.8,battle?10:8.8);camPos.set(p.x+Math.sin(yaw)*back,(battle?3.8:2.9)+dist*.12,p.z+Math.cos(yaw)*back);
  }else{look.set(p.x,1.25,p.z);camPos.set(p.x+Math.sin(this.orbitYaw)*this.distance*Math.cos(this.orbitPitch),1.2+Math.sin(this.orbitPitch)*this.distance,p.z+Math.cos(this.orbitYaw)*this.distance*Math.cos(this.orbitPitch));}
  // The ultimate owns the camera while ink gathers, then hands it back pulled wide for the release.
  if(shot?.position){camPos.copy(shot.position);look.copy(shot.look);}else if(this.ultimate.pull>.001){const pull=this.ultimate.pull;camPos.sub(look).multiplyScalar(1+pull*.2).add(look);camPos.y+=pull*.35;}
  const blend=this.lastCameraMode!==mode||shot?.cut||shot?.position?1:1-Math.exp(-step*6);this.camera.position.lerp(camPos,blend);this.target.lerp(look,blend);this.lastCameraMode=mode;
  if(this.shake>0&&!paused){this.camera.position.x+=(Math.random()-.5)*this.shake;this.camera.position.y+=(Math.random()-.5)*this.shake;this.shake=Math.max(0,this.shake-step*.4);}
  this.camera.lookAt(this.target);this.feedback.update(step,this.camera);if(!paused)this.feedback.applyCamera(this.camera);const pu=this.post.uniforms;pu.damage.value=this.feedback.damage;pu.impact.value=Math.min(1,this.feedback.shake*5);pu.time.value=this.clock;pu.ult.value=this.ultimate.dark;pu.lines.value=this.ultimate.lines;pu.flash.value=this.ultimate.flash;pu.focus.value+=((paused||title?0:game.hitStop>0?1:0)-pu.focus.value)*.25;this.atmosphere.update(step,this.clock,this.camera,p);this.renderer.toneMappingExposure=1.04+this.atmosphere.flash*.35;for(const prop of this.occluders)prop.visible=Math.hypot(prop.position.x-this.camera.position.x,prop.position.z-this.camera.position.z)>3.1;this.sceneStats=this.post.render(this.scene,this.camera);
 }
 screenPoint(x,y,z){const v=new THREE.Vector3(x,y,z).project(this.camera);return{x:(v.x+1)*.5,y:(1-v.y)*.5,visible:v.z<1&&v.z>-1&&Math.abs(v.x)<.96&&Math.abs(v.y)<.9};}
 enemyScreen(enemy){const v=new THREE.Vector3(enemy.x,this.enemy.type==='oni'?2.25:1.3,enemy.z).project(this.camera);return{x:(v.x+1)*.5,y:(1-v.y)*.5,visible:v.z<1&&v.z>-1&&Math.abs(v.x)<1&&Math.abs(v.y)<1};}

 snapshot(){return{renderer:'WebGL / Three.js',revision:THREE.REVISION,drawCalls:this.sceneStats?.calls,camera:this.camera.position.toArray(),player:this.player.root.position.toArray(),enemy:(this.campaignTarget||this.enemy).root.position.toArray(),triangles:this.sceneStats?.triangles,assetsReady:this.assetsLoaded,heroAsset:this.player.asset||null,enemyAsset:this.enemy.asset||null,campaignModels:this.campaignField?.models.size||0,heroBones:this.player.skeleton?.bones.length||0,footwork:this.player.footwork?{mode:this.player.footwork.mode,errors:this.player.footwork.feet.map(f=>f.error),targets:this.player.footwork.feet.map(f=>f.target?.toArray())}:null,enemyBones:this.enemy.skeleton?.bones.length||0,dodgeEchoes:this.dodgeEchoes?.snapshot(),fov:this.camera.fov,vfx:this.combatVFX.snapshot(),enemyEchoes:this.enemyEchoes?.[this.enemyKind]?.snapshot(),threats:this.enemyThreats.snapshot(),feedback:this.feedback.snapshot(),atmosphere:this.atmosphere.snapshot(),ultimate:this.ultimate.snapshot(),arts:this.heroArts.snapshot(),hdr:this.post.hdr};}
}
