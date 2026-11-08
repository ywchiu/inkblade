import * as THREE from './vendor/three.module.js';

// Contact effects have their own real-time clock: the simulation can hit-stop
// without freezing the spark burst or leaving the damage vignette on screen.
export class ImpactFeedback {
 constructor(scene){this.scene=scene;this.effects=[];this.shake=0;this.damage=0;this.clock=0;this.count=0;this.last=null;this.offset=new THREE.Vector3();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d'),g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'#ffffff');g.addColorStop(.25,'#ffffffcc');g.addColorStop(1,'#ffffff00');c.fillStyle=g;c.fillRect(0,0,64,64);this.dot=new THREE.CanvasTexture(canvas);
 }
 emit(event,game){
  if(!['hit','special-hit','counter-hit','execution-hit','hurt','parry','block'].includes(event.type)||event.type==='hurt'&&event.blocked)return;
  const player=event.target==='player',actor=player?game.player:(game.enemies?.find(a=>a.id===event.enemyId)||game.enemy),heavy=event.heavy||event.type==='special-hit',metal=event.type==='parry'||event.type==='block';
  const strength=event.strength||.65,kind=actor.kindId||game.spec.id,y=player?1.2:kind==='oni'?1.75:kind==='wolf'?.9:1.25;
  const origin=new THREE.Vector3(actor.x-(event.dirX||0)*actor.radius*.65,y,actor.z-(event.dirZ||0)*actor.radius*.65);
  const color=metal?'#ffe0a0':player?'#ed7c55':'#ffe9bb';
  const group=new THREE.Group();group.position.copy(origin);this.scene.add(group);
  const count=heavy?26:16,positions=new Float32Array(count*3),velocities=[];
  for(let i=0;i<count;i++){const angle=i/count*Math.PI*2+Math.random()*.3,speed=(heavy?2.6:1.6)+Math.random()*2;velocities.push(new THREE.Vector3(Math.cos(angle)*speed,Math.sin(angle)*speed*.6+.8,(Math.random()-.5)*speed));}
  const particles=new THREE.BufferGeometry();particles.setAttribute('position',new THREE.BufferAttribute(positions,3));
  const ink=new THREE.Points(particles,new THREE.PointsMaterial({color:player?'#7b231b':'#282824',map:this.dot,size:heavy?.22:.14,transparent:true,opacity:.95,depthWrite:false}));group.add(ink);
  const rays=[],rayCount=heavy?12:8;
  for(let i=0;i<rayCount;i++){const angle=i/rayCount*Math.PI*2;const length=.26+Math.random()*(heavy?.65:.35);rays.push(Math.cos(angle)*.07,Math.sin(angle)*.07,0,Math.cos(angle)*length,Math.sin(angle)*length,0);}
  const rayGeo=new THREE.BufferGeometry();rayGeo.setAttribute('position',new THREE.Float32BufferAttribute(rays,3));
  const burst=new THREE.LineSegments(rayGeo,new THREE.LineBasicMaterial({color,transparent:true,opacity:1,depthWrite:false,toneMapped:false}));group.add(burst);
  const flash=new THREE.Mesh(new THREE.PlaneGeometry(heavy?1.15:.75,heavy?1.15:.75),new THREE.MeshBasicMaterial({color,map:this.dot,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));flash.renderOrder=3;burst.renderOrder=4;group.add(flash);
  const cut=new THREE.Mesh(new THREE.PlaneGeometry(heavy?1.8:1.15,.035),new THREE.MeshBasicMaterial({color,transparent:true,opacity:1,depthWrite:false,toneMapped:false}));cut.renderOrder=4;cut.rotation.z=event.impactId%2?-.55:.55;const slash=new THREE.Group();slash.add(cut);group.add(slash);
  this.effects.push({group,ink,burst,flash,slash,velocities,life:0,total:heavy?.52:.38});
  this.shake=Math.max(this.shake,metal?(event.type==='parry'?.13:.09):player?.20:heavy?.14:.065);if(player&&!metal)this.damage=Math.max(this.damage,heavy?.62:.45);
  this.count++;this.last={type:event.type,target:event.target,heavy,damage:event.damage,position:origin.toArray()};
 }
 update(dt,camera){this.clock+=dt;this.shake=Math.max(0,this.shake-dt*.5);this.damage=Math.max(0,this.damage-dt*1.35);
  this.effects=this.effects.filter(f=>{f.life+=dt;const k=f.life/f.total;if(k>=1){this.scene.remove(f.group);f.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});return false;}
   const a=f.ink.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=f.velocities[i];a.setXYZ(i,v.x*f.life,v.y*f.life-f.life*f.life*3.5,v.z*f.life);}a.needsUpdate=true;
   f.ink.material.opacity=(1-k)*.9;f.burst.quaternion.copy(camera.quaternion);f.burst.scale.setScalar(1+k*.85);f.burst.material.opacity=Math.max(0,1-k*2.5);
   f.flash.quaternion.copy(camera.quaternion);f.flash.material.opacity=Math.max(0,1-f.life/.105)*.85;
   f.slash.quaternion.copy(camera.quaternion);f.slash.children[0].material.opacity=Math.max(0,1-f.life/.16);return true;
  });
 }
 restoreCamera(camera){camera.position.sub(this.offset);this.offset.set(0,0,0);}
 applyCamera(camera){if(this.shake<=0)return;const before=camera.position.clone(),t=this.clock;camera.translateX(Math.sin(t*97)*this.shake);camera.translateY(Math.sin(t*123+.8)*this.shake*.6);camera.translateZ(this.shake*.55);camera.rotateZ(Math.sin(t*83)*this.shake*.025);this.offset.copy(camera.position).sub(before);}
 clear(){for(const f of this.effects){this.scene.remove(f.group);f.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}this.effects=[];this.shake=0;this.damage=0;this.count=0;this.last=null;}
 snapshot(){return{active:this.effects.length,impacts:this.count,shake:this.shake,damageVignette:this.damage,last:this.last};}
}
