import * as THREE from './vendor/three.module.js';

// Render the simulation's actual projectiles and aim lanes; no decorative fake damage.
export class EnemyThreats {
 constructor(scene){
  this.scene=scene;this.pool=[];this.lanes=[];
  const lineGeo=new THREE.BufferGeometry().setFromPoints([
   new THREE.Vector3(-1,0,0),new THREE.Vector3(-1,0,1),new THREE.Vector3(1,0,0),new THREE.Vector3(1,0,1),
   new THREE.Vector3(-1,0,.87),new THREE.Vector3(0,0,1),new THREE.Vector3(1,0,.87),new THREE.Vector3(0,0,1)
  ]);
  for(let i=0;i<3;i++){
   const lane=new THREE.LineSegments(lineGeo,new THREE.LineBasicMaterial({color:'#e1b579',transparent:true,opacity:.55,depthWrite:false,toneMapped:false}));lane.visible=false;scene.add(lane);this.lanes.push(lane);
  }
  // Tapered blade arc, with transparent tips instead of a solid C-shaped ring.
  const points=[],colors=[],indices=[];
  for(let i=0;i<=40;i++){const t=i/40,a=-1.3+t*2.6,taper=Math.sin(t*Math.PI),inner=1-.14*taper;
   for(const r of [inner,1]){points.push(Math.cos(a)*r-.55,Math.sin(a)*r,0);colors.push(1,1,1,taper*(r===1?.95:.15));}
   if(i<40){const v=i*2;indices.push(v,v+1,v+2,v+1,v+3,v+2);}
  }
  this.arc=new THREE.BufferGeometry();this.arc.setAttribute('position',new THREE.Float32BufferAttribute(points,3));this.arc.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));this.arc.setIndex(indices);
  this.ring=new THREE.RingGeometry(.65,1,64,4);
  const rp=this.ring.attributes.position,rc=[];
  for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),r=Math.hypot(x,y),a=Math.atan2(y,x),noise=1+.06*Math.sin(a*9)+.035*Math.sin(a*17);rp.setXYZ(i,x*noise,y*noise,0);rc.push(1,1,1,Math.max(0,Math.sin((r-.65)/.35*Math.PI))*(.45+.18*Math.sin(a*11)));}
  this.ring.setAttribute('color',new THREE.Float32BufferAttribute(rc,4));
  this.shard=new THREE.DodecahedronGeometry(.35,0);
 }
 create(){
  const root=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:'#e6cc9e',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false,toneMapped:false,blending:THREE.AdditiveBlending});
  const bladeMaterial=material.clone();bladeMaterial.vertexColors=true;
  const blade=new THREE.Mesh(this.arc,bladeMaterial),echo=new THREE.Mesh(this.arc,bladeMaterial.clone());blade.rotation.z=-.55;echo.rotation.z=-.55;echo.position.z=-.36;echo.scale.setScalar(.86);echo.material.opacity=.3;root.add(blade,echo);
  const howl=new THREE.Mesh(this.ring,material.clone());howl.material.color.set('#9fc5cc');howl.material.vertexColors=true;root.add(howl);
  const fissure=new THREE.Group();
  for(let i=0;i<5;i++){const shard=new THREE.Mesh(this.shard,new THREE.MeshStandardMaterial({color:i%2?'#51483e':'#292e30',roughness:.88,emissive:'#9d4622',emissiveIntensity:.2}));shard.position.set(Math.sin(i*2)*.3,.2,-i*.32);shard.scale.set(.7,1.6-i*.22,.75);shard.rotation.set(i*.4,i*.7,-.3);fissure.add(shard);}
  const crack=new THREE.Mesh(new THREE.PlaneGeometry(.16,2.4),material.clone());crack.rotation.x=-Math.PI/2;crack.position.set(0,.025,-.6);crack.material.color.set('#d49b62');crack.material.opacity=.55;fissure.add(crack);root.add(fissure);
  this.scene.add(root);const entry={root,blade,echo,howl,fissure};this.pool.push(entry);return entry;
 }
 clear(){this.pool.forEach(v=>v.root.visible=false);this.lanes.forEach(l=>l.visible=false);}
 update(game,visible){
  const e=game.enemy,m=e.moveData,warning=visible&&e.state==='windup'&&m?.lane,spread=m?.projectile?.spread||[0];
  this.lanes.forEach((lane,i)=>{lane.visible=!!warning&&i<spread.length;if(!lane.visible)return;const yaw=e.yaw+spread[i],width=m.projectile?.radius??.65;lane.position.set(e.x,.075,e.z);lane.rotation.y=yaw;lane.scale.set(width,1,m.lane);lane.material.color.set(m.unblockable?'#f08661':'#e1b579');lane.material.opacity=.25+(1-e.timer/e.total)*.55;});
  const shots=visible?game.projectiles:[];while(this.pool.length<shots.length)this.create();
  this.pool.forEach((v,i)=>{const shot=shots[i];v.root.visible=!!shot;if(!shot)return;const blade=shot.style==='blade',howl=shot.style==='howl';v.blade.visible=v.echo.visible=blade;v.howl.visible=howl;v.fissure.visible=!blade&&!howl;v.root.position.set(shot.x,blade?1.1:howl?.85:.05,shot.z);v.root.rotation.y=shot.yaw;v.blade.rotation.z=shot.id%2?-.55:.55;v.echo.rotation.z=v.blade.rotation.z;v.howl.scale.setScalar(shot.radius*1.9);v.blade.scale.set(.8,1.15,1);});
 }
 snapshot(){return{projectiles:this.pool.filter(v=>v.root.visible).length,lanes:this.lanes.filter(v=>v.visible).length};}
}
