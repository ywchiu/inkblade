import * as THREE from './vendor/three.module.js';
const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

// Four-legged skins, independent from the bipedal sword/guardian rigs. A shape is one body, measured
// on the mesh once it is turned to face +Z and scaled to `height`: joints as [x, y, z] (legs on the +x side,
// mirrored), and the bands (from, to) across which skin weight passes from one bone to the next.
export const WOLF_SHAPE={asset:'./assets/wolf/ink-wolf.glb',height:1.72,yaw:Math.PI,
 spine:{Pelvis:[0,.93,-.53],Spine:[0,1.02,-.12],Chest:[0,1.12,.35],Neck:[0,1.27,.62],Head:[0,1.4,.86]},
 tail:[[0,1.05,-.91],[0,.73,-1.25],[0,.47,-1.54]],
 front:[[.23,.9,.4],[.25,.45,.38],[.25,.12,.48]],hind:[[.23,.91,-.61],[.25,.5,-.74],[.25,.12,-.53]],
 bands:{tailZ:[-1.03,-.79],tailY:[.18,.48],tailRun:[.91,.63],leg:[.48,.88],knee:[.24,.59],paw:[.12,.23],head:[.43,.91],neck:[.25,.6],hips:[-.61,-.16],chest:[-.12,.3]},
 lie:[.44,.93]};
// The gate beast of the forecourt: a stone lion with its tail carried level and a bell under the jaw.
// `inner` keeps what hangs between the forelegs (the bell, the chest) on the body instead of on a leg.
export const BEAST_SHAPE={asset:'./assets/beast/stone-beast.glb',height:1.5,yaw:Math.PI,
 spine:{Pelvis:[0,.92,-.45],Spine:[0,.92,-.05],Chest:[0,.95,.5],Neck:[0,1.12,.8],Head:[0,1.3,1]},
 tail:[[0,1.03,-.7],[0,1.07,-.92],[0,1.1,-1.12]],
 front:[[.3,.76,.68],[.33,.4,.67],[.39,.1,.74]],hind:[[.28,.8,-.42],[.31,.42,-.55],[.4,.1,-.48]],
 bands:{tailZ:[-.76,-.66],tailY:[.7,.9],tailRun:[.7,.55],leg:[.5,.82],knee:[.25,.55],paw:[.1,.2],head:[.82,1.05],neck:[.55,.8],hips:[-.5,-.1],chest:[-.05,.4],inner:[.1,.2]},
 lie:[.5,.85]};
