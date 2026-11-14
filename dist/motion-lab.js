// Development contact sheet: steps the real animation code at 60 Hz and lays
// sampled frames out in a grid, so gait and attack arcs can be read at a glance.
// Procedural rig:  motion-lab.html?who=hero&clip=walk&view=side&cols=8&rows=2&span=1.2
// Game rig:        motion-lab.html?rig=1&who=hero&clip=diagonal   (authored clips through the game's own loader)
// Rigged GLB:      motion-lab.html?rig=./assets/hero/x.glb&clips=./assets/hero/walk.glb&clip=walk&view=front
//                  (clip matches by name fragment or index; omit to list them in window.labClips)
import * as THREE from './vendor/three.module.js';
import { loadCharacter, loadSkin, SKINS, animateCharacter } from './characters3d.js';
import { PLAYER_MOVES, attackTravel } from './attack-moves.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
const q=new URLSearchParams(location.search),who=q.get('who')||'hero',clip=q.get('clip')||'walk',view=q.get('view')||'side',cols=+(q.get('cols')||8),rows=+(q.get('rows')||2);
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
const W=innerWidth,H=innerHeight;renderer.setSize(W,H);renderer.setScissorTest(true);renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#40444c',2.2));const sun=new THREE.DirectionalLight('#fff1dc',2.6);sun.position.set(3,6,4);scene.add(sun);
const grid=new THREE.GridHelper(60,120,'#5c6570','#343a42');scene.add(grid);
const camera=new THREE.PerspectiveCamera(30,(W/cols)/(H/rows),.1,100);

