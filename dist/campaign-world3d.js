import { agedTexture } from './environment3d.js';
import * as THREE from './vendor/three.module.js';
import { clone } from './vendor/addons/utils/SkeletonUtils.js';
import { CHAPTERS } from './campaign3d.js';
// Share heavy geometry and textures, keep skeletons and flash materials independent.
export function cloneFighter(source){
 const root=clone(source.root),lookup=new Map();const pair=(a,b)=>{lookup.set(a,b);a.children.forEach((c,i)=>pair(c,b.children[i]));};pair(source.root,root);
 const remap=v=>v?.isObject3D?lookup.get(v):Array.isArray(v)?v.map(remap):v&&v.constructor===Object?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,remap(x)])):v;
 const result={};for(const key of ['root','body','hips','spine','cape','skirt','soleClearance','torso','head','neck','arms','legs','tail','tailMid','tailTip','meshes','weapon','height','type','kind','generated','asset'])result[key]=remap(source[key]);
 result.skeleton=result.meshes[0].skeleton;result.phase=0;result.deathProgress=0;
 for(const mesh of result.meshes)mesh.material=mesh.material.clone();return result;
}
export class CampaignField {
 constructor(world){this.world=world;this.root=new THREE.Group();world.scene.add(this.root);this.root.visible=false;this.models=new Map();this.pool={wolf:[],ronin:[],oni:[]};this.markers=[];
  const masonry=agedTexture('stone'),grain=agedTexture('wood');const stone=new THREE.MeshStandardMaterial({color:'#6d7771',map:masonry,bumpMap:masonry,bumpScale:.035,roughness:.94}),wood=new THREE.MeshStandardMaterial({color:'#624e3b',map:grain,bumpMap:grain,bumpScale:.025,roughness:.86}),leaf=new THREE.MeshStandardMaterial({color:'#233b30',side:THREE.DoubleSide,roughness:1}),gold=new THREE.MeshStandardMaterial({color:'#aa8351',metalness:.6,roughness:.42});
  const add=(geo,mat,x,y,z,sx=1,sy=1,sz=1)=>{const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.receiveShadow=true;m.castShadow=true;this.root.add(m);return m;};
  const box=new THREE.BoxGeometry(1,1,1),cyl=new THREE.CylinderGeometry(.085,.11,1,7),dummy=new THREE.Object3D();
  const ground=world.groundMaterial.clone();ground.map=ground.map.clone();ground.map.wrapS=ground.map.wrapT=THREE.RepeatWrapping;ground.map.repeat.set(1,2.7);for(const k of ['bumpMap','roughnessMap']){ground[k]=ground[k].clone();ground[k].wrapS=ground[k].wrapT=THREE.RepeatWrapping;ground[k].repeat.set(1,2.7);}
  const floor=add(new THREE.PlaneGeometry(22,51),ground,0,0,35.5);floor.rotation.x=-Math.PI/2;floor.castShadow=false;
  // Low parapets give the playable corridor a readable physical edge.
  for(const x of [-11,11])add(box,stone,x,.35,35.5,.65,.8,51);
  const bamboo=new THREE.InstancedMesh(cyl,leaf,112),leaves=new THREE.InstancedMesh(leafGeometry(),leaf,336);
  for(let i=0;i<112;i++){const side=i%2?1:-1,x=side*(12+(i%7)*.58),z=35+(i*1.618%26),h=4.5+(i%5)*.6;dummy.position.set(x,h/2,z);dummy.rotation.set(.05*Math.sin(i),0,.09*Math.cos(i));dummy.scale.set(1,h,1);dummy.updateMatrix();bamboo.setMatrixAt(i,dummy.matrix);for(let j=0;j<3;j++){dummy.position.set(x+Math.sin(i+j)*.65,h*(.55+j*.13),z);dummy.rotation.set(.4,i+j,j*.4);dummy.scale.set(1,1,1);dummy.updateMatrix();leaves.setMatrixAt(i*3+j,dummy.matrix);}}
  bamboo.castShadow=true;this.root.add(bamboo,leaves);
  for(const [index,z]of [36,12].entries()){
   for(const x of [-10.8,10.8]){add(box,stone,x,.45,z,1.2,.9,1.2);add(new THREE.CylinderGeometry(.24,.32,4.2,12),wood,x,2.3,z);add(box,gold,x,3.6,z,.62,.22,.7);}
   add(box,wood,0,4.5,z,21.5,.45,.8);add(gateRoof(),new THREE.MeshStandardMaterial({color:'#34494d',map:masonry,roughness:.6,side:THREE.DoubleSide}),0,4.75,z);
   const barrier=add(new THREE.PlaneGeometry(21.3,3.7),new THREE.MeshBasicMaterial({color:'#99432e',transparent:true,opacity:.16,side:THREE.DoubleSide,depthWrite:false}),0,1.85,z);barrier.castShadow=false;
   const ring=add(new THREE.RingGeometry(.85,1,48),new THREE.MeshBasicMaterial({color:'#e7c27c',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}),0,.06,z+1);ring.rotation.x=-Math.PI/2;ring.castShadow=false;this.markers.push({barrier,ring,index});
   const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#172222';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#b18a51';ctx.strokeRect(5,5,502,118);ctx.font='64px "Songti TC", serif';ctx.fillStyle='#dbc59b';ctx.textAlign='center';ctx.fillText(index===0?'斷 橋 關':'鎮 祟 門',256,87);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;add(new THREE.PlaneGeometry(3.8,.95),new THREE.MeshStandardMaterial({map:tex,side:THREE.DoubleSide}),0,3.8,z+.44);
  }
  const glow=new THREE.MeshStandardMaterial({color:'#deb36d',emissive:'#e99036',emissiveIntensity:1.7});
  for(let z=17;z<60;z+=7)for(const x of [-10.8,10.8]){add(new THREE.CylinderGeometry(.16,.24,.8,8),stone,x,.5,z);add(box,stone,x,.07,z,.6,.15,.6);add(box,gold,x,.96,z,.5,.12,.5);add(box,glow,x,1.18,z,.25,.38,.25);for(const dx of [-.2,.2])for(const dz of [-.2,.2])add(box,wood,x+dx,1.19,z+dz,.045,.5,.045);add(new THREE.ConeGeometry(.48,.23,4),wood,x,1.53,z).rotation.y=Math.PI/4;add(new THREE.SphereGeometry(.06,8,6),gold,x,1.68,z);}

  // Gold chevrons mark the route without covering enemy attack warnings.
  this.arrows=[];for(let z=15;z<56;z+=3){const shape=new THREE.Shape();shape.moveTo(-.22,.2);shape.lineTo(0,-.15);shape.lineTo(.22,.2);shape.lineTo(0,.07);shape.closePath();const arrow=add(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:'#dfba77',transparent:true,opacity:.55,side:THREE.DoubleSide,depthWrite:false}),0,.04,z);arrow.rotation.x=-Math.PI/2;arrow.rotation.z=Math.PI;arrow.castShadow=false;this.arrows.push(arrow);}
 }
 update(game,t,dt,active){this.root.visible=active;if(!active){for(const m of this.models.values()){m.root.visible=false;if(m.warning)m.warning.visible=false;}return;}
  const ids=new Set(game.enemies.map(e=>e.id));for(const [id,m]of this.models)if(!ids.has(id)){m.root.visible=false;if(m.warning)m.warning.visible=false;this.pool[m.kind].push(m);this.models.delete(id);}
  for(const e of game.enemies){let m=this.models.get(e.id);if(!m){m=this.pool[e.kindId].pop()||cloneFighter(this.world.generatedEnemies[e.kindId]);this.world.scene.add(m.root);m.motionTransition=null;m.footwork=null;m.clothMotion=null;m.lastMotion=null;m.lastAnimationTime=undefined;m.phase=0;m.deathProgress=0;if(!m.warning){m.warning=new THREE.Mesh(new THREE.RingGeometry(.94,1,48),new THREE.MeshBasicMaterial({color:'#ce7953',transparent:true,opacity:.4,side:THREE.DoubleSide,depthWrite:false}));m.warning.rotation.x=-Math.PI/2;this.world.scene.add(m.warning);}this.models.set(e.id,m);}m.warning.visible=e.hp>0&&e.state==='windup'&&e!==game.enemy;m.warning.position.set(e.x,.035,e.z);m.warning.scale.setScalar(e.kind==='slam'?4.1:e.moveData?.range||e.spec.range);m.warning.material.opacity=.12+(1-e.timer/(e.total||1))*.38;m.root.visible=e.hp>0||(e.deadTime||0)<1.8;if(m.root.visible)this.world.animateModel(m,e,t,dt,false);}
  for(const marker of this.markers){const open=game.stage>marker.index||game.stage===marker.index&&game.cleared;marker.barrier.visible=!open;marker.barrier.material.opacity=.12+Math.sin(t*2)*.035;marker.ring.visible=game.stage===marker.index&&open;marker.ring.scale.setScalar(1+Math.sin(t*3)*.08);}
  for(const a of this.arrows)a.visible=game.cleared&&a.position.z>=CHAPTERS[game.stage].gate&&a.position.z<=game.player.z+1;
 }
 reset(){for(const [id,m]of this.models){m.root.visible=false;if(m.warning)m.warning.visible=false;this.pool[m.kind].push(m);}this.models.clear();}
}

function leafGeometry(){const shape=new THREE.Shape();shape.moveTo(-.85,0);shape.quadraticCurveTo(-.15,.16,.85,0);shape.quadraticCurveTo(-.15,-.13,-.85,0);return new THREE.ShapeGeometry(shape,5);}
function gateRoof(){const points=[],uv=[],indices=[];for(let i=0;i<=40;i++){const x=-11.2+i/40*22.4,lift=Math.pow(Math.abs(x)/11.2,6)*.65;for(let j=0;j<3;j++){points.push(x,lift+(j===1?.3:0),j-1);uv.push(i/4,j/2);}}for(let i=0;i<40;i++)for(let j=0;j<2;j++){const a=i*3+j,b=a+3;indices.push(a,b,a+1,b,b+1,a+1);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;}
