import test from 'node:test';
import assert from 'node:assert/strict';
import {StoryDirector,SCENES,LORE,NAMES,SCENE_ORDER,STAGE_INTRO,STAGE_CLEAR,identityFor,voiced,recorded,VOICE_ON} from '../dist/story3d.js';
import {CampaignCombat,CHAPTERS} from '../dist/campaign3d.js';
import {PICKUPS} from '../dist/journey3d.js';
import {REALMS} from '../dist/realms.js';
import {REALM_SCENES} from '../dist/story3d.js';
import {journalHTML} from '../dist/story-view.js';
const readScene=story=>{const id=story.current;let steps=0;while(story.current===id&&steps++<20)story.advance();assert.ok(steps<20,'scene must terminate');};

test('campaign opens with the petition, follows into the village, and consumes the first chapter once',()=>{
 const s=new StoryDirector();assert.equal(s.start({campaign:true}).id,'opening');
 readScene(s);assert.equal(s.current,'village');readScene(s);assert.equal(s.current,null);
 assert.equal(s.event({type:'chapter',stage:0},{stage:0}),null);
 assert.deepEqual([...s.journal],['opening','village']);
});
test('skipping an encounter preserves all its pages, including queued exposition',()=>{
 const s=new StoryDirector();s.start({campaign:true});s.skip();
 assert.equal(s.current,null);assert.deepEqual([...s.journal],['opening','village']);
 assert.equal(s.event({type:'chapter',stage:0},{stage:0}),null);
});
test('the whole road reveals its pages in order, and the ending runs on to dawn only once',()=>{
 const s=new StoryDirector(),g=new CampaignCombat(),read=[];s.start({campaign:true});s.skip();
 const feed=()=>{for(const e of g.drainEvents()){const view=s.event(e,g);if(view){read.push(view.id);s.skip();}}};feed();
 for(let stage=0;stage<CHAPTERS.length;stage++){const chapter=CHAPTERS[stage];assert.equal(g.stage,stage);
  if(!chapter.instant&&!chapter.final)g.player.z=chapter.gate+2;
  for(let round=0;round<8&&!g.cleared;round++){for(const e of g.enemies)if(e.hp>0)g.withEnemy(e,()=>g.hitEnemy(e.hp+1));g.hitStop=0;g.bursts=[];g.update(1/60);}
  feed();if(chapter.final)break;
  if(chapter.instant){for(let i=0;i<200&&g.stage===stage;i++){g.hitStop=0;g.update(1/60);}}else for(let i=0;i<200&&g.stage===stage;i++){g.hitStop=0;g.player.z=chapter.gate+.9;g.update(1/60);}
  feed();}
 assert.equal(g.status,'won');
 const expected=CHAPTERS.flatMap((c,i)=>[...(i?[STAGE_INTRO[c.id]]:[]),...(STAGE_CLEAR[c.id]?[STAGE_CLEAR[c.id]]:[])]);assert.deepEqual(read,expected);
 assert.equal(s.finish(true,g).id,'ending');readScene(s);assert.equal(s.current,'epilogue');readScene(s);assert.equal(s.current,'soldNames','the names that were sold, and 喚名');readScene(s);assert.equal(s.current,'coda','the mountain keeps its own name without every rubbing');readScene(s);assert.equal(s.current,null);assert.equal(s.finish(true,g),null);
});
test('bringing back every hidden name adds the page that names the mountain',()=>{
 const s=new StoryDirector();s.start({campaign:true});s.skip();
 const all={rubbings:()=>Object.keys(NAMES).length};assert.equal(s.finish(true,all).id,'ending');s.advance();s.advance();s.advance();s.advance();assert.equal(s.current,'epilogue');readScene(s);assert.equal(s.current,'trueName');readScene(s);assert.equal(s.current,'soldNames');readScene(s);assert.equal(s.current,'coda');
});
test('a page that falls due while another is open follows it instead of being lost',()=>{
 const s=new StoryDirector();s.start({campaign:true});s.skip();
 assert.equal(s.event({type:'gate-open',stage:0},{stage:0}).id,'villageClear');
 assert.equal(s.event({type:'chapter',stage:1},{stage:1}),null);readScene(s);assert.equal(s.current,'wolf');readScene(s);assert.equal(s.current,null);
 assert.equal(s.event({type:'chapter',stage:1},{stage:1}),null,'never twice');
});
test('checkpoint retry does not replay its introduction, but the next chapter still plays',()=>{
 const s=new StoryDirector();s.start({campaign:true});s.skip();s.event({type:'chapter',stage:1},{stage:1});s.skip();
 assert.equal(s.start({campaign:true,retry:true,stage:1}),null);
 assert.equal(s.event({type:'chapter',stage:1},{stage:1}),null);
 assert.equal(s.event({type:'chapter',stage:2},{stage:2}).id,'alpha');
});
test('duels have specific intros and independent endings, defeat never awards an ending',()=>{
 for(const [opponent,intro,end] of [[0,'wolf','wolfEnd'],[1,'ronin','roninEnd'],[2,'oni','oniEnd']]){
  const s=new StoryDirector();assert.equal(s.start({opponent}).id,intro);s.skip();
  assert.equal(s.finish(false),null);assert.equal(s.finish(true).id,end);
  s.skip();assert.equal(s.start({opponent,retry:true}),null);
 }
});
test('new run replays story without erasing the journal',()=>{
 const s=new StoryDirector();s.start({campaign:true});s.skip();s.event({type:'chapter',stage:4},{stage:4});s.skip();
 assert.equal(s.start({campaign:true}).id,'opening');assert.ok(s.journal.has('ronin'));
});
test('journal and found names survive reload and ignore malformed, stale, or inherited keys',()=>{
 const saved={'inkblade.journal.v1':'["opening","missing","__proto__"]','inkblade.names.v1':'["r3","r99","constructor"]'};const storage={getItem:k=>saved[k]??null,setItem:(k,v)=>{saved[k]=v;}};
 const s=new StoryDirector(storage);assert.deepEqual([...s.journal],['opening']);assert.deepEqual([...s.names],['r3']);s.start({opponent:1});
 assert.equal(s.rubbing('r7',2).speaker,'名拓 · 2 / 12');assert.equal(s.rubbing('nope'),null);
 const again=new StoryDirector(storage);assert.deepEqual([...again.journal],['opening','ronin']);assert.deepEqual([...again.names],['r3','r7']);
 for(const value of ['bad','null','{}']){saved['inkblade.journal.v1']=value;assert.deepEqual([...new StoryDirector(storage).journal],[]);}
 const unavailable={getItem(){throw Error('denied');},setItem(){throw Error('full');}};
 assert.doesNotThrow(()=>{const d=new StoryDirector(unavailable);d.start();d.rubbing('r1');});
});
test('battle barks use the actor, are throttled and never interrupt dialogue',()=>{
 const s=new StoryDirector();s.start({campaign:true});const g={campaign:true,time:1,status:'playing',enemies:[{id:1,kindId:'ronin',role:'hanzhou'},{id:2,kindId:'wolf',role:'wolf'},{id:3,kindId:'ronin',role:'scribe'}],spec:{id:'oni'}};
 const e={type:'enemy-swing',enemyId:2};assert.equal(s.bark(e,g),null);s.skip();
 assert.equal(s.bark(e,g).speaker,'狼腹中的殘魂');
 assert.equal(s.bark({type:'projectile-release',enemyId:1},g),null);
 g.time=14;assert.equal(s.bark({type:'projectile-release',enemyId:1},g).speaker,'沈寒舟');
 g.time=30;assert.equal(s.bark(e,g),null);assert.equal(s.bark({type:'enrage',enemyId:999},g),null);
 const clerk=s.bark({type:'projectile-release',enemyId:3},g);assert.equal(clerk.speaker,'抄名鬼吏','a clerk does not borrow the bridge-keeper\'s line');assert.equal(voiced(clerk.id),false);
});
test('every scene is bounded and readable, every chapter and rubbing has its page, and source notes mark what is original',()=>{
 for(const [id,scene] of Object.entries(SCENES)){assert.ok(scene.lines.length>=2&&scene.lines.length<=5,id);assert.ok(SCENE_ORDER.includes(id),id);for(const l of scene.lines){assert.ok(l.text.length<=85);assert.ok(l.speaker);}}
 for(const chapter of CHAPTERS){assert.ok(SCENES[STAGE_INTRO[chapter.id]],chapter.id);if(!chapter.instant&&!chapter.final)assert.ok(SCENES[STAGE_CLEAR[chapter.id]],chapter.id);}
 for(const realm of REALMS)for(const find of realm.PICKUPS.filter(p=>p.kind==='rubbing'))assert.ok(NAMES[find.id],`${realm.id}: ${find.id} has its page`);
 assert.deepEqual(REALMS.flatMap(r=>r.PICKUPS.filter(p=>p.kind==='rubbing').map(p=>p.id)).sort(),Object.keys(NAMES).sort());
 for(const realm of REALMS)for(const chapter of realm.STAGES){assert.ok(SCENES[STAGE_INTRO[chapter.id]],chapter.id);if(!chapter.instant&&!chapter.final)assert.ok(SCENES[STAGE_CLEAR[chapter.id]],chapter.id);}
 for(const realm of REALMS)for(const id of [realm.opening,...realm.ending,realm.trueName])assert.ok(SCENES[id],`${realm.id}: ${id}`);
 assert.match(LORE[0].text,/原創/);assert.match(LORE[1].text,/被虎/);assert.match(LORE[1].text,/遊戲設定/);assert.match(LORE[2].text,/原創/);
 assert.equal(recorded('opening'),true);assert.equal(recorded('hall'),false);
 // Speech plays only while the switch is on, and never for a page without a recording.
 assert.equal(voiced('opening'),VOICE_ON);assert.equal(voiced('hall'),false);
});
test('on the road each foe shows its own name; a duel shows the story identity',()=>{
 const g=new CampaignCombat();assert.equal(identityFor(g).name,'墨狼');g.stage=CHAPTERS.findIndex(c=>c.id==='bridge');g.spawnStage();
 assert.deepEqual(g.enemies.map(e=>identityFor({...g,campaign:true,enemy:e,spec:e.spec}).name),['沈寒舟','寒舟劍影','寒舟劍影']);
 assert.equal(identityFor({campaign:false,spec:{id:'ronin'},enemy:g.enemies[1]}).name,'沈寒舟');
});