const views={front:[0,.12,1],back:[0,.25,-1],quarter:[.75,.3,.75],side:[1,.08,0],top:[0,1,.001]};
function cell(i,center,size){const cw=W/cols,ch=H/rows,cx=(i%cols)*cw,cy=H-ch*(Math.floor(i/cols)+1),dir=views[view]||views.side,dist=size*3.3;camera.position.set(center.x+dir[0]*dist,center.y+dir[1]*dist,center.z+dir[2]*dist);camera.lookAt(center);renderer.setViewport(cx,cy,cw,ch);renderer.setScissor(cx,cy,cw,ch);renderer.render(scene,camera);}
renderer.setClearColor('#1c1f24');
// Rigged mode plays authored clips through AnimationMixer, exactly as the game will.
if(q.get('rig')&&q.get('rig')!=='1'){
 const loader=new GLTFLoader(),gltf=await loader.loadAsync(q.get('rig')),root=gltf.scene;scene.add(root);
 const clipsFound=[...gltf.animations];for(const url of (q.get('clips')||'').split(',').filter(Boolean))clipsFound.push(...(await loader.loadAsync(url)).animations.map(c=>{c.name=c.name||url;c.userData={url};return c;}));
 const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 let bones=0,skins=0,tris=0;root.traverse(o=>{if(o.isBone)bones++;if(o.isSkinnedMesh){skins++;o.frustumCulled=false;}if(o.isMesh)tris+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});
 if(q.get('bones')==='1')scene.add(new THREE.SkeletonHelper(root));
 // A model that is wider along Z than X is facing sideways: the usual cause of a twisted auto-rig.
 window.labClips=clipsFound.map((c,i)=>({i,name:c.name,duration:+c.duration.toFixed(3),tracks:c.tracks.length}));
 window.labModel={size:size.toArray().map(v=>+v.toFixed(3)),min:box.min.toArray().map(v=>+v.toFixed(3)),bones,skins,triangles:tris,facing:size.x>=size.z?'±Z (front or back)':'±X (sideways)'};
 const wanted=q.get('clip'),picked=wanted==null?clipsFound[0]:clipsFound[+wanted]||clipsFound.find(c=>(c.name+' '+(c.userData?.url||'')).toLowerCase().includes(wanted.toLowerCase()));
 const mixer=new THREE.AnimationMixer(root),total=cols*rows;if(picked){const clip=picked.clone();if(q.get('inplace')!=='0')for(const t of clip.tracks)if(/(hips|root|pelvis)\.position$/i.test(t.name))for(let i=0;i<t.values.length;i+=3){t.values[i]=t.values[0];t.values[i+2]=t.values[2];}mixer.clipAction(clip).play();}
 const length=+(q.get('span')||picked?.duration||1);
 for(let i=0;i<total;i++){mixer.setTime(length*i/total);root.updateMatrixWorld(true);cell(i,new THREE.Vector3(center.x,center.y,center.z),size.y);}
 window.labPicked=picked?.name||null;window.labReady=true;
}else{
// A role's own body (who=beast, who=scribe) goes through the same loader the campaign uses.
const model=SKINS.includes(who)?await loadSkin(who):await loadCharacter(who);scene.add(model.root);
const base=()=>({x:0,z:0,yaw:0,hp:1,state:'idle',timer:0,total:0,flash:0,speed:0,impact:null,phase:0,rollX:0,rollZ:1,kindId:who});
// Each clip returns the actor state at time t (dt = step) and its total length.
const clips={
 idle:{span:3,step(a){}},
 walk:{span:1.3,step(a,t,dt){a.speed=3.25;a.z+=a.speed*dt;}},
 run:{span:.9,step(a,t,dt){a.speed=5.8;a.z+=a.speed*dt;}},
 guardwalk:{span:1.6,step(a,t,dt){a.state='guard';a.speed=1.45;a.z+=a.speed*dt;}},
 strafe:{span:1.3,step(a,t,dt){a.speed=3.25;a.x+=a.speed*dt;}},
 chase:{span:1.4,step(a,t,dt){a.speed=+(q.get('speed')||2.5);a.z+=a.speed*dt;}},
 stagger:{span:1.2,step(a){a.state='stagger';}},
 dead:{span:1.4,step(a){a.state='dead';a.hp=0;a.deadTime=(a.deadTime||0)+1/60;}},
};
for(const id of Object.keys(PLAYER_MOVES))clips[id]={span:PLAYER_MOVES[id].duration+.2,step(a,t,dt){const m=PLAYER_MOVES[id];if(t<.1){a.state='idle';return;}const age=t-.1;if(age>m.duration){a.state='idle';a.move=null;return;}a.state=id==='heavy'||id==='execute'?'heavy':id==='spin'?'special':'light';a.move=id;a.total=m.duration;a.timer=m.duration-age;a.z+=attackTravel(m,age)-attackTravel(m,Math.max(0,age-dt));}};
// Enemy attack: clip=atk&kind=slash&variant=claw-right&windup=.72&duration=.48
clips.atk={span:+(q.get('windup')||.8)+(+(q.get('duration')||.48))+.5,step(a,t,dt){const w=+(q.get('windup')||.8),d=+(q.get('duration')||.48);a.kind=q.get('kind')||'slash';a.variant=q.get('variant')||'claw-right';a.moveData={speed:+(q.get('mspeed')||0)};if(t<w){a.state='windup';a.total=w;a.timer=w-t;}else if(t<w+d){a.state='attack';a.total=d;a.timer=w+d-t;if(a.moveData.speed){a.z+=a.moveData.speed*dt;a.speed=a.moveData.speed;}}else{a.state='idle';a.speed=0;}}};
const def=clips[clip],span=+(q.get('span')||def.span),count=cols*rows,actor=base(),dt=1/60;let t=0,next=0;
const h=model.height;
for(let i=0;i<count;i++){
 const sample=span*i/(count-1||1);
 while(t<sample-1e-6||(i===0&&next===0)){def.step(actor,t,dt);animateCharacter(model,actor,t,dt);t+=dt;next=1;if(i===0)break;}
 cell(i,new THREE.Vector3(actor.x,h*.5,actor.z),h*(model.type==='wolf'?1.03:who==='oni'?.94:1));
}
window.labReady=true;
}
