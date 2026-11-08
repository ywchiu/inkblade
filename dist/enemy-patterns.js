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