export function createWolfCharacter(gltf,shape=WOLF_SHAPE){
 const height=shape.height,B=shape.bands,root=new THREE.Group(),body=new THREE.Group();root.add(body);
 gltf.scene.updateMatrixWorld(true);const rotate=new THREE.Matrix4().makeRotationY(shape.yaw),parts=[],bounds=new THREE.Box3();
 gltf.scene.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld).applyMatrix4(rotate);geometry.computeBoundingBox();bounds.union(geometry.boundingBox);parts.push({geometry,material:o.material.clone()});});
 const scale=height/(bounds.max.y-bounds.min.y),center=bounds.getCenter(new THREE.Vector3()),normalize=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-bounds.min.y,-center.z));
 const bones=[];function joint(name,parent,x,y,z){const b=new THREE.Bone();b.name=name;b.userData.restWorld=new THREE.Vector3(x,y,z);b.position.copy(b.userData.restWorld);if(parent){b.position.sub(parent.userData.restWorld);parent.add(b);}else body.add(b);bones.push(b);return b;}
 const S=shape.spine,hips=joint('Pelvis',null,...S.Pelvis),spine=joint('Spine',hips,...S.Spine),chest=joint('Chest',spine,...S.Chest),neck=joint('Neck',chest,...S.Neck),head=joint('Head',neck,...S.Head);
 const tail=joint('TailBase',hips,...shape.tail[0]),tailMid=joint('TailMid',tail,...shape.tail[1]),tailTip=joint('TailTip',tailMid,...shape.tail[2]),legs=[];
 for(const front of [true,false])for(const sign of [-1,1]){const [a,b,c]=front?shape.front:shape.hind,upper=joint((front?'Front':'Hind')+(sign<0?'Right':'Left'),front?chest:hips,sign*a[0],a[1],a[2]);const lower=joint(upper.name+'Knee',upper,sign*b[0],b[1],b[2]);const foot=joint(upper.name+'Paw',lower,sign*c[0],c[1],c[2]);legs.push({upper,lower,foot,front,sign});}
 body.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();const meshes=[],index=b=>bones.indexOf(b);
 function weights(p){
  const contributions=new Map(),add=(bone,w)=>{if(w>0)contributions.set(index(bone),(contributions.get(index(bone))||0)+w);};
  const isTail=(1-smooth(...B.tailZ,p.z))*smooth(...B.tailY,p.y);let core=1-isTail;
  if(isTail){const t=THREE.MathUtils.clamp((-p.z-B.tailRun[0])/B.tailRun[1],0,1);const blend=t<.5?t*2:(t-.5)*2;add(t<.5?tail:tailMid,isTail*(1-blend));add(t<.5?tailMid:tailTip,isTail*blend);}
  const legWeight=core*(1-smooth(...B.leg,p.y))*(B.inner?smooth(...B.inner,Math.abs(p.x)):1);
  if(legWeight>0){const candidates=legs.filter(l=>p.x*l.sign>=0).sort((a,b)=>Math.abs(p.z-a.upper.userData.restWorld.z)-Math.abs(p.z-b.upper.userData.restWorld.z)),leg=candidates[0],k=smooth(...B.knee,p.y),paw=1-smooth(...B.paw,p.y);add(leg.upper,legWeight*k);add(leg.lower,legWeight*(1-k)*(1-paw));add(leg.foot,legWeight*(1-k)*paw);}
  core-=legWeight;const forward=smooth(...B.head,p.z),rear=1-smooth(...B.hips,p.z),nape=smooth(...B.neck,p.z),fore=smooth(...B.chest,p.z);add(head,core*forward);add(neck,core*(1-forward)*nape);const middle=core*(1-forward)*(1-nape);add(hips,middle*rear);add(spine,middle*(1-rear)*(1-fore));add(chest,middle*(1-rear)*fore);
  const ranked=[...contributions].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=ranked.reduce((n,[,w])=>n+w,0);return ranked.map(([b,w])=>[b,w/sum]);
 }
 for(const {geometry,material}of parts){geometry.applyMatrix4(normalize);const pos=geometry.attributes.position,indices=new Uint16Array(pos.count*4),values=new Float32Array(pos.count*4),p=new THREE.Vector3();for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);weights(p).forEach(([b,w],j)=>{indices[i*4+j]=b;values[i*4+j]=w;});}geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(values,4));material.envMapIntensity=.8;material.roughness=Math.max(.72,material.roughness);if(material.map)material.map.anisotropy=4;const mesh=new THREE.SkinnedMesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;body.add(mesh);mesh.bind(skeleton);meshes.push(mesh);}
 gltf.scene.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
 return{root,body,hips,torso:chest,head,neck,spine,legs,tail,tailMid,tailTip,skeleton,meshes,height,lie:shape.lie,type:'wolf',kind:'wolf',generated:true,asset:shape.asset,phase:0,deathProgress:0};
}