test('the mountain’s ending tells where the names went, and leads into the last line',()=>{
 const s=new StoryDirector();s.start({campaign:true});s.skip();
 s.finish(true,{rubbings:()=>0});
 assert.deepEqual([s.current,...s.queue],['ending','epilogue','soldNames','coda']);
 assert.equal(SCENES.soldNames.lines.length,4);
 assert.ok(SCENES.soldNames.lines.some(l=>l.text.includes('寒聲嶺')),'the next buyer’s road is named');
 assert.ok(SCENE_ORDER.indexOf('soldNames')>SCENE_ORDER.indexOf('trueName')&&SCENE_ORDER.indexOf('soldNames')<SCENE_ORDER.indexOf('coda'));
});

// Walk a realm's road with the real combat, read every page that falls due, and return the pages in the order read.
function walkRoad(realm,rubbings=0){
 const s=new StoryDirector(),g=new CampaignCombat(null,{realm}),read=[];read.push(s.start({campaign:true,realm}).id);while(s.current){const id=s.current;readScene(s);if(s.current&&s.current!==id)read.push(s.current);}
 const feed=()=>{for(const e of g.drainEvents()){const view=s.event(e,g);if(view){read.push(view.id);s.skip();}}};feed();
 const chapters=g.realm.STAGES;
 for(let stage=0;stage<chapters.length;stage++){const chapter=chapters[stage];
  if(!chapter.instant&&!chapter.final)g.player.z=chapter.gate+2;
  for(let round=0;round<8&&!g.cleared;round++){for(const pending of [...g.pending])g.deploy(pending,true);for(const e of g.enemies)if(e.hp>0){e.armour=0;g.withEnemy(e,()=>g.hitEnemy(e.hp+1));}g.hitStop=0;g.bursts=[];g.update(1/60);}
  feed();if(chapter.final)break;
  for(let i=0;i<200&&g.stage===stage;i++){g.hitStop=0;g.player.z=chapter.gate+.9;g.update(1/60);}
  feed();}
 assert.equal(g.status,'won');g.rubbings=()=>rubbings;
 let view=s.finish(true,g);while(view){read.push(view.id);readScene(s);view=s.current?s.view():null;}
 return read;
}
test('the snow road opens with the drawn petition and its first chapter',()=>{
 const s=new StoryDirector();assert.equal(s.start({campaign:true,realm:'snow'}).id,'snowOpening');readScene(s);assert.equal(s.current,'hush');
});
test('the whole snow road reveals its pages in order and ends at the coda',()=>{
 assert.deepEqual(walkRoad('snow'),REALM_SCENES.snow.filter(id=>id!=='snowTrueName'));
});
test('all six frozen voices add the valley’s old name',()=>{
 const read=walkRoad('snow',6);
 assert.deepEqual(read.slice(-3),['snowEpilogue','snowTrueName','snowCoda']);
});
test('a find is counted against its own realm',()=>{
 const snow=new StoryDirector();snow.start({campaign:true,realm:'snow'});assert.equal(snow.rubbing('v1',1).speaker,'冰聲 · 1 / 6');
 const mountain=new StoryDirector();mountain.start({campaign:true});assert.equal(mountain.rubbing('r1',1).speaker,'名拓 · 1 / 12');
});
test('the first blocked cut is explained once, even straight after another line',()=>{
 const s=new StoryDirector();s.start({campaign:true,realm:'snow'});s.skip();const g={campaign:true,time:5,status:'playing',enemies:[{id:1,kindId:'ronin',role:'crone'}],spec:{id:'ronin'}};
 assert.ok(s.bark({type:'ambush',enemyId:1},g),'another line was just said');
 const line=s.bark({type:'armour-turn',first:true,enemyId:1},g);
 assert.equal(line?.speaker,'鍾馗');assert.equal(line.text,'刀砍不進去……這層冰裡，全是人的聲音。');
 g.time=60;assert.equal(s.bark({type:'armour-turn',first:true,enemyId:1},g),null);
 assert.equal(s.bark({type:'armour-turn',first:false,enemyId:1},g),null);
});
test('a broken bell reads out whose voice it held',()=>{
 const s=new StoryDirector(),line=s.bellLine({id:'b4',name:'阿聆',text:'畫狀紙的啞女。',broken:4,total:4});
 assert.equal(line.speaker,'冰鈴 · 4 / 4');assert.equal(line.text,'「阿聆」畫狀紙的啞女。');assert.equal(line.id,'bell-b4');
});
test('the snow’s troops and master have their say',()=>{
 const s=new StoryDirector();s.start({campaign:true,realm:'snow'});s.skip();const g={campaign:true,time:1,status:'playing',enemies:[{id:1,kindId:'oni',role:'howler'},{id:2,kindId:'ronin',role:'crone'}],spec:{id:'oni'}};
 assert.equal(s.bark({type:'projectile-release',enemyId:1},g).speaker,'吼風山魈');
 g.time=20;assert.equal(s.bark({type:'troop-defeated',role:'traveller'},g).speaker,'凍旅人');
 g.time=40;assert.equal(s.bark({type:'armour-fall',enemyId:2},g).speaker,'凍聲婆');
});
test('the journal keeps each realm apart and hides the snow until it is reached',()=>{
 const story={journal:new Set(['opening','village']),names:new Set()};
 const before=journalHTML(story);assert.ok(!before.includes('寒聲嶺'));assert.ok(before.includes('名拓 · 0 / 12'));
 story.journal.add('snowOpening');story.journal.add('hush');
 const after=journalHTML(story);assert.ok(after.includes('寒聲嶺'));assert.ok(after.includes('冰聲 · 0 / 6'));
 assert.equal((after.match(/還凍在路旁某根冰柱裡/g)||[]).length,6);
 assert.ok(after.indexOf('data-story-entry="hush"')>after.indexOf('寒聲嶺'),'the snow pages sit under the snow');
});
