import * as THREE from './vendor/three.module.js';
import { clone } from './vendor/addons/utils/SkeletonUtils.js';
import { attachMixer } from './rigged-character3d.js';
import { ROLES } from './campaign3d.js';
import { JourneyScenery } from './journey-scenery3d.js';
// Share heavy geometry and textures, keep skeletons and flash materials independent.
export function cloneFighter(source){
 const root=clone(source.root),lookup=new Map();const pair=(a,b)=>{lookup.set(a,b);a.children.forEach((c,i)=>pair(c,b.children[i]));};pair(source.root,root);
 const remap=v=>v?.isObject3D?lookup.get(v):Array.isArray(v)?v.map(remap):v&&v.constructor===Object?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,remap(x)])):v;
 const result={};for(const key of ['root','body','hips','spine','cape','skirt','soleClearance','torso','head','neck','arms','legs','tail','tailMid','tailTip','meshes','weapon','height','lie','type','kind','generated','asset','scene','rigged','clips','clipInfo','moves','flashColor'])result[key]=remap(source[key]);
 result.skeleton=result.meshes[0].skeleton;result.phase=0;result.deathProgress=0;
 for(const mesh of result.meshes)mesh.material=mesh.material.clone();if(result.rigged)attachMixer(result);return result;
}
// The campaign's fighters: one model per foe on the road, pooled by body and dressed for its role.
// The road itself (ground, gates, props, pickups, weather) is JourneyScenery.
export class CampaignField {
 constructor(world){this.world=world;this.models=new Map();this.pool={};this.scenery=new JourneyScenery(world);
  const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(.35,'rgba(255,255,255,.28)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);this.haloMap=new THREE.CanvasTexture(c);
  // A fallen lamp-thrall's name burns out where it fell: a ring that fills until it bursts.
  this.bursts=[];for(let i=0;i<6;i++){const ring=new THREE.Mesh(new THREE.RingGeometry(.9,1,56),new THREE.MeshBasicMaterial({color:'#ff9a4a',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending})),fill=new THREE.Mesh(new THREE.CircleGeometry(1,56),new THREE.MeshBasicMaterial({color:'#ff7a2a',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));for(const m of [ring,fill]){m.rotation.x=-Math.PI/2;m.visible=false;world.scene.add(m);}this.bursts.push({ring,fill});}
 }
 // Size, colour and glow are the role's; the mesh colours a pooled body arrived with are kept to restore.
 dress(m,def){m.role=def;m.root.scale.setScalar(def.scale||1);const tint=def.tint&&!m.own?new THREE.Color(def.tint):null;if(tint)tint.multiplyScalar((def.bright||1.12)/Math.max(tint.r,tint.g,tint.b));
  for(const mesh of m.meshes){mesh.userData.plain??=mesh.material.color.clone();mesh.material.color.copy(mesh.userData.plain);if(tint)mesh.material.color.multiply(tint);}
  if(def.aura){if(!m.aura){m.aura=new THREE.Sprite(new THREE.SpriteMaterial({map:this.haloMap,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));m.root.add(m.aura);}m.aura.material.color.set(def.aura);m.aura.position.set(0,m.height*.62,0);m.aura.scale.setScalar(m.height*1.5);m.aura.visible=true;}else if(m.aura)m.aura.visible=false;
 }
 release(m){m.root.visible=false;if(m.warning)m.warning.visible=false;(this.pool[m.look]??=[]).push(m);}
 update(game,t,dt,active){this.scenery.update(game,t,dt,active);if(!active){for(const m of this.models.values()){m.root.visible=false;if(m.warning)m.warning.visible=false;}for(const b of this.bursts)b.ring.visible=b.fill.visible=false;return;}
  const ids=new Set(game.enemies.map(e=>e.id));for(const [id,m]of this.models)if(!ids.has(id)){this.release(m);this.models.delete(id);}
  for(const e of game.enemies){let m=this.models.get(e.id);if(!m){
    // A role with a body of its own wears it once it has loaded; until then, and if it never loads, it is its kind's body in the role's colours.
    const skin=ROLES[e.role].skin,own=skin&&this.world.skins?.[skin],look=own?skin:e.kindId;m=this.pool[look]?.pop()||cloneFighter(own||this.world.generatedEnemies[e.kindId]);m.look=look;m.own=!!own;this.world.scene.add(m.root);m.motionTransition=null;m.footwork=null;m.clothMotion=null;m.lastMotion=null;m.lastAnimationTime=undefined;m.phase=0;m.deathProgress=0;if(!m.warning){m.warning=new THREE.Mesh(new THREE.RingGeometry(.94,1,48),new THREE.MeshBasicMaterial({color:'#ce7953',transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}));m.warning.rotation.x=-Math.PI/2;this.world.scene.add(m.warning);}this.dress(m,ROLES[e.role]);this.models.set(e.id,m);}
   m.warning.visible=e.hp>0&&e.state==='windup'&&e!==game.enemy;m.warning.position.set(e.x,.035,e.z);m.warning.scale.setScalar(e.moveData?.range||(e.kind==='slam'?4.1:e.spec.range));m.warning.material.opacity=.12+(1-e.timer/(e.total||1))*.38;
   // Far-off foes are fog: skip their skeletons until the hero is within sight.
   const near=Math.hypot(e.x-game.player.x,e.z-game.player.z)<70;m.root.visible=near&&(e.hp>0||(e.deadTime||0)<2.6);if(!m.root.visible)continue;this.world.animateModel(m,e,t,dt,false);
   // Late arrivals rise out of the ground rather than popping in.
   const risen=e.arrived==null?1:Math.min(1,(game.time-e.arrived)/.45),scale=m.role.scale||1;m.root.scale.setScalar(scale*(.25+.75*risen*risen*(3-2*risen)));if(m.aura)m.aura.material.opacity=e.hp>0?.55+Math.sin(t*9+e.id)*.12:Math.max(0,.55-(e.deadTime||0));}
  this.bursts.forEach((b,i)=>{const burst=game.bursts[i];b.ring.visible=b.fill.visible=!!burst;if(!burst)return;const k=1-burst.time/burst.total;for(const m of [b.ring,b.fill]){m.position.set(burst.x,.05,burst.z);}b.ring.scale.setScalar(burst.radius);b.fill.scale.setScalar(burst.radius*k);b.ring.material.opacity=.35+k*.55;b.fill.material.opacity=.12+k*.3;});
 }
 reset(){for(const m of this.models.values())this.release(m);this.models.clear();this.scenery.reset();}
}
