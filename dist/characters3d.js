import { dashPose } from './dash3d.js';
import { applyFootwork } from './footwork3d.js';
import { transitionPose } from './motion-transition3d.js';
import { locomotionPose, gaitTiming } from './locomotion3d.js';
import { createWolfCharacter, animateWolf, BEAST_SHAPE } from './wolf-character3d.js';
import { dodgePose } from './dodge3d.js';
import * as THREE from './vendor/three.module.js';
import { samplePlayerAttack, sampleMonsterAttack, sampleSwordsmanAttack } from './attack-moves.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import { RIGS } from './rig-clips.js';
import { loadRiggedCharacter, animateRigged } from './rigged-character3d.js';

const smooth=(a,b,x)=>{const v=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return v*v*(3-2*v);};
const loader=new GLTFLoader();
const paths={hero:'./assets/hero/demon-queller.glb',oni:'./assets/monster/temple-guardian.glb',ronin:'./assets/ronin/faceless-swordsman.glb',wolf:'./assets/wolf/ink-wolf.glb'};
// The source meshes face +X. Bake them into the combat convention (+Z, Y-up)
// before placing joints or calculating bind matrices. No failed Meshy rig is loaded.
// Authored skeletal animation is what the game plays; ?rig=0 brings the procedural rigs back for comparison, and
// any load failure falls back to the procedural rig so the game always starts.
const riggedRequested=()=>new URLSearchParams(globalThis.location?.search||'').get('rig')!=='0';
export async function loadCharacter(kind){
 const rig=RIGS[kind];if(rig&&riggedRequested()){try{return await loadRiggedCharacter(rig,{loader,createWeapon:rig.weaponBone?createSword:null,kind});}catch(error){console.warn('rigged '+kind+' unavailable, using procedural rig',error);}}
 return createCharacter(await loader.loadAsync(paths[kind]),kind);
}
// Bodies that belong to one campaign role rather than to a kind (ROLES[role].skin). They load after the
// base cast and are optional: a role whose body is missing wears its kind's body in the role's colours.
// The clerk is always a rigged model: it has no procedural rig of its own.
const skins={
 beast:async()=>createWolfCharacter(await loader.loadAsync(BEAST_SHAPE.asset),BEAST_SHAPE),
 scribe:()=>loadRiggedCharacter(RIGS.scribe,{loader,createWeapon:createBrush,kind:'ronin'})
};
export const SKINS=Object.keys(skins);
export async function loadSkin(name){try{return await skins[name]();}catch(error){console.warn('skin '+name+' unavailable, using the base body',error);return null;}}
export function createCharacter(gltf,kind){
 if(kind==='wolf')return createWolfCharacter(gltf);
 const root=new THREE.Group(),body=new THREE.Group();root.add(body);
 const height=kind==='hero'?1.95:kind==='ronin'?2.05:3.15,isHero=kind!=='oni';
 gltf.scene.updateMatrixWorld(true);
 const rotation=new THREE.Matrix4().makeRotationY(-Math.PI/2);
 const geometryParts=[];const box=new THREE.Box3();
 gltf.scene.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);geometry.applyMatrix4(rotation);geometry.computeBoundingBox();box.union(geometry.boundingBox);geometryParts.push({geometry,material:o.material.clone()});});
 const scale=height/(box.max.y-box.min.y),center=box.getCenter(new THREE.Vector3());
 const normalize=new THREE.Matrix4().makeScale(scale,scale,scale).multiply(new THREE.Matrix4().makeTranslation(-center.x,-box.min.y,-center.z));
 const bones=[],joints={};
 function joint(name,parent,x,y,z=0){const b=new THREE.Bone();b.name=name;const p=new THREE.Vector3(x,y,z).multiplyScalar(height);b.userData.restWorld=p.clone();b.position.copy(p);if(parent){b.position.sub(parent.userData.restWorld);parent.add(b);}else body.add(b);bones.push(b);joints[name]=b;return b;}
 const hips=joint('Hips',null,0,.5),spine=joint('Spine',hips,0,.62),chest=joint('Chest',spine,0,.74),head=joint('Head',chest,0,.84,.015);
 const arms=[],legs=[];
 for(const sign of[-1,1]){
  const side=sign<0?'Right':'Left';
  const upper=joint(side+'Arm',chest,sign*(isHero?.145:.21),isHero?.76:.755);
  const lower=joint(side+'ForeArm',upper,sign*(isHero?.217:.27),isHero?.625:.57,.01);
  const hand=joint(side+'Hand',lower,sign*(isHero?.265:.3),isHero?.49:.34,.035);
  arms.push({upper,lower,hand});
  const thigh=joint(side+'UpLeg',hips,sign*.115,.49);
  const shin=joint(side+'Leg',thigh,sign*(isHero?.13:.15),.265,.01);
  const foot=joint(side+'Foot',shin,sign*(isHero?.14:.17),.065,.045);
  legs.push({upper:thigh,lower:shin,foot});
 }
 const gripProfile=kind==='hero'?{x:-.282,y:.485,z:.076,thumbX:-.252,thumbY:.489,thumbZ:.096}:{x:-.286,y:.49,z:.034,thumbX:-.257,thumbY:.498,thumbZ:.06};
 if(isHero){const g=gripProfile,hand=arms[0].hand,knuckles=joint('RightGripKnuckles',hand,g.x,g.y,g.z),fingers=joint('RightGripFingers',knuckles,g.x,g.y-.025,g.z),thumb=joint('RightGripThumb',hand,g.thumbX,g.thumbY,g.thumbZ);arms[0].grip={knuckles,fingers,thumb};}
 const cape=isHero?[joint('CapeUpper',chest,0,.65,-.10),null]:null;if(cape)cape[1]=joint('CapeHem',cape[0],0,.36,-.13);
 const skirt=isHero?[-1,1].map((sign,i)=>joint(i?'SkirtLeft':'SkirtRight',hips,sign*.13,.45,.06)):null;
 const idx=b=>bones.indexOf(b),meshes=[];
 function segmentDistance(p,a,b){const ab=b.clone().sub(a),q=THREE.MathUtils.clamp(p.clone().sub(a).dot(ab)/ab.lengthSq(),0,1);return p.distanceTo(a.clone().addScaledVector(ab,q))/height;}
 function weights(p,pinnedSide=-1){
  if(pinnedSide>=0&&p.z/height>-.025){
   const arm=arms[pinnedSide],y=p.y/height,wrist=smooth(isHero?.49:.34,isHero?.555:.405,y);
   if(arm.grip){const g=gripProfile,x=p.x/height,z=p.z/height,thumb=smooth(g.thumbZ-.009,g.thumbZ+.004,z)*smooth(g.x+.006,g.thumbX,x)*(1-smooth(g.thumbY+.003,g.thumbY+.02,y)),curl=(1-thumb)*(1-smooth(g.y-.012,g.y+.009,y)),distal=1-smooth(g.y-.035,g.y-.018,y);
    return [[idx(arm.hand),(1-wrist)*(1-thumb-curl)],[idx(arm.lower),wrist],[idx(arm.grip.thumb),(1-wrist)*thumb],[idx(arm.grip.knuckles),(1-wrist)*curl*(1-distal)],[idx(arm.grip.fingers),(1-wrist)*curl*distal]].filter(([,w])=>w>1e-6).sort((a,b)=>b[1]-a[1]).slice(0,4).map((v,_,all)=>[v[0],v[1]/all.reduce((n,a)=>n+a[1],0)]);
   }
   return [[idx(arm.hand),1-wrist],[idx(arm.lower),wrist]].filter(([,w])=>w>0);
  }
  const y=p.y/height,x=Math.abs(p.x/height),side=p.x<0?0:1,arm=arms[side],leg=legs[side];
  const values=new Map();const add=(b,w)=>values.set(idx(b),(values.get(idx(b))||0)+w);
  // Explicit region masks keep hanging robes and the hip gourd off the arms.
  const armWeight=smooth(isHero?.155:.19,isHero?.215:.265,x)*smooth(isHero?.45:.08,isHero?.54:.16,y)*(1-smooth(.82,.9,y))*(isHero?smooth(-.10,-.015,p.z/height):1);
  const d1=segmentDistance(p,arm.upper.userData.restWorld,arm.lower.userData.restWorld);
  const d2=segmentDistance(p,arm.lower.userData.restWorld,arm.hand.userData.restWorld);
  const w1=1/Math.pow(.018+d1,4),w2=1/Math.pow(.018+d2,4);
  add(arm.upper,armWeight*w1/(w1+w2));add(arm.lower,armWeight*w2/(w1+w2));
  const cloth=cape?(1-armWeight)*(1-smooth(-.10,-.035,p.z/height))*smooth(.13,.23,y)*(1-smooth(.55,.68,y))*(1-smooth(.20,.29,x))*.88:0;
  if(cape){const hem=1-smooth(.30,.52,y);add(cape[0],cloth*(1-hem));add(cape[1],cloth*hem);}
  const panel=skirt?(1-armWeight-cloth)*smooth(.035,.095,p.z/height)*smooth(.12,.23,y)*(1-smooth(.40,.49,y))*(1-smooth(.22,.30,x))*.9:0;if(skirt){const across=smooth(-.035,.035,p.x/height);add(skirt[0],panel*(1-across));add(skirt[1],panel*across);}
  const legWeight=(1-armWeight-cloth-panel)*(1-smooth(isHero?.22:.37,isHero?.43:.51,y));
  const knee=smooth(.22,.31,y),boot=1-smooth(.07,.14,y);add(leg.upper,legWeight*knee);add(leg.lower,legWeight*(1-knee)*(1-boot));add(leg.foot,legWeight*(1-knee)*boot);
  const core=1-armWeight-legWeight-cloth-panel;
  if(y<.6){const v=smooth(.49,.6,y);add(hips,core*(1-v));add(spine,core*v);}
  else if(y<.74){const v=smooth(.62,.74,y);add(spine,core*(1-v));add(chest,core*v);}
  else {const v=smooth(.79,.86,y);add(chest,core*(1-v));add(head,core*v);}
  const ranked=[...values].filter(([,w])=>w>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=ranked.reduce((n,[,w])=>n+w,0);return ranked.map(([i,w])=>[i,w/sum]);
 }
 body.updateMatrixWorld(true);const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
 for(const {geometry,material} of geometryParts){
  geometry.applyMatrix4(normalize);const pos=geometry.attributes.position,handRegions=handComponents(geometry,height,isHero),indices=new Uint16Array(pos.count*4),values=new Float32Array(pos.count*4),p=new THREE.Vector3();
  for(let i=0;i<pos.count;i++){p.fromBufferAttribute(pos,i);weights(p,handRegions[i]).forEach(([b,w],j)=>{indices[i*4+j]=b;values[i*4+j]=w;});}
  geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(values,4));
  material.envMapIntensity=.7;material.roughness=Math.max(.65,material.roughness);if(material.map)material.map.anisotropy=4;
  const mesh=new THREE.SkinnedMesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;body.add(mesh);mesh.bind(skeleton);meshes.push(mesh);
 }
 let weapon=null;if(isHero){weapon=createSword();const g=gripProfile;weapon.position.set((g.x+.016+.265)*height,(g.y-.008-.49)*height,(g.z-.035)*height);weapon.rotation.x=-Math.PI/2;arms[0].hand.add(weapon);}
 gltf.scene.traverse(o=>{if(o.isMesh)o.geometry.dispose();});
 const soleClearance=legs.map(l=>l.foot.userData.restWorld.y);
 return{root,body,hips,spine,cape,skirt,soleClearance,torso:chest,head,arms,legs,skeleton,meshes,weapon,height,type:isHero?'human':'oni',kind,generated:true,asset:paths[kind],phase:0,deathProgress:0};
}
// Hands hang below the waist in the source A pose. Identify their disconnected
// lower-mesh components so fingertips cannot accidentally inherit hip/leg weights.
function handComponents(geometry,height,hero){
 const pos=geometry.attributes.position,n=pos.count,parent=Int32Array.from({length:n},(_,i)=>i),regions=new Int8Array(n).fill(-1),cut=(hero?.57:.50)*height;
 const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};
 const union=(a,b)=>{if(pos.getY(a)<cut&&pos.getY(b)<cut)parent[find(a)]=find(b);};
 const welded=new Map();
 for(let i=0;i<n;i++){if(pos.getY(i)>=cut)continue;const key=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(x=>Math.round(x*100000)).join(',');if(welded.has(key))union(i,welded.get(key));else welded.set(key,i);}
 const index=geometry.index;
 for(let i=0;i<(index?.count||n);i+=3){const a=index?index.getX(i):i,b=index?index.getX(i+1):i+1,c=index?index.getX(i+2):i+2;union(a,b);union(b,c);union(c,a);}
 const groups=new Map();for(let i=0;i<n;i++){if(pos.getY(i)>=cut)continue;const id=find(i),g=groups.get(id)||{sum:0,count:0};g.sum+=pos.getX(i)/height;g.count++;groups.set(id,g);}
 for(let i=0;i<n;i++){if(pos.getY(i)>=cut)continue;const g=groups.get(find(i)),x=g.sum/g.count;if(Math.abs(x)>(hero?.215:.235))regions[i]=x<0?0:1;}
 return regions;
}
// A judge's brush as long as a sword, held the same way: grip at the origin, tip down -Y.
function createBrush(){
 const g=new THREE.Group();g.name='JudgeBrush';
 const wood=new THREE.MeshStandardMaterial({color:'#2a1c16',roughness:.6}),bronze=new THREE.MeshStandardMaterial({color:'#74563a',metalness:.85,roughness:.35}),cord=new THREE.MeshStandardMaterial({color:'#7c2a22',roughness:.8}),hair=new THREE.MeshStandardMaterial({color:'#0d1114',roughness:.5,emissive:'#123a3a',emissiveIntensity:.35});
 const add=(geo,mat,y)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.y=y;mesh.castShadow=true;g.add(mesh);return mesh;};
 add(new THREE.CylinderGeometry(.02,.024,1.02,10),wood,-.33);add(new THREE.SphereGeometry(.03,10,8),bronze,.19);add(new THREE.TorusGeometry(.026,.007,6,14),cord,.12).rotation.x=Math.PI/2;
 add(new THREE.CylinderGeometry(.034,.026,.09,12),bronze,-.88);
 // Bristles: a belly that swells below the ferrule and draws to a point.
 add(new THREE.LatheGeometry([[.03,0],[.058,-.08],[.05,-.17],[.022,-.27],[0,-.34]].map(([x,y])=>new THREE.Vector2(x,y)),14),hair,-.92);
 return g;
}
function createSword(){
 const g=new THREE.Group();g.name='DemonQuellerSword';
 const iron=new THREE.MeshStandardMaterial({color:'#75858a',metalness:.92,roughness:.27});
 const bronze=new THREE.MeshStandardMaterial({color:'#74563a',metalness:.85,roughness:.35});
 const edge=new THREE.MeshStandardMaterial({color:'#baa476',metalness:.85,roughness:.29});
 const grip=new THREE.MeshStandardMaterial({color:'#241b18',roughness:.83}),wrap=new THREE.MeshStandardMaterial({color:'#574231',roughness:.76});
 const add=(geo,mat,y=0)=>{const mesh=new THREE.Mesh(geo,mat);mesh.position.y=y;mesh.castShadow=true;g.add(mesh);return mesh;};
 add(new THREE.CylinderGeometry(.026,.029,.22,12),grip);
 const rings=new THREE.InstancedMesh(new THREE.TorusGeometry(.028,.0035,5,16),wrap,11),matrix=new THREE.Matrix4(),q=new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI/2,0,.12));
 for(let i=0;i<11;i++){matrix.compose(new THREE.Vector3(0,-.10+i*.019,0),q,new THREE.Vector3(1,1,1));rings.setMatrixAt(i,matrix);}rings.castShadow=true;g.add(rings);
 const guard=new THREE.Shape();guard.moveTo(-.135,.014);guard.quadraticCurveTo(-.09,-.037,-.035,-.033);guard.lineTo(.035,-.033);guard.quadraticCurveTo(.09,-.037,.135,.014);guard.lineTo(.12,.04);guard.quadraticCurveTo(.075,.005,.026,.01);guard.lineTo(-.026,.01);guard.quadraticCurveTo(-.075,.005,-.12,.04);guard.closePath();
 const guardGeo=new THREE.ExtrudeGeometry(guard,{depth:.045,bevelEnabled:true,bevelThickness:.005,bevelSize:.004,bevelSegments:2,curveSegments:12});add(guardGeo,bronze,-.13).position.z=-.0225;
 const jewel=add(new THREE.SphereGeometry(.022,12,8),new THREE.MeshStandardMaterial({color:'#244b47',metalness:.35,roughness:.2}),-.135);jewel.position.z=.03;jewel.scale.set(1,1,.45);
 const rim=add(new THREE.TorusGeometry(.024,.004,5,16),edge,-.135);rim.position.z=.032;
 add(new THREE.CylinderGeometry(.032,.032,.024,12),edge,-.108);add(new THREE.CylinderGeometry(.032,.032,.024,12),bronze,.115);
 const shape=new THREE.Shape();shape.moveTo(-.043,0);shape.lineTo(.043,0);shape.lineTo(.031,-.83);shape.lineTo(0,-1.02);shape.lineTo(-.031,-.83);shape.closePath();
 const blade=add(new THREE.ExtrudeGeometry(shape,{depth:.014,bevelEnabled:true,bevelThickness:.005,bevelSize:.007,bevelSegments:2}),iron,-.155);blade.position.z=-.007;
 // Recessed-looking central fuller and small bronze seal at the blade's root.
 const fuller=add(new THREE.BoxGeometry(.007,.69,.016),new THREE.MeshStandardMaterial({color:'#34474d',metalness:.88,roughness:.4}),-.54);
 const seal=add(new THREE.BoxGeometry(.018,.045,.019),bronze,-.22);
 const pommel=add(new THREE.SphereGeometry(.039,12,8),bronze,.142);pommel.scale.set(1,.7,.75);
 const pommelRing=add(new THREE.TorusGeometry(.022,.0045,5,16),edge,.142);pommelRing.position.z=.026;
 return g;
}
export function animateCharacter(m,a,t,dt){
 if(m.rigged)return animateRigged(m,a,t,dt);
 if(m.type==='wolf')return animateWolf(m,a,t,dt);
 const {root,body,hips,spine,torso,head,arms,legs}=m;
 if(m.lastAnimationTime!==undefined&&t<m.lastAnimationTime){m.motionTransition=null;m.footwork=null;m.clothMotion=null;}m.lastAnimationTime=t;
 const previous=m.lastMotion,rawX=previous&&dt>0?(a.x-previous.x)/dt:0,rawZ=previous&&dt>0?(a.z-previous.z)/dt:0,len=Math.hypot(rawX,rawZ);
 const localX=len>.1?(rawX*Math.cos(a.yaw)-rawZ*Math.sin(a.yaw))/len:0,localZ=len>.1?(rawX*Math.sin(a.yaw)+rawZ*Math.cos(a.yaw))/len:1;
 const turn=previous&&dt>0?THREE.MathUtils.clamp(Math.atan2(Math.sin(a.yaw-previous.yaw),Math.cos(a.yaw-previous.yaw))/dt,-1,1):0;m.lastMotion={x:a.x,z:a.z,yaw:a.yaw};
 root.position.set(a.x,0,a.z);root.rotation.y=a.yaw;
 const moving=a.speed>.05;m.phase+=dt*(moving?a.speed*gaitTiming(a.speed,m.height).rate:0);const stride=moving?Math.sin(m.phase):0;
 const pose=new Map(m.skeleton.bones.map(b=>[b,[0,0,0]]));const set=(b,x=0,y=0,z=0)=>pose.set(b,[x,y,z]);
 const progress=a.total>0?THREE.MathUtils.clamp(1-a.timer/a.total,0,1):0;
 const hero=m.type==='human',breath=Math.sin(t*1.7)*.012;
 const gait=locomotionPose(a.speed||0,m.phase,t,localX,localZ,turn);
 for(let i=0;i<2;i++){const wave=stride*(i?1:-1);set(legs[i].upper,wave*(hero?.34:.3));set(legs[i].lower,Math.max(0,-wave)*.35);set(arms[i].upper,-.08-wave*.16,0,i?-.025:.025);set(arms[i].lower,-.1);}
 set(torso,breath,Math.sin(m.phase)*.025*(moving?1:0));
 if(hero){
  const parts={hips,spine,chest:torso,head,rightArm:arms[0].upper,rightForearm:arms[0].lower,rightHand:arms[0].hand,leftArm:arms[1].upper,leftForearm:arms[1].lower,rightLeg:legs[0].upper,rightKnee:legs[0].lower,rightFoot:legs[0].foot,leftLeg:legs[1].upper,leftKnee:legs[1].lower,leftFoot:legs[1].foot};for(const [name,bone]of Object.entries(parts))set(bone,...gait[name]);
  const arm=arms[0];
  if(['light','heavy','special'].includes(a.state)){
   // Attack keyframes are applied below as a full-body pose.
  }else if(a.state==='guard'){set(arm.upper,-1.15,-.35,.25);set(arm.lower,-1);set(arms[1].upper,-.7);set(arms[1].lower,-.8);}
  else if(a.state==='heal'){set(arms[1].upper,-1.1);set(arms[1].lower,-1.25);}
 }
 let attackPose=null;
 if(hero&&['light','heavy','special'].includes(a.state))attackPose=samplePlayerAttack(a);
 if(!hero&&['windup','attack'].includes(a.state))attackPose=sampleMonsterAttack(a);
 if(m.kind==='ronin'&&['windup','attack'].includes(a.state))attackPose=sampleSwordsmanAttack(a);
 if(hero&&a.state==='roll')attackPose=dodgePose(a);
 if(hero&&a.state==='dash')attackPose=dashPose(a);
 if(attackPose){const map={hips,chest:torso,head,rightArm:arms[0].upper,rightForearm:arms[0].lower,rightHand:arms[0].hand,leftArm:arms[1].upper,leftForearm:arms[1].lower,rightLeg:legs[0].upper,rightKnee:legs[0].lower,leftLeg:legs[1].upper,leftKnee:legs[1].lower};for(const [name,bone] of Object.entries(map))set(bone,...attackPose[name]);set(spine,...attackPose.chest.map(v=>v*.32));set(torso,...attackPose.chest.map(v=>v*.68));legs.forEach(l=>set(l.foot,-.06));}
 if(arms[0].grip){const {knuckles,fingers,thumb}=arms[0].grip;set(knuckles,0,0,1.12);set(fingers,0,0,1.35);set(thumb,0,.75,-.2);pose.get(arms[0].hand)[0]+=.9;}
 if(a.state==='stagger'){set(torso,.42,0,Math.sin(t*8)*.045);set(head,.24);arms.forEach((arm,i)=>{set(arm.upper,.18,0,i?-.16:.16);set(arm.lower,-.25);});}
 const previousBody=body.rotation.clone(),previousPosition=body.position.clone();
 body.rotation.set(...(hero?gait.body:[0,0,0]));body.position.set(...(hero?gait.offset:[0,moving?Math.abs(stride)*.022:breath*.5,0]));
 if(hero&&moving&&!attackPose)body.position.y-=Math.min(1,(a.speed||0)/1.2)*m.height*(a.state==='guard'?.045:.018);
 if(attackPose){body.rotation.set(...attackPose.body);body.position.add(new THREE.Vector3(...attackPose.offset));}
 if(a.state==='roll')root.rotation.y=a.dodgeYaw??a.yaw;
 if(a.state==='dead'){m.deathProgress=Math.min(1,m.deathProgress+dt*2.5);body.rotation.z=m.deathProgress*1.42;body.position.y=m.deathProgress*.18;}else m.deathProgress=0;
 // Add a directional recoil even when a boss keeps its windup (poise).
 const impact=a.impact,reacting=impact?.time>0&&a.state!=='dead'&&a.state!=='roll';
 if(!impact)m.lastImpact=0;
 const fresh=reacting&&m.lastImpact!==impact.id;if(fresh)m.lastImpact=impact.id;
 if(reacting){
  const age=1-impact.time/impact.total,envelope=Math.pow(1-age,1.7),force=impact.strength*envelope;
  const localX=impact.dirX*Math.cos(a.yaw)-impact.dirZ*Math.sin(a.yaw),localZ=impact.dirX*Math.sin(a.yaw)+impact.dirZ*Math.cos(a.yaw);
  const chest=pose.get(torso),neck=pose.get(head);
  chest[0]+=localZ*.48*force;chest[2]-=localX*.35*force;chest[1]+=(impact.id%2?1:-1)*.18*force;
  neck[0]+=localZ*.22*force;neck[2]-=localX*.15*force;
  body.position.x+=localX*.11*force;body.position.z+=localZ*.11*force;body.position.y-=.07*force;
  for(let i=0;i<2;i++){const arm=pose.get(arms[i].upper);arm[0]-=.18*force;arm[2]+=(i?-1:1)*.12*force;}
 }
 if(!attackPose&&!fresh&&a.state!=='dead'){const follow=1-Math.exp(-dt*18);body.rotation.x=THREE.MathUtils.lerp(previousBody.x,body.rotation.x,follow);body.rotation.z=THREE.MathUtils.lerp(previousBody.z,body.rotation.z,follow);body.position.lerpVectors(previousPosition,body.position,follow);}
 transitionPose(m,a,pose,dt,fresh,previousBody,previousPosition);
 const blend=fresh||attackPose&&dt>0?1:1-Math.exp(-dt*22);for(const [bone,angles] of pose){bone.rotation.x=THREE.MathUtils.lerp(bone.rotation.x,angles[0],blend);bone.rotation.y=THREE.MathUtils.lerp(bone.rotation.y,angles[1],blend);bone.rotation.z=THREE.MathUtils.lerp(bone.rotation.z,angles[2],blend);}
 if(dt<=0&&!fresh){body.rotation.copy(previousBody);body.position.copy(previousPosition);}
 if(m.cape&&dt>0){
  const previous=m.clothMotion||{x:0,z:0,vx:0,vz:0},targetX=THREE.MathUtils.clamp((a.speed||0)*.025+Math.abs(rawX+rawZ)*.008,0,.19),targetZ=THREE.MathUtils.clamp(-turn*.07-body.rotation.z*.3,-.12,.12),step=Math.min(dt,1/30);
  previous.vx+=((targetX-previous.x)*65-previous.vx*14)*step;previous.vz+=((targetZ-previous.z)*65-previous.vz*14)*step;previous.x+=previous.vx*step;previous.z+=previous.vz*step;m.clothMotion=previous;
  m.cape[0].rotation.set(-previous.x*.45,0,previous.z*.4);m.cape[1].rotation.set(-previous.x,0,previous.z);
 }
 // Feet are pinned to the ground by default; a pose that lifts the whole body (a leap) leaves it.
 if(attackPose&&attackPose.offset[1]>.04)m.footwork=null;else applyFootwork(m,a,dt);
 if(m.skirt&&dt>0)for(let i=0;i<2;i++){const target=THREE.MathUtils.clamp(legs[i].upper.rotation.x*.55,-.38,.28);m.skirt[i].rotation.x=THREE.MathUtils.lerp(m.skirt[i].rotation.x,target,1-Math.exp(-dt*14));m.skirt[i].rotation.z=legs[i].upper.rotation.z*.25;}
 for(const mesh of m.meshes){mesh.material.emissive.set(a.flash>0?(hero?'#9e2415':'#a76d35'):'#000000');mesh.material.emissiveIntensity=a.flash>0?(hero?.22:.16)*Math.min(1,a.flash/.12):0;}
}
