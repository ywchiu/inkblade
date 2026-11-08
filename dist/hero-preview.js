import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202329);
const camera = new THREE.PerspectiveCamera(36,1,.01,100);
const controls = new OrbitControls(camera,canvas);
controls.enableDamping = true;
controls.minDistance = 1;
controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI*.95;
const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
scene.environment = pmrem.fromScene(room,.04).texture;
scene.environmentIntensity = .7;
room.dispose(); pmrem.dispose();
const light = new THREE.DirectionalLight(0xffe7cc,3);
light.position.set(3,4,3);scene.add(light);
const fill = new THREE.DirectionalLight(0xc0d8ff,1.4);
fill.position.set(-3,2,-2);scene.add(fill);
const floor = new THREE.Mesh(new THREE.CircleGeometry(4,64),new THREE.MeshStandardMaterial({color:0x25282d,roughness:.95}));
floor.rotation.x=-Math.PI/2;floor.position.y=-.01;scene.add(floor);
function view(back=false){if(document.documentElement.dataset.asset==='wolf')camera.position.set(back?-3:3,1.9,back?4.3:-4.3);else camera.position.set(back?-4:4,1.25,back?-.4:.4);controls.target.set(0,.95,0);controls.update();}
view();
document.querySelector('#front').onclick=()=>view(false);
document.querySelector('#back').onclick=()=>view(true);
document.querySelector('#rotate').onclick=e=>{controls.autoRotate=!controls.autoRotate;e.target.setAttribute('aria-pressed',String(controls.autoRotate));e.target.textContent=controls.autoRotate?'停止旋轉':'自動旋轉';};
const assetKind=document.documentElement.dataset.asset||'hero';const isMonster=assetKind!=='hero';
const staticModel={hero:'./assets/hero/demon-queller.glb',monster:'./assets/monster/temple-guardian.glb',ronin:'./assets/ronin/faceless-swordsman.glb',wolf:'./assets/wolf/ink-wolf.glb'}[assetKind];
if(assetKind==='wolf'){camera.position.set(3,1.9,-4.3);controls.target.set(0,.9,0);controls.update();}
const stats={ready:false,asset:assetKind};window.heroPreview=stats;window.assetPreview=stats;
const rigTest=!isMonster&&new URLSearchParams(location.search).get('rigtest')==='1';
document.querySelectorAll('[data-animation]').forEach(b=>b.hidden=!rigTest);
document.querySelector('a[download]').href=rigTest?'./assets/hero/demon-queller-idle.glb':staticModel;
let mixer,activeAction;
const actions={};
const loader=new GLTFLoader();
loader.load(rigTest?'./assets/hero/demon-queller-idle.glb':staticModel,async gltf=>{
  const model=gltf.scene;
  const box=new THREE.Box3().setFromObject(model), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3());
  const scale=1.9/size.y;
  model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
  scene.add(model);
  let triangles=0,skins=0,meshes=0,joints=0;model.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;}if(o.isSkinnedMesh){skins++;joints+=o.skeleton.bones.length;}});
  if(!rigTest){
    Object.assign(stats,{ready:true,meshes,triangles,skins,animations:0,joints});
    document.querySelector('#status').textContent=isMonster?`${triangles.toLocaleString()} 個三角面 · PBR 材質 · 原始外觀預覽（遊戲另用程序骨架）`:`${triangles.toLocaleString()} 個三角面 · 4K 材質 · 外觀預覽，綁骨仍待修正`;
    return;
  }
  mixer=new THREE.AnimationMixer(model);
  const clips={idle:gltf.animations[0]};
  try{
    const extra=await Promise.all(['walk','run'].map(name=>loader.loadAsync(`./assets/hero/${name}-armature.glb`)));
    clips.walk=extra[0].animations[0];clips.run=extra[1].animations[0];
    for(const [name,source] of Object.entries(clips)){
      const clip=source.clone();
      // Preview locomotion in place without changing the source animation files.
      for(const track of clip.tracks) if(track.name==='Hips.position'){
        for(let i=0;i<track.values.length;i+=3){track.values[i]=track.values[0];track.values[i+2]=track.values[2];}
      }
      actions[name]=mixer.clipAction(clip);
    }
    document.querySelectorAll('[data-animation]').forEach(button=>{
      button.disabled=false;
      button.onclick=()=>{
        if(activeAction)activeAction.fadeOut(.2);
        activeAction=actions[button.dataset.animation];activeAction.reset().fadeIn(.2).play();stats.activeAnimation=button.dataset.animation;
        document.querySelectorAll('[data-animation]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
      };
    });
    document.querySelector('[data-animation="idle"]').click();
    Object.assign(stats,{ready:true,meshes,triangles,skins,animations:Object.keys(actions).length,joints});
    document.querySelector('#status').textContent='診斷版本：自動綁骨變形異常，尚未通過驗收';
  }catch(error){stats.error=String(error);document.querySelector('#status').textContent='模型已載入，但動畫載入失敗。';}
},undefined,error=>{stats.error=String(error);document.querySelector('#status').textContent='模型載入失敗，請重新整理或確認本機伺服器。';});
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
let lastTime;
renderer.setAnimationLoop(time=>{const dt=lastTime===undefined?0:Math.min((time-lastTime)/1000,.05);lastTime=time;if(mixer){mixer.update(dt);stats.animationTime=mixer.time;}controls.update();renderer.render(scene,camera);});
