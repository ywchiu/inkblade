import test from 'node:test';
import assert from 'node:assert/strict';
import { mountainGeometry } from '../dist/world3d.js';
test('mountain tip floating point rounding never creates invalid vertices or normals',()=>{
 for(let i=0;i<30;i++){
  const g=mountainGeometry(4+i*.137,7+i*.912731);
  for(const name of ['position','normal'])assert.ok(g.attributes[name].array.every(Number.isFinite),`finite ${name} at height ${i}`);
  g.computeBoundingSphere();assert.ok(Number.isFinite(g.boundingSphere.radius));g.dispose();
 }
});
