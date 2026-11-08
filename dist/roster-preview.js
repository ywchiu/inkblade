import * as THREE from './vendor/three.module.js';
import { OrbitControls } from './vendor/addons/controls/OrbitControls.js';
import { RoomEnvironment } from './vendor/addons/environments/RoomEnvironment.js';
import { PLAYER_MOVES } from './attack-moves.js';
import { loadCharacter, animateCharacter } from './characters3d.js';
const requested=new URLSearchParams(location.search).get('kind'),kind=['hero','oni','wolf','ronin'].includes(requested)?requested:'ronin';document.querySelector('#kind').value=kind;document.querySelector('#kind').onchange=e=>location.search='?kind='+e.target.value;
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
const scene=new THREE.Scene();scene.background=new THREE.Color('#28333b');const camera=new THREE.PerspectiveCamera(38,1,.1,100),controls=new OrbitControls(camera,canvas);controls.target.set(0,1,0);camera.position.set(3,2.1,4);controls.update();
const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.6;room.dispose();pmrem.dispose();scene.add(new THREE.HemisphereLight('#d1e1ed','#353438',1));const light=new THREE.DirectionalLight('#e5d9c7',2.5);light.position.set(-3,5,4);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.normalBias=.02;scene.add(light);const floor=new THREE.Mesh(new THREE.CircleGeometry(4,64),new THREE.MeshStandardMaterial({color:'#323b40',roughness:.9}));floor.receiveShadow=true;floor.rotation.x=-Math.PI/2;floor.position.y=-.02;scene.add(floor);const grid=new THREE.GridHelper(8,32,'#52616a','#3c474e');grid.position.y=-.015;scene.add(grid);
const stats={ready:false};window.rosterPreview=stats;
let activeModel,playing=false,clock=0,last=0;
function actorPose(value,p,time=0){
 const state=value==='walk'?'idle':value==='attack'&&kind==='hero'?'light':value,total=state==='heavy'?PLAYER_MOVES.heavy.duration:state==='light'?PLAYER_MOVES.diagonal.duration:state==='windup'?.82:.48;
 const a={x:0,z:0,yaw:0,state,speed:value==='walk'?2.2:0,flash:0,total,timer:total*(1-p),move:state==='heavy'?'heavy':'diagonal',kind:kind==='wolf'?'pounce':kind==='oni'?'slam':'slash',variant:kind==='oni'?'slam':'slash-right'};
 if(value==='walk'&&playing){a.z=Math.sin(time*1.2)*1.3;a.speed=Math.abs(Math.cos(time*1.2)*1.56);}
 if(value==='hurt')a.impact={id:1,time:.4,total:.4,strength:1,dirX:1,dirZ:0};return a;
}
function report(){stats.feet=activeModel.footwork?.feet.map(f=>({swing:f.swing,error:f.error,target:f.target?.toArray()}));stats.pose=document.querySelector('#pose').value;stats.playing=playing;}
function renderPose(){if(!activeModel)return;const value=document.querySelector('#pose').value,p=+document.querySelector('#progress').value,a=actorPose(value,p);activeModel.phase=0;activeModel.deathProgress=0;activeModel.motionTransition=null;activeModel.footwork=null;for(let i=0;i<30;i++)animateCharacter(activeModel,a,p,.016);activeModel.root.updateMatrixWorld(true);report();stats.progress=p;}
loadCharacter(kind).then(model=>{activeModel=model;scene.add(model.root);stats.ready=true;stats.bones=model.skeleton.bones.length;document.querySelector('#status').textContent=({hero:'執墨人',oni:'鎮祟山魈',wolf:'墨狼',ronin:'無相劍客'}[kind])+` · ${stats.bones} 骨 · fal 外觀 / 本機程序動畫`;
 if(kind==='oni'){camera.position.multiplyScalar(1.4);controls.target.y=1.5;controls.update();}
 document.querySelector('#pose').onchange=()=>{clock=0;renderPose();};document.querySelector('#progress').oninput=renderPose;renderPose();
}).catch(e=>{stats.error=String(e);document.querySelector('#status').textContent=String(e);});
document.querySelector('#play').onclick=e=>{playing=!playing;e.target.textContent=playing?'暫停動作':'播放動作';report();};
document.querySelector('#hand').onclick=()=>{if(!activeModel?.arms)return;activeModel.root.updateMatrixWorld(true);const point=activeModel.arms[0].hand.getWorldPosition(new THREE.Vector3());controls.target.copy(point);camera.position.copy(point).add(new THREE.Vector3(-.45,.15,.45));controls.update();};
document.querySelector('#back').onclick=()=>{camera.position.set(-2.6,1.8,-4.2);controls.target.set(0,1,0);controls.update();};
document.querySelector('#side').onclick=()=>{camera.position.set(4.6,1.8,.15);controls.target.set(0,1,0);controls.update();};document.querySelector('#front').onclick=()=>{camera.position.set(.2,1.7,4.9);controls.target.set(0,1,0);controls.update();};
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();renderer.setAnimationLoop(time=>{const dt=last?Math.min(.04,(time-last)/1000):0;last=time;if(playing&&activeModel){clock+=dt;const value=document.querySelector('#pose').value,duration=value==='heavy'?PLAYER_MOVES.heavy.duration:kind==='hero'&&value==='attack'?PLAYER_MOVES.diagonal.duration:.82;animateCharacter(activeModel,actorPose(value,(clock%duration)/duration,clock),clock,dt);report();}controls.update();renderer.render(scene,camera);});
