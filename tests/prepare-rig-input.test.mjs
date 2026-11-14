import test from 'node:test';import assert from 'node:assert/strict';
import { normalizeGlb, parseGlb, writeGlb } from '../scripts/prepare-rig-input.mjs';

// A 0.4 (x) by 2 (y) by 1 (z) block: "shoulders" along Z, so it faces +X, offset from the origin.
function sidewaysBlock(extra={}){
 const corners=[];for(const x of[1,1.4])for(const y of[3,5])for(const z of[-.5,.5])corners.push(x,y,z);
 const normals=corners.map((_,i)=>i%3===0?1:0),bin=new Uint8Array(new Float32Array([...corners,...normals]).buffer);
 const json={asset:{version:'2.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{mesh:0,...extra.node}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1}}]}],buffers:[{byteLength:bin.length}],bufferViews:[{buffer:0,byteOffset:0,byteLength:96},{buffer:0,byteOffset:96,byteLength:96}],accessors:[{bufferView:0,componentType:5126,count:8,type:'VEC3',min:[1,3,-.5],max:[1.4,5,.5]},{bufferView:1,componentType:5126,count:8,type:'VEC3'}],...extra.json};
 return writeGlb(json,bin);
}
const floats=(glb,index)=>{const {json,bin}=parseGlb(glb),v=json.bufferViews[json.accessors[index].bufferView];return [...new Float32Array(bin.buffer.slice(bin.byteOffset+v.byteOffset,bin.byteOffset+v.byteOffset+v.byteLength))];};

test('a sideways mesh is turned to face +Z, grounded, centred and rescaled',()=>{
 const {glb,report}=normalizeGlb(sidewaysBlock(),{yaw:-90,height:1.9}),{json}=parseGlb(glb),{min,max}=json.accessors[0];
 assert.equal(report.wideAxis,'x');assert.equal(report.warning,null);
 assert.ok(Math.abs(min[1])<1e-6&&Math.abs(max[1]-1.9)<1e-6);assert.ok(Math.abs(min[0]+max[0])<1e-6&&Math.abs(min[2]+max[2])<1e-6);
 assert.ok(Math.abs(max[0]-min[0]-.95)<1e-5&&Math.abs(max[2]-min[2]-.38)<1e-5);
 // The +X surface normal now points along +Z and stays unit length despite the rescale.
 const n=floats(glb,1);assert.ok(Math.abs(n[0])<1e-6&&Math.abs(n[1])<1e-6&&Math.abs(n[2]-1)<1e-6);
});
test('node transforms are baked in and cleared so the rigger sees identity nodes',()=>{
 const {glb}=normalizeGlb(sidewaysBlock({node:{translation:[9,0,0],scale:[2,2,2]}}),{yaw:-90}),{json}=parseGlb(glb);
 assert.deepEqual(Object.keys(json.nodes[0]),['mesh']);assert.ok(Math.abs(json.accessors[0].max[1]-4)<1e-5);
});
test('an unturned sideways mesh is reported, and skinned or compressed input is refused',()=>{
 assert.match(normalizeGlb(sidewaysBlock()).report.warning,/sideways/);
 assert.throws(()=>normalizeGlb(sidewaysBlock({json:{skins:[{joints:[0]}]}})),/already skinned/);
 const stripped=parseGlb(normalizeGlb(sidewaysBlock({node:{skin:0,translation:[5,5,5]},json:{skins:[{joints:[0]}],animations:[{channels:[],samplers:[]}]}}),{yaw:-90,stripSkin:true}).glb).json;assert.equal(stripped.skins,undefined);assert.equal(stripped.animations,undefined);assert.ok(Math.abs(stripped.accessors[0].max[1]-2)<1e-5);
 assert.throws(()=>normalizeGlb(sidewaysBlock({json:{extensionsRequired:['KHR_draco_mesh_compression']}})),/Compressed geometry/);
});
