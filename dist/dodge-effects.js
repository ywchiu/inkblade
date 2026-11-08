import * as THREE from './vendor/three.module.js';
import { clone } from './vendor/addons/utils/SkeletonUtils.js';
// Two reusable frozen silhouettes: no new meshes or materials per dodge.
export class DodgeEchoes {
 constructor(scene,model){this.source=[];model.root.traverse(o=>this.source.push(o));this.captured=0;this.wasDodging=false;this.pool=Array.from({length:2},()=>{const root=clone(model.root),nodes=[],material=new THREE.MeshBasicMaterial({color:'#607b83',transparent:true,opacity:0,depthWrite:false});root.traverse(o=>{nodes.push(o);if(o.isMesh){o.material=material;o.castShadow=false;o.receiveShadow=false;}});root.visible=false;scene.add(root);return{root,nodes,material,life:0};});}
 clear(){this.captured=0;this.wasDodging=false;for(const echo of this.pool){echo.life=0;echo.root.visible=false;}}
 update(dt,actor,options={}){if(dt<=0)return;for(const echo of this.pool){echo.life=Math.max(0,echo.life-dt);echo.root.visible=echo.life>0;echo.material.opacity=.20*Math.pow(echo.life/.19,1.4);}
  const dodging=options.active??(actor.state==='roll');if(dodging&&!this.wasDodging)this.captured=0;
  const age=actor.total-actor.timer;if(dodging&&this.captured<2&&age>=(options.start??.055)+this.captured*.065){const echo=this.pool[this.captured++];this.source.forEach((source,i)=>{const target=echo.nodes[i];target.position.copy(source.position);target.quaternion.copy(source.quaternion);target.scale.copy(source.scale);});echo.life=.19;echo.material.opacity=.20;echo.root.visible=true;echo.root.updateMatrixWorld(true);}
  this.wasDodging=dodging;
 }
 snapshot(){return{active:this.pool.filter(e=>e.life>0).length};}
}
