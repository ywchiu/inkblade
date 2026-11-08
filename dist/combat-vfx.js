import * as THREE from './vendor/three.module.js';

// Fixed pools keep repeated combos from allocating hundreds of transient meshes.
class ParticlePool {
 constructor(scene,capacity,additive=false){
  this.capacity=capacity;this.cursor=0;this.items=Array.from({length:capacity},()=>({life:0,total:1,position:new THREE.Vector3(),velocity:new THREE.Vector3(),color:new THREE.Color(),size:0}));
  const geometry=new THREE.BufferGeometry();for(const [name,size]of[['position',3],['tint',3],['size',1],['fade',1]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(new Float32Array(capacity*size),size));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,
   vertexShader:'attribute vec3 tint; attribute float size; attribute float fade; varying vec3 vTint; varying float vFade; void main(){vTint=tint;vFade=fade;vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*500./max(1.,-p.z),1.,64.);gl_Position=projectionMatrix*p;}',
   fragmentShader:'varying vec3 vTint; varying float vFade; void main(){vec2 p=gl_PointCoord-.5;float r=length(p)*2.;float feather=pow(max(0.,1.-r*r),2.);float ink=.75+.25*sin(p.x*21.+sin(p.y*17.)*2.);float a=feather*ink*vFade;if(a<.008)discard;gl_FragColor=vec4(vTint,a);}'
  });
  this.mesh=new THREE.Points(geometry,material);this.mesh.frustumCulled=false;scene.add(this.mesh);this.additive=additive;
 }
 emit(position,velocity,color,size,life){const p=this.items[this.cursor++%this.capacity];p.position.copy(position);p.velocity.copy(velocity);p.color.set(color);p.size=size;p.total=p.life=life;}
 update(dt){const a=this.mesh.geometry.attributes;let active=0;this.items.forEach((p,i)=>{
  p.life=Math.max(0,p.life-dt);const alive=p.life>0,k=p.life/p.total;
  if(alive){active++;p.position.addScaledVector(p.velocity,dt);p.velocity.multiplyScalar(Math.exp(-dt*(this.additive?1.8:2.5)));p.velocity.y-=dt*(this.additive?3:.08);if(p.position.y<.04){p.position.y=.04;p.velocity.y=Math.abs(p.velocity.y)*.16;}}
  a.position.setXYZ(i,p.position.x,p.position.y,p.position.z);a.tint.setXYZ(i,p.color.r,p.color.g,p.color.b);a.size.setX(i,p.size*(this.additive?1:.7+(1-k)*1.6));a.fade.setX(i,alive?Math.pow(k,this.additive?1.5:1.2)*(this.additive?.95:.43):0);
 });for(const attr of Object.values(a))attr.needsUpdate=true;this.mesh.visible=active>0;this.active=active;}
 clear(){this.items.forEach(p=>p.life=0);this.update(0);}
}
export class CombatVFX {
 constructor(scene){
  this.smoke=new ParticlePool(scene,320);this.sparks=new ParticlePool(scene,192,true);this.stepTimers=[0,0];this.last=[null,null];this.shotTimer=0;
  this.rings=Array.from({length:6},()=>{const mesh=new THREE.Mesh(new THREE.RingGeometry(.88,1,64),new THREE.MeshBasicMaterial({color:'#a0b1ad',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return{mesh,life:0,total:.45,size:1};});this.ringCursor=0;
 }
 dust(x,z,count=12,power=1,dirX=0,dirZ=0){for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,r=Math.random()*.25;this.smoke.emit(new THREE.Vector3(x+Math.sin(a)*r,.09,z+Math.cos(a)*r),new THREE.Vector3(Math.sin(a)*power+dirX,.22+Math.random()*.55,Math.cos(a)*power+dirZ),i%3?'#607073':'#152227',.25+Math.random()*.3,.28+Math.random()*.42);}}
 ring(x,z,size,color='#bac5b4'){const r=this.rings[this.ringCursor++%this.rings.length];r.life=r.total=.42;r.size=size;r.mesh.position.set(x,.065,z);r.mesh.material.color.set(color);}
 emit(e,game){
  const enemy=game.enemies?.find(a=>a.id===e.enemyId)||game.enemy;
  if(e.type==='dash'){const p=game.player;this.dust(p.x,p.z,28,1.4,-Math.sin(p.yaw)*2,-Math.cos(p.yaw)*2);}
  if(e.type==='roll'){const p=game.player;this.dust(p.x,p.z,24,1.2,-p.rollX*1.5,-p.rollZ*1.5);}
  if(e.type==='enemy-swing'&&(enemy.moveData?.speed>6||enemy.moveData?.advance>5))this.dust(e.x,e.z,24,1.2,-Math.sin(e.yaw)*2,-Math.cos(e.yaw)*2);
  if(e.type==='slam'){this.dust(e.x,e.z,44,4);this.ring(e.x,e.z,4,'#a78c67');}
  if(e.type==='perfect-dodge'){this.dust(e.x,e.z,18,1.6);this.ring(e.x,e.z,1.4,'#c4d9d8');}
  if(!['hit','special-hit','counter-hit','execution-hit','parry','block','hurt'].includes(e.type)||e.type==='hurt'&&e.blocked)return;
  const player=e.target==='player',a=player?game.player:enemy,heavy=e.heavy||['special-hit','execution-hit'].includes(e.type),metal=['parry','block'].includes(e.type),kind=a.kindId||game.spec.id,height=player?1.15:kind==='oni'?1.75:kind==='wolf'?.85:1.2;
  const origin=new THREE.Vector3(a.x-(e.dirX||0)*.25,height,a.z-(e.dirZ||0)*.25),count=heavy?38:metal?26:16;
  for(let i=0;i<count;i++){const v=new THREE.Vector3((Math.random()-.5)*4+(e.dirX||0)*2,.5+Math.random()*3,(Math.random()-.5)*4+(e.dirZ||0)*2);this.sparks.emit(origin,v,metal?'#ffe6a7':player?'#d66c47':'#eed4a0',.035+Math.random()*.075,.2+Math.random()*.35);}
  for(let i=0;i<(heavy?18:8);i++)this.smoke.emit(origin,new THREE.Vector3((Math.random()-.5)*2,.3+Math.random(),(Math.random()-.5)*2),i%2?'#718184':'#152127',.25+Math.random()*.3,.3+Math.random()*.35);
  if(heavy){this.dust(a.x,a.z,22,2);this.ring(a.x,a.z,e.type==='execution-hit'?2.8:1.8);}
 }
 update(dt,game,visible){
  if(!visible){this.clear();return;}if(dt<=0)return;
  if(!game.hitStop&&game.status==='playing')for(const [i,a]of[game.player,game.enemy].entries()){
   this.stepTimers[i]-=dt;const last=this.last[i],dx=last?a.x-last.x:0,dz=last?a.z-last.z:0,d=Math.hypot(dx,dz),fast=a.state==='roll'||a.state==='dash'||a.state==='attack'&&(a.speed>6||a.moveData?.advance>5);
   const running=a.speed>2&&['idle','guard'].includes(a.state);
   if((running||fast)&&this.stepTimers[i]<=0){this.dust(a.x,a.z,fast?5:3,fast?.5:.25,d>.001?-dx/d*.6:0,d>.001?-dz/d*.6:0);this.stepTimers[i]=fast?.045:a.speed>4?.13:.22;}
   this.last[i]={x:a.x,z:a.z};
  }
  this.shotTimer-=dt;if(!game.hitStop&&game.status==='playing'&&this.shotTimer<=0){this.shotTimer=.035;for(const s of game.projectiles){const origin=new THREE.Vector3(s.x,s.style==='fissure'?.15:s.style==='howl'?.85:1.1,s.z);if(s.style==='fissure')this.dust(s.x,s.z,3,.3);else for(let i=0;i<3;i++)this.smoke.emit(origin,new THREE.Vector3(-Math.sin(s.yaw)*.8,(Math.random()-.5)*.4,-Math.cos(s.yaw)*.8),s.style==='howl'?'#8aa7ac':'#b6aa8b',.12+Math.random()*.2,.18+Math.random()*.2);}}
  this.smoke.update(dt);this.sparks.update(dt);for(const r of this.rings){r.life=Math.max(0,r.life-dt);r.mesh.visible=r.life>0;const k=1-r.life/r.total;r.mesh.scale.setScalar(.3+k*r.size);r.mesh.material.opacity=(1-k)*.2;}
 }
 clear(){this.smoke.clear();this.sparks.clear();this.rings.forEach(r=>{r.life=0;r.mesh.visible=false;});this.last=[null,null];this.stepTimers=[0,0];this.shotTimer=0;}
 snapshot(){return{smoke:this.smoke.active||0,sparks:this.sparks.active||0,rings:this.rings.filter(r=>r.life>0).length};}
}
