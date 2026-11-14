// Authored rhythms: each chain ends in a punishable recovery, never an endless combo.
const moves={
 slam:{kind:'slam',variant:'slam',name:'震地',windup:1.12,recovery:1.65,range:4.1,damage:31},
 right:{kind:'slash',variant:'claw-right',name:'右爪',windup:.72,recovery:1.15,range:3.3,damage:25},
 left:{kind:'slash',variant:'claw-left',name:'回身左爪',windup:.56,recovery:1.35,range:3.3,damage:25},
 delayed:{kind:'slam',variant:'slam',name:'蓄勢重震',windup:1.22,recovery:1.85,range:4.1,damage:35},
 advance:{kind:'slash',variant:'claw-right',name:'踏步撕擊',windup:.9,duration:.65,recovery:1.3,range:3.5,damage:27,advance:6.5,advanceUntil:.5,activeWindow:true,lane:7.5}
};
export function guardianSequence(cycle,enraged,dist){
 const pattern=dist>4.5?['advance','delayed']:[['slam'],['right','left'],['right','delayed']][cycle%3];
 const keys=enraged&&pattern.length===1?['right','left','delayed']:pattern;
 return keys.map(key=>({...moves[key],windup:moves[key].windup*(enraged?.9:1)}));
}

const wolfMoves={
 bite:{kind:'bite',variant:'bite',name:'獠牙咬擊',windup:.46,duration:.4,recovery:.9,range:2.45,damage:18},
 rake:{kind:'bite',variant:'rake',name:'回身撕咬',windup:.58,duration:.46,recovery:1.15,range:2.7,damage:21},
 rush:{kind:'pounce',variant:'rush',name:'疾影撲殺',windup:.86,duration:.7,recovery:1.3,range:2.3,damage:25,speed:10.8,activeWindow:true,lane:8}
};
const roninMoves={
 right:{kind:'slash',variant:'slash-right',name:'斜斬',windup:.68,duration:.48,recovery:1.05,range:2.85,damage:23},
 left:{kind:'slash',variant:'slash-left',name:'回身斬',windup:.48,duration:.48,recovery:1.2,range:2.9,damage:23},
 thrust:{kind:'thrust',variant:'thrust',name:'踏步直刺',windup:.83,duration:.62,recovery:1.35,range:2.6,damage:27,speed:7.2,activeWindow:true,lane:6.8},
 rush:{kind:'thrust',variant:'thrust',name:'疾步穿心',windup:1,duration:.72,recovery:1.45,range:2.7,damage:29,speed:10.5,activeWindow:true,lane:9.5},
 wave:{kind:'projectile',variant:'sword-wave',name:'離刃劍氣',windup:.95,duration:.48,recovery:1.35,range:0,damage:22,projectile:{style:'blade',speed:10.5,radius:.42,range:18,spread:[0]},lane:18},
 cross:{kind:'projectile',variant:'sword-cross',name:'逆刃劍氣',windup:.68,duration:.48,recovery:1.5,range:0,damage:24,projectile:{style:'blade',speed:11.5,radius:.42,range:18,spread:[0]},lane:18}
};

// Range selection and finite combinations; cooldown is owned by the simulation.
export function enemySequence(id,cycle,enraged,dist,rangedReady=true){
 if(id==='oni'){
  if(dist>7&&rangedReady)return[{kind:'projectile',variant:'fissure',name:'裂地追魂',windup:1.25,duration:.65,recovery:1.65,range:0,damage:32,unblockable:true,projectile:{style:'fissure',speed:8,radius:.72,range:19,spread:enraged?[-.22,.22]:[0]},lane:19}];
  return guardianSequence(cycle,enraged,dist);
 }
 const wolf=id==='wolf',moves=wolf?wolfMoves:roninMoves;
 let keys;
 if(!wolf&&dist>6&&rangedReady&&(cycle%2===0||dist>9.5))keys=['wave','cross'];
 else if(dist>4)keys=wolf?(enraged?['rush','rake']:['rush']):['rush'];
 else keys=wolf?[['bite','rake'],['rush'],['rake','bite']][cycle%3]:[['right','left'],['left','thrust'],['right','left','thrust']][cycle%3];
 if(wolf&&enraged&&dist<=4&&keys.length===2)keys=[...keys,'rush'];
 return keys.map(key=>{const move={...moves[key],windup:moves[key].windup*(enraged?.92:1)};return move;});
}

