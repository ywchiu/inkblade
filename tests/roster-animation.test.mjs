import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleSwordsmanAttack } from '../dist/attack-moves.js';

test('swordsman keeps the windup-to-attack pose continuous and differentiates slash directions and thrust',()=>{
 const contacts=[];
 for(const variant of ['slash-right','slash-left','thrust']){
  const a={variant,kind:variant==='thrust'?'thrust':'slash'};
  const wind=sampleSwordsmanAttack({...a,state:'windup',total:.82,timer:0});
  const start=sampleSwordsmanAttack({...a,state:'attack',total:.48,timer:.48});
  assert.deepEqual(wind,start);
  for(let frame=0;frame<=48;frame++){const pose=sampleSwordsmanAttack({...a,state:'attack',total:.48,timer:.48-frame*.01});assert.ok(Object.values(pose).flat().every(Number.isFinite));}
  contacts.push(sampleSwordsmanAttack({...a,state:'attack',total:.48,timer:.48*.6}));
 }
 assert.notDeepEqual(contacts[0],contacts[1]);assert.notDeepEqual(contacts[1],contacts[2]);
});