export function animateWolf(m,a,t,dt){
 m.root.position.set(a.x,0,a.z);m.root.rotation.y=a.yaw;
 const moving=a.speed>.05;m.phase+=dt*(moving?a.speed*4.5:0);const stride=moving?Math.sin(m.phase):0,poses=new Map(m.skeleton.bones.map(b=>[b,[0,0,0]]));const set=(b,x=0,y=0,z=0)=>poses.set(b,[x,y,z]);
 const gallop=THREE.MathUtils.clamp((a.speed-3)/3,0,1);
 for(let i=0;i<4;i++){const leg=m.legs[i],trot=stride*([1,-1,-1,1][i]),bound=Math.sin(m.phase+(leg.front?0:1.9)+leg.sign*.35),wave=THREE.MathUtils.lerp(trot,bound,gallop);set(leg.upper,wave*(.34+gallop*.18));set(leg.lower,Math.max(0,-wave)*(.4+gallop*.2));set(leg.foot,-wave*.16);}
 set(m.spine,Math.sin(m.phase)*gallop*.085);set(m.torso,Math.sin(m.phase+1)*gallop*.065);
 set(m.neck,Math.sin(t*1.8)*.018);set(m.tail,0,Math.sin(t*2.3)*.12);set(m.tailMid,0,Math.sin(t*2.3-.4)*.14);set(m.tailTip,Math.sin(m.phase-.8)*gallop*.12,Math.sin(t*2.3-.8)*.18);
 m.body.position.set(0,moving?Math.abs(stride)*.025:Math.sin(t*2)*.009,0);m.body.rotation.set(0,0,0);
 const p=a.total>0?THREE.MathUtils.clamp(1-a.timer/a.total,0,1):0;
 if(a.state==='windup'){const k=smooth(0,.75,p);m.body.position.y-=.12*k;set(m.torso,.12*k);set(m.neck,-.16*k);set(m.head,.15*k);for(const l of m.legs){set(l.upper,l.front?.18*k:-.3*k);set(l.lower,l.front?-.15*k:.35*k);}}
 if(a.state==='attack'){const jump=Math.sin(Math.min(1,p/.78)*Math.PI),reach=smooth(.28,.48,p)*(1-smooth(.76,1,p));m.body.position.y+=jump*.24;m.body.rotation.x=-.15*jump+.09*reach;set(m.spine,-.09*jump);set(m.neck,.2*jump);set(m.head,.16*jump);for(const l of m.legs){set(l.upper,l.front?-.6*jump+.35*reach:.58*jump);set(l.lower,l.front?.38*jump:-.23*jump);set(l.foot,l.front?-.15*reach:0);}}
 if(['windup','attack'].includes(a.state)&&a.kind==='projectile'){
  const k=a.state==='windup'?smooth(0,.7,p):1-smooth(.5,1,p);
  m.body.position.y=-.06*k;m.body.rotation.x=0;set(m.neck,-.55*k);set(m.head,-.3*k);set(m.torso,-.08*k);
  for(const l of m.legs){set(l.upper,l.front?-.12*k:.2*k);set(l.lower,l.front?.12*k:-.16*k);}
 }
 if(['windup','attack'].includes(a.state)&&a.kind==='bite'){
  const k=a.state==='windup'?smooth(0,1,p):smooth(.25,.4,p)*(1-smooth(.48,1,p)),sign=a.variant==='rake'?-1:1;
  m.body.position.y=-.06*k;m.body.rotation.x=.05*k;set(m.neck,.22*k,a.state==='attack'?sign*.32*k:-sign*.18*k);set(m.head,.18*k);
  for(const l of m.legs){set(l.upper,l.front?-.12*k:.12*k);set(l.lower,0);}
 }
 if(a.state==='stagger'){set(m.neck,.26);set(m.head,.2);m.body.position.y=-.1;m.body.rotation.z=Math.sin(t*9)*.035;}
 if(a.state==='dead'){m.deathProgress=Math.min(1,m.deathProgress+dt*2);m.body.rotation.z=m.deathProgress*1.45;m.body.position.y=m.lie[0]*m.deathProgress;m.body.position.x=m.lie[1]*Math.sin(m.body.rotation.z);}else m.deathProgress=0;
 const impact=a.impact,reacting=impact?.time>0&&a.state!=='dead',fresh=reacting&&m.lastImpact!==impact.id;if(fresh)m.lastImpact=impact.id;if(!impact)m.lastImpact=0;
 if(reacting){const force=impact.strength*Math.pow(impact.time/impact.total,1.7),x=impact.dirX*Math.cos(a.yaw)-impact.dirZ*Math.sin(a.yaw);poses.get(m.torso)[2]-=x*.37*force;poses.get(m.neck)[0]-=.22*force;m.body.position.y-=.05*force;}
 const direct=['attack','windup'].includes(a.state)&&dt>0,blend=fresh||direct?1:1-Math.exp(-dt*22);for(const [b,v]of poses){b.rotation.x=THREE.MathUtils.lerp(b.rotation.x,v[0],blend);b.rotation.y=THREE.MathUtils.lerp(b.rotation.y,v[1],blend);b.rotation.z=THREE.MathUtils.lerp(b.rotation.z,v[2],blend);}
 for(const mesh of m.meshes){mesh.material.emissive.set(a.flash>0?'#a76d35':'#000000');mesh.material.emissiveIntensity=a.flash>0?.16*Math.min(1,a.flash/.12):0;}
}
