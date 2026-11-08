import test from 'node:test';
import assert from 'node:assert/strict';
import {StoryDirector,SCENES,LORE,identityFor} from '../dist/story3d.js';
import {CampaignCombat} from '../dist/campaign3d.js';
const readScene=story=>{const id=story.current;let steps=0;while(story.current===id&&steps++<20)story.advance();assert.ok(steps<20,'scene must terminate');};

test('campaign opens with the petition, follows into wolves, and consumes initial chapter once',()=>{
 const s=new StoryDirector();assert.equal(s.start({campaign:true}).id,'opening');
 readScene(s);assert.equal(s.current,'wolf');readScene(s);assert.equal(s.current,null);
 assert.equal(s.event({type:'chapter',stage:0},{stage:0}),null);
 assert.deepEqual([...s.journal],['opening','wolf']);
});
test('skipping an encounter preserves all its pages, including queued exposition',()=>{
 const s=new StoryDirector();s.start({campaign:true});s.skip();
 assert.equal(s.current,null);assert.deepEqual([...s.journal],['opening','wolf']);
 assert.equal(s.event({type:'chapter',stage:0},{stage:0}),null);
});
test('real campaign milestones reveal clues in order and final scene only once',()=>{
 const s=new StoryDirector(),g=new CampaignCombat();s.start({campaign:true});s.skip();
 for(const e of g.drainEvents())assert.equal(s.event(e,g),null);
 for(let stage=0;stage<3;stage++){
  assert.equal(g.stage,stage);
  for(const enemy of g.enemies)g.withEnemy(enemy,()=>g.hitEnemy(enemy.hp+1));
  g.update(1/60);
  const events=g.drainEvents();for(const e of events)s.event(e,g);
  if(stage<2){assert.equal(s.current,stage===0?'wolfClear':'roninClear');s.skip();
   g.player.z=g.objective().gate;g.update(1/60);for(const e of g.drainEvents())s.event(e,g);
   assert.equal(s.current,stage===0?'ronin':'oni');s.skip();
  }else{assert.equal(g.status,'won');assert.equal(s.finish(true).id,'ending');readScene(s);assert.equal(s.finish(true),null);}
 }
 assert.deepEqual([...s.journal],['opening','wolf','wolfClear','ronin','roninClear','oni','ending']);
});
test('checkpoint retry does not replay its introduction, but the next chapter still plays',()=>{
 const s=new StoryDirector();s.start({campaign:true});s.skip();s.event({type:'chapter',stage:1},{stage:1});s.skip();
 assert.equal(s.start({campaign:true,retry:true,stage:1}),null);
 assert.equal(s.event({type:'chapter',stage:1},{stage:1}),null);
 assert.equal(s.event({type:'chapter',stage:2},{stage:2}).id,'oni');
});
test('duels have specific intros and independent endings, defeat never awards an ending',()=>{
 for(const [opponent,intro,end] of [[0,'wolf','wolfEnd'],[1,'ronin','roninEnd'],[2,'oni','oniEnd']]){
  const s=new StoryDirector();assert.equal(s.start({opponent}).id,intro);s.skip();
  assert.equal(s.finish(false),null);assert.equal(s.finish(true).id,end);
  s.skip();assert.equal(s.start({opponent,retry:true}),null);
 }
});
test('new run replays story without erasing the journal',()=>{
 const s=new StoryDirector();s.start({campaign:true});s.skip();s.event({type:'chapter',stage:1},{stage:1});s.skip();
 assert.equal(s.start({campaign:true}).id,'opening');assert.ok(s.journal.has('ronin'));
});
test('journal survives reload and ignores malformed, stale, or inherited scene keys',()=>{
 let saved='["opening","missing","__proto__"]';const storage={getItem:()=>saved,setItem:(_,v)=>{saved=v;}};
 const s=new StoryDirector(storage);assert.deepEqual([...s.journal],['opening']);s.start({opponent:1});
 assert.deepEqual([...new StoryDirector(storage).journal],['opening','ronin']);
 for(const value of ['bad','null','{}']){saved=value;assert.deepEqual([...new StoryDirector(storage).journal],[]);}
 const unavailable={getItem(){throw Error('denied');},setItem(){throw Error('full');}};
 assert.doesNotThrow(()=>new StoryDirector(unavailable).start());
});
test('battle barks use the actor, are throttled and never interrupt dialogue',()=>{
 const s=new StoryDirector();s.start({campaign:true});const g={campaign:true,time:1,status:'playing',enemies:[{id:1,kindId:'ronin'},{id:2,kindId:'wolf'}],spec:{id:'oni'}};
 const e={type:'enemy-swing',enemyId:2};assert.equal(s.bark(e,g),null);s.skip();
 assert.equal(s.bark(e,g).speaker,'狼腹中的殘魂');
 assert.equal(s.bark({type:'projectile-release',enemyId:1},g),null);
 g.time=14;assert.equal(s.bark({type:'projectile-release',enemyId:1},g).speaker,'沈寒舟');
 g.time=30;assert.equal(s.bark(e,g),null);assert.equal(s.bark({type:'enrage',enemyId:999},g),null);
});
test('all scenes are bounded, readable and source notes distinguish original adaptation',()=>{
 for(const scene of Object.values(SCENES)){assert.ok(scene.lines.length>=2&&scene.lines.length<=4);for(const l of scene.lines){assert.ok(l.text.length<=85);assert.ok(l.speaker);}}
 assert.match(LORE[0].text,/原創/);assert.match(LORE[1].text,/被虎/);assert.match(LORE[1].text,/遊戲設定/);
});

test('the swordsman and his two manifestations have distinct HUD identities',()=>{
 const leader={kindId:'ronin'},shadow={kindId:'ronin'},g={campaign:true,spec:{id:'ronin'},enemy:leader,enemies:[leader,shadow]};
 assert.equal(identityFor(g).name,'沈寒舟');g.enemy=shadow;assert.equal(identityFor(g).name,'寒舟劍影');g.campaign=false;assert.equal(identityFor(g).name,'沈寒舟');
});
