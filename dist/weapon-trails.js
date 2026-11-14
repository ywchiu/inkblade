import * as THREE from './vendor/three.module.js';
import { playerMove, monsterVariant } from './attack-moves.js';

// Ribbons follow actual weapon/hand matrices, never an unrelated circular decal.
class Ribbon {
 constructor(scene,node,base,tip,color){
  this.node=node;this.base=base;this.tip=tip;this.samples=[];this.life=.18;this.capacity=72;this.historyLimit=24;
  this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(this.capacity*4*3),3));
  const indices=[];for(let i=0;i<this.capacity-1;i++)for(let col=0;col<3;col++){const a=i*4+col,b=a+4;indices.push(a,b,a+1,b,b+1,a+1);}this.geometry.setIndex(indices);
  this.geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(this.capacity*4*4),4));
  this.material=new THREE.MeshBasicMaterial({color,vertexColors:true,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,transparent:true,opacity:.85,depthWrite:false,toneMapped:false});
  this.material.color.multiplyScalar(1.25);this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.visible=false;scene.add(this.mesh);
 }
 clear(){this.samples=[];this.mesh.visible=false;}
 update(dt,active){
  if(dt<=0)return;for(const sample of this.samples)sample.age+=dt;this.samples=this.samples.filter(s=>s.age<this.life);
  if(active){this.node.updateWorldMatrix(true,false);const base=this.base.clone().applyMatrix4(this.node.matrixWorld),tip=this.tip.clone().applyMatrix4(this.node.matrixWorld),previous=this.samples[0];
   if(previous&&tip.distanceTo(previous.tip)>.25)this.samples.unshift({base:previous.base.clone().lerp(base,.5),tip:previous.tip.clone().lerp(tip,.5),age:dt*.5});
   this.samples.unshift({base,tip,age:0});this.samples.length=Math.min(this.samples.length,this.historyLimit);
  }
  this.mesh.visible=this.samples.length>=2;if(!this.mesh.visible)return;
  const a=this.geometry.attributes.position,c=this.geometry.attributes.color,rows=[0,.78,.94,1],alpha=[0,.08,.72,0];
  const baseCurve=new THREE.CatmullRomCurve3(this.samples.map(s=>s.base)),tipCurve=new THREE.CatmullRomCurve3(this.samples.map(s=>s.tip)),count=Math.min(this.capacity,this.samples.length*3);
  for(let i=0;i<count;i++){const u=i/(count-1),index=u*(this.samples.length-1),lo=Math.floor(index),hi=Math.min(lo+1,this.samples.length-1),age=THREE.MathUtils.lerp(this.samples[lo].age,this.samples[hi].age,index-lo),fade=Math.pow(1-age/this.life,1.6),base=baseCurve.getPoint(u),tip=tipCurve.getPoint(u);for(let j=0;j<4;j++){const v=base.clone().lerp(tip,rows[j]);a.setXYZ(i*4+j,v.x,v.y,v.z);c.setXYZW(i*4+j,1,j===2?1:.85,j===2?1:.62,alpha[j]*fade);}}
  a.needsUpdate=true;c.needsUpdate=true;this.geometry.setDrawRange(0,(count-1)*18);
 }
}
export class WeaponTrails {
 constructor(scene,hero,monster,ronin){this.hero=new Ribbon(scene,hero.weapon,new THREE.Vector3(0,-.5,0),new THREE.Vector3(0,-1.18,0),'#f5dfac');this.ronin=ronin;this.enemySword=ronin?new Ribbon(scene,ronin.weapon,new THREE.Vector3(0,-.45,0),new THREE.Vector3(0,-1.18,0),'#d09a77'):null;this.monster=monster;this.claws=monster.arms.map(arm=>new Ribbon(scene,arm.hand,new THREE.Vector3(0,0,0),new THREE.Vector3(0,-.48,.08),'#b4734b'));}
 clear(){this.hero.clear();this.enemySword?.clear();this.claws.forEach(r=>r.clear());}
 update(dt,p,e,model){const attacking=['light','heavy','special'].includes(p.state),move=playerMove(p),age=p.total-p.timer;const inked=p.state==='special'||attacking&&!!move.art;this.hero.material.color.set(inked?'#e6ad65':'#f5dfac').multiplyScalar(p.state==='special'?1.9:inked?1.6:1.25);this.hero.update(dt,attacking&&age>=move.trailStart&&age<=move.trailEnd);
  if(model?.kind==='ronin'&&this.enemySword)this.enemySword.node=model.weapon;if(model?.kind==='oni')this.claws.forEach((r,i)=>r.node=model.arms[i].hand);
  const variant=monsterVariant(e),progress=e.total>0?1-e.timer/e.total:0;this.enemySword?.update(dt,model?.kind==='ronin'&&e.state==='attack'&&progress>.12&&progress<.7);this.claws.forEach((r,i)=>r.update(dt,model?.kind==='oni'&&e.state==='attack'&&!['slam','fissure'].includes(variant)&&progress<.78&&(variant==='claw-right'?i===0:i===1)));
 }
}