// Roles that fight their own way. A role is a body (wolf, ronin, oni) with a different temper:
// the campaign asks here first and falls back to the body's ordinary rhythm when this returns null.
const packMoves={
 snap:{kind:'bite',variant:'bite',name:'影咬',windup:.34,duration:.34,recovery:1.5,range:2.3,damage:14},
 dart:{kind:'pounce',variant:'rush',name:'掠影',windup:.6,duration:.52,recovery:1.15,range:2.2,damage:18,speed:13,activeWindow:true,lane:8},
 howl:{kind:'projectile',variant:'howl',name:'啣名長嗥',windup:1.05,duration:.5,recovery:1.3,range:0,damage:20,projectile:{style:'howl',speed:8.5,radius:1.1,range:15,spread:[0]},lane:15},
 maul:{kind:'bite',variant:'rake',name:'裂名撕咬',windup:.62,duration:.46,recovery:1,range:2.9,damage:26},
 gore:{kind:'bite',variant:'bite',name:'獠牙咬擊',windup:.5,duration:.4,recovery:.9,range:2.7,damage:22},
 charge:{kind:'pounce',variant:'rush',name:'狼王奔襲',windup:.9,duration:.72,recovery:1.2,range:2.6,damage:30,speed:11.5,activeWindow:true,lane:9},
 crush:{kind:'pounce',variant:'rush',name:'鎮門撲壓',windup:1.25,duration:.7,recovery:1.9,range:3,damage:30,speed:8,activeWindow:true,lane:7},
 gnaw:{kind:'bite',variant:'bite',name:'石顎',windup:.8,duration:.45,recovery:1.5,range:2.8,damage:24},
 swipe:{kind:'bite',variant:'rake',name:'回身石爪',windup:.7,duration:.46,recovery:1.7,range:3,damage:26}
};
const bladeMoves={
 fan:{kind:'projectile',variant:'sword-wave',name:'抄名三筆',windup:1.05,duration:.5,recovery:1.5,range:0,damage:16,projectile:{style:'blade',speed:9,radius:.4,range:17,spread:[-.3,0,.3]},lane:17},
 quill:{kind:'projectile',variant:'sword-cross',name:'點名',windup:.7,duration:.46,recovery:1.3,range:0,damage:20,projectile:{style:'blade',speed:14,radius:.4,range:19,spread:[0]},lane:19},
 shove:{kind:'slash',variant:'slash-left',name:'拂袖',windup:.42,duration:.44,recovery:1.5,range:2.7,damage:15},
 flare:{kind:'slash',variant:'slash-right',name:'燃名斬',windup:.5,duration:.42,recovery:.55,range:2.8,damage:19},
 backflare:{kind:'slash',variant:'slash-left',name:'回燄',windup:.36,duration:.42,recovery:.6,range:2.85,damage:19},
 lunge:{kind:'thrust',variant:'thrust',name:'撲火',windup:.7,duration:.6,recovery:1.5,range:2.6,damage:24,speed:9,activeWindow:true,lane:8}
};
const masterMoves={
 fanFissure:{kind:'projectile',variant:'fissure',name:'吞名裂地',windup:1.1,duration:.65,recovery:1.5,range:0,damage:30,unblockable:true,projectile:{style:'fissure',speed:9,radius:.72,range:20,spread:[-.34,0,.34]},lane:20},
 lash:{kind:'slash',variant:'claw-left',name:'奪名',windup:.44,duration:.5,recovery:.9,range:3.4,damage:26},
 quake:{kind:'slam',variant:'slam',name:'無名震',windup:.86,recovery:1.2,range:4.4,damage:33}
};
const pick=(table,keys,enraged,quicken)=>keys.map(key=>({...table[key],windup:table[key].windup*(enraged?quicken:1)}));
export function roleSequence(pattern,cycle,enraged,dist,rangedReady=true){
 switch(pattern){
  // A starved shadow: one quick bite or a darting pass, then it slips away to circle again.
  case 'mare':return pick(packMoves,dist>3.6?['dart']:cycle%2?['snap','dart']:['snap'],enraged,.9);
  // The pack leader howls the stolen names from range, charges, and mauls in threes up close.
  case 'alpha':return pick(packMoves,dist>7&&rangedReady?['howl']:dist>4.2?(enraged?['charge','maul']:['charge']):[['maul','gore'],['gore','maul','gore'],['maul','charge']][cycle%3],enraged,.88);
  // Stone does not hurry: long tells, heavy hits, long openings.
  case 'lion':return pick(packMoves,dist>4.2?['crush']:[['gnaw'],['swipe','gnaw'],['gnaw','crush']][cycle%3],enraged,.92);
  // Registry clerks write from a distance and only shove when cornered.
  case 'scribe':return pick(bladeMoves,dist<3.2?['shove']:cycle%2?['quill','quill']:['fan'],enraged,.9);
  // Lamp-thralls burn short: fast two- and three-cut flurries with no patience for range.
  case 'thrall':return pick(bladeMoves,dist>4.5?['lunge']:[['flare','backflare'],['flare','backflare','lunge'],['backflare','flare']][cycle%3],enraged,.9);
  // Clay attendants know the master's blows but none of his reach across the yard.
  case 'acolyte':return guardianSequence(cycle,enraged,dist);
  // The thing under the robe: every chain is longer, and the ground opens three ways.
  case 'nameless':{
   if(dist>6.5&&rangedReady)return pick(masterMoves,['fanFissure'],true,.92);
   if(dist>4.5)return[...guardianSequence(cycle,true,dist),...pick(masterMoves,['lash'],true,.92)];
   const chains=[['right','left','lash'],['quake','delayed'],['lash','right','quake'],['right','left','delayed']][cycle%4];
   return chains.map(key=>({...(masterMoves[key]||moves[key]),windup:(masterMoves[key]||moves[key]).windup*.9}));
  }
  default:return null;
 }
}
