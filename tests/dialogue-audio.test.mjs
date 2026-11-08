import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DialogueAudio} from '../dist/dialogue-audio.js';
import {SCENES} from '../dist/story3d.js';

function fixture(fetcher=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})){
 const sources=[],audio={hidden:false,dialogue:{},dialogueActive:false,mixes:0,async unlock(){return true;},applyMix(){this.mixes++;},ctx:{currentTime:0,async decodeAudioData(){return {duration:10};},createBufferSource(){const s={connect(){},disconnect(){this.disconnected=true;},start(when,offset){this.offset=offset;},stop(){this.stopped=true;this.onended?.();}};sources.push(s);return s;}}};
 return {audio,sources,lane:new DialogueAudio(audio,{fetcher})};
}
test('next line replaces speech; stale completion cannot unduck the next voice',async()=>{
 const {lane,audio,sources}=fixture();await lane.play('opening-0');const stale=sources[0].onended;
 await lane.play('opening-1');assert.equal(sources[0].stopped,true);assert.equal(lane.id,'opening-1');stale();assert.equal(audio.dialogueActive,true);assert.equal(lane.state,'playing');
 sources[1].onended();assert.equal(lane.state,'ended');assert.equal(audio.dialogueActive,false);
});
test('skip while loading suppresses late speech and cached replay avoids another fetch',async()=>{
 let finish,fetches=0;const {lane,sources}=fixture(()=>{fetches++;return new Promise(r=>finish=r);});
 const playing=lane.play('opening-0');await Promise.resolve();lane.stop();finish({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});await playing;
 assert.equal(sources.length,0);assert.equal(lane.state,'idle');await lane.play('opening-0');assert.equal(fetches,1);assert.equal(sources.length,1);
});
test('blur resumes from the same timestamp and repeated focus does not overlap',async()=>{
 const {lane,audio,sources}=fixture();await lane.play('wolf-0');audio.ctx.currentTime=2.4;lane.pause();assert.equal(lane.offset,2.4);assert.equal(audio.dialogueActive,false);
 await Promise.all([lane.resume(),lane.resume()]);assert.equal(sources.length,2);assert.equal(sources[1].offset,2.4);lane.stop();assert.equal(sources[1].stopped,true);assert.equal(lane.state,'idle');
});
test('missing clip is retryable; hidden tab never starts a new voice',async()=>{
 let ok=false;const {lane,audio,sources}=fixture(async()=>({ok,status:404,arrayBuffer:async()=>new ArrayBuffer(8)}));
 assert.equal(await lane.play('wolf-0'),false);assert.equal(lane.state,'failed');assert.equal(lane.error,'HTTP 404');
 ok=true;audio.hidden=true;await lane.play('wolf-0');assert.equal(lane.state,'paused');assert.equal(sources.length,0);audio.hidden=false;await lane.resume();assert.equal(lane.state,'playing');
});
test('all story subtitles match shipped voice files and generation receipts',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../art/audio/dialogue/manifest.json',import.meta.url)));
 const expected=Object.entries(SCENES).flatMap(([id,scene])=>scene.lines.map((line,index)=>({id:`${id}-${index}`,text:line.text})));
 assert.equal(manifest.length,37);assert.equal(new Set(manifest.map(x=>x.id)).size,37);
 for(const line of expected){const clip=manifest.find(x=>x.id===line.id);assert.ok(clip,line.id);assert.equal(clip.text,line.text);}
 for(const clip of manifest){assert.ok(statSync(new URL(`../dist/${clip.file}`,import.meta.url)).size>1000);assert.ok(clip.duration>1);assert.ok(clip.peak<.95);assert.ok(clip.rms>.001);}
});

test('acted dialogue keeps subtitle wording and ships the validated takes',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../art/audio/dialogue/manifest.json',import.meta.url)));
 const spoken=text=>text.replace(/\[[^\]]*\]/g,'').replace(/[^\u4e00-\u9fff]/g,'');
 assert.equal(manifest.filter(x=>x.sourceRevision==='emotion-v2').length,35);
 for(const clip of manifest){
  const base=`../art/audio/dialogue/${clip.sourceRevision?clip.sourceRevision+'/':''}`;
  const [job]=JSON.parse(readFileSync(new URL(`${base}${clip.id}-result.json`,import.meta.url)));
  assert.equal(job.id,clip.jobId);assert.equal(job.params.prompt,clip.generationPrompt||clip.text);assert.equal(spoken(job.params.prompt),spoken(clip.text));
  assert.equal(createHash('sha256').update(readFileSync(new URL(`../dist/${clip.file}`,import.meta.url))).digest('hex'),clip.sha256);
 }
});
