import test from 'node:test';
import assert from 'node:assert/strict';
import {StoryView} from '../dist/story-view.js';

test('long acted battle cries retain subtitles until their matching voice ends',()=>{
 const original=globalThis.document,nodes=new Map();
 globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,{hidden:true,addEventListener(){}});return nodes.get(id);}};
 try{
  const view=new StoryView({next(){},skip(){}}),line={id:'bark-wolf-voice',speaker:'殘魂',text:'救我……我不想再替祂引路。'};
  view.bark(line);for(let i=0;i<70;i++)view.update(.1,{id:line.id,state:'playing'});
  assert.equal(nodes.get('story-bark').hidden,false);view.update(.4,{id:line.id,state:'ended'});assert.equal(nodes.get('story-bark').hidden,true);
  view.bark(line);view.clearBark();view.update(.1,{id:line.id,state:'playing'});assert.equal(nodes.get('story-bark').hidden,true);
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});

test('unrelated or failed voices cannot hold an old battle subtitle open',()=>{
 const original=globalThis.document,nodes=new Map();
 globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,{hidden:true,addEventListener(){}});return nodes.get(id);}};
 try{
  const view=new StoryView({next(){},skip(){}}),line={id:'bark-wolf-voice',speaker:'殘魂',text:'救我'};
  for(const voice of [{id:'opening-0',state:'playing'},{id:line.id,state:'failed'},null]){view.bark(line);view.update(4.6,voice);assert.equal(nodes.get('story-bark').hidden,true);}
 }finally{if(original===undefined)delete globalThis.document;else globalThis.document=original;}
});
