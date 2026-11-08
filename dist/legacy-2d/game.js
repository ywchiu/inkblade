import { Combat, ENEMIES, clamp } from './combat.js';
const $=id=>document.getElementById(id);
const canvas=$('scene'), ctx=canvas.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let width=1280,height=660,dpr=1,background,clock=0,last=0,mode='title',game=new Combat(),campaign=true,paused=false,modalReturn=false,resultDelay=0,shake=0,messageTime=0,sound=false,audioCtx;
let particles=[],slashes=[],keys=new Set(),ambience=[];
const pointerKeys=new Map();
const colors={ink:'#27382f',paper:'#e9e4d7',red:'#a13e32'};
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function path(c,points,fill,stroke,line=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}}
function line(c,points,color,size=1){c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle=color;c.lineWidth=size;c.lineCap='round';c.lineJoin='round';c.stroke();}
function ellipse(c,x,y,rx,ry,color){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=color;c.fill();}
function branch(c,x,y,length,angle,depth,random){if(depth<=0||length<3)return;const ex=x+Math.cos(angle)*length,ey=y+Math.sin(angle)*length;line(c,[[x,y],[x+(ex-x)*.6+random()*8,y+(ey-y)*.5],[ex,ey]],'#455747',depth*1.5);if(depth<3){for(let i=0;i<9;i++)ellipse(c,ex+(random()-.5)*length*1.8,ey+(random()-.5)*length*.6,8+random()*15,2+random()*3,'#58644d55');}branch(c,ex,ey,length*.71,angle-.48,depth-1,random);branch(c,ex,ey,length*.61,angle+.58,depth-1,random);}
function bamboo(c,x,base,tall,alpha,random){c.save();c.globalAlpha=alpha;const lean=(random()-.5)*70;for(let i=0;i<7;i++){const y=base-tall*i/7;const x1=x+lean*i/7;line(c,[[x1,y],[x1+lean/7,y-tall/7+3]],'#3e5847',4+(7-i)*.4);line(c,[[x1-4,y],[x1+4,y-1]],'#2c4735',1.5);if(i>2){const side=i%2?1:-1;const ex=x1+side*(28+random()*35);line(c,[[x1,y],[ex,y-20]],'#435a43',1);for(let j=0;j<5;j++){const bx=x1+(ex-x1)*j/5,by=y-20*j/5;path(c,[[bx,by],[bx+side*26,by-17-j*2],[bx+side*15,by+3]],'#40593e');path(c,[[bx,by],[bx-side*5,by-30],[bx+side*5,by-10]],'#526746');}}}c.restore();}
function mountain(c,x,y,w,h,opacity,seed){const random=rng(seed);c.save();c.globalAlpha=opacity;const pts=[[x-w*.56,y]];for(let i=0;i<=24;i++){const t=i/24,profile=Math.pow(Math.sin(t*Math.PI),1.6);pts.push([x-w*.5+t*w,y-h*profile*(.82+random()*.2)]);}pts.push([x+w*.6,y]);const g=c.createLinearGradient(0,y-h,0,y);g.addColorStop(0,'#57685a');g.addColorStop(.5,'#728274');g.addColorStop(1,'#c0c6b4');path(c,pts,g);for(let i=0;i<15;i++){const j=3+Math.floor(random()*18),p=pts[j];line(c,[p,[p[0]-random()*30,p[1]+h*.3],[p[0]-40-random()*40,y]],'#344a3a27',.5+random()*3);}c.restore();}
function makeBackground(){
  background=document.createElement('canvas');background.width=Math.ceil(width*dpr);background.height=Math.ceil(height*dpr);const c=background.getContext('2d');c.scale(dpr,dpr);const random=rng(2426+game.index*89);const floor=height*.815;
  const sky=c.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#e9e5d9');sky.addColorStop(.6,'#e3e5d7');sky.addColorStop(1,'#d1d6c3');c.fillStyle=sky;c.fillRect(0,0,width,height);
  const sunX=width*.76,sunY=height*.22;ellipse(c,sunX,sunY,Math.min(64,width*.055),Math.min(64,width*.055),'#b5684f2c');ellipse(c,sunX-3,sunY-2,Math.min(61,width*.052),Math.min(61,width*.052),'#bf7d5d13');
  for(let layer=0;layer<3;layer++){for(let i=0;i<10;i++)mountain(c,width*(i/8-.05),height*(.52+layer*.12),width*(.21+random()*.23),height*(.16+random()*.17),.11+layer*.07,60+i*7+layer*52);const fog=c.createLinearGradient(0,height*(.47+layer*.12),0,height*(.61+layer*.12));fog.addColorStop(0,'#e5e6da00');fog.addColorStop(1,'#e5e6dae0');c.fillStyle=fog;c.fillRect(0,height*(.47+layer*.12),width,height*.18);}
  // Misted temple, small enough to belong to the landscape.
  c.save();c.globalAlpha=.25;c.translate(width*.62,height*.52);const ts=Math.max(.35,width/1450);c.scale(ts,ts);path(c,[[-50,20],[50,20],[44,-24],[-43,-24]],'#71816a');path(c,[[-70,-23],[-36,-37],[0,-62],[38,-38],[76,-24],[40,-18],[-40,-18]],'#4e6551');line(c,[[-65,-23],[-30,-26],[0,-46],[32,-26],[70,-23]],'#3d5941',3);for(let x=-30;x<=30;x+=20)line(c,[[x,-18],[x,18]],'#dce0ce',4);c.restore();
  if(game.index===1&&mode==='playing'){
    for(const side of [.1,.9]){const x=width*side;path(c,[[x-12,floor],[x+12,floor],[x+10,height*.3],[x-10,height*.3]],'#6d7b6444');line(c,[[x-50,height*.29],[x+50,height*.29]],'#5d6b5355',9);path(c,[[x-66,height*.28],[x,height*.23],[x+66,height*.28]],'#58694c66');}
  }
  const ground=c.createLinearGradient(0,floor-20,0,height);ground.addColorStop(0,'#b6c2a42a');ground.addColorStop(.2,'#a5b29866');ground.addColorStop(1,'#d8dccb');path(c,[[0,floor+8],[width*.18,floor-12],[width*.4,floor+8],[width*.64,floor-8],[width,floor+3],[width,height],[0,height]],ground);
  for(let i=0;i<190;i++){const x=random()*width,y=floor+random()*90;line(c,[[x,y],[x+10+random()*50,y+random()*3]],'#788a6b'+(i%3?'19':'32'),random()*2);}
  for(let i=0;i<20;i++){const x=random()*width;ellipse(c,x,floor+random()*40,random()*23+4,random()*4+1,'#7a886b22');}
  for(let i=0;i<15;i++)bamboo(c,width*(.82+random()*.22),floor-5,height*(.34+random()*.55),.09+random()*.2,random);
  if(width>650){for(let i=0;i<6;i++)bamboo(c,width*(random()*.1-.04),floor+20,height*(.4+random()*.45),.08+random()*.16,random);}
  c.save();c.globalAlpha=.66;branch(c,width+25,40,width*.14,-2.85,5,random);c.restore();
  // Dry-brush rocks and a few sharp reeds anchor the foreground.
  for(let i=0;i<7;i++){const x=width*(.72+random()*.31),y=floor+45+random()*30;path(c,[[x-30,y],[x-12,y-18],[x+10,y-22],[x+34,y-4],[x+20,y+4]],'#6579582b');}
  for(let i=0;i<55;i++){const x=random()*width,y=floor+70+random()*60;line(c,[[x,y],[x+(random()-.5)*18,y-8-random()*20]],'#647c4e35',.7);}
  if(mode==='title'){const wash=c.createLinearGradient(0,0,width*.72,0);wash.addColorStop(0,'#e9e5d9f8');wash.addColorStop(.5,'#e9e5d9e0');wash.addColorStop(1,'#e9e5d900');c.fillStyle=wash;c.fillRect(0,0,width,height);}
  ambience=Array.from({length:18},()=>({x:random()*width,y:random()*height*.8,s:1+random()*3,v:8+random()*17,p:random()*6.28}));
}
function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);makeBackground();}
new ResizeObserver(resize).observe(canvas);
const floorY=()=>height*.815;
const scale=()=>Math.max(.48,Math.min(1.22,width/1160));
const screenX=x=>x/1280*width;
function drawHuman(c,actor,isEnemy=false,title=false){
  const s=scale()*(title?1.24:1),x=title?width*(width<650?.74:.705):screenX(actor.x),y=floorY()-actor.y*s;
  const movement=title?0:Math.abs((actor===game.player?((keys.has('d')?1:0)-(keys.has('a')?1:0)):actor.recover<=0&&actor.windup<=0)?1:0);
  const t=clock*9,bob=Math.sin(clock*2.1)*1.7;const attack=actor.attack>0;const swing=attack?Math.sin((1-actor.attack/actor.attackTotal)*Math.PI):0;
  c.save();c.translate(x,y);c.scale(s*(title?-1:actor.face),s);
  ellipse(c,0,5,52,8,'#1e352226');
  if(actor.dead){c.rotate(-1.25);c.translate(-40,45);c.globalAlpha=.65;}
  if(actor.flash>0)c.globalAlpha=.52+Math.sin(clock*80)*.25;
  if(actor.invuln>0&&actor.dodge>0){c.globalAlpha=.65;c.rotate(.25);}
  const leg=Math.sin(t)*movement*14;
  line(c,[[-9,-55],[-17-leg,-25],[-24-leg,0]],'#263d30',13);line(c,[[12,-52],[19+leg,-23],[21+leg,0]],isEnemy?'#28332e':'#3a4b3e',12);
  line(c,[[-24-leg,-1],[-34-leg,1]],'#23372c',7);line(c,[[20+leg,-1],[31+leg,1]],'#23372c',7);
  // Robe silhouette and drifting fabric strips.
  const flutter=Math.sin(clock*3.4)*7;
  path(c,[[-19,-120+bob],[-30,-92],[-41-flutter,-39],[-8,-51],[8,-40],[32,-48],[23,-102],[10,-122+bob]],isEnemy?'#39463c':'#dadcc9','#334b39',1.2);
  path(c,[[-18,-118],[-31,-96],[-37-flutter,-48],[-14,-61],[-2,-111]],isEnemy?'#26362e':'#acb7a1');
  path(c,[[4,-116],[21,-104],[29,-51],[16,-48],[3,-83]],isEnemy?'#52604e':'#eff0df');
  line(c,[[-10,-104],[-13,-74],[-24,-52]],'#52674b66',2);line(c,[[7,-107],[11,-78],[20,-55]],'#65765488',1.4);
  path(c,[[-23,-81],[24,-82],[25,-74],[-24,-72]],isEnemy?'#31382c':'#7d3c30');
  path(c,[[-19,-79],[-41,-69+flutter],[-58,-88+flutter],[-43,-75+flutter],[-23,-70]],'#984637');
  // Neck, face and a wind-tossed scarf.
  ellipse(c,0,-131+bob,10,15,isEnemy?'#d8d6bf':'#a7aa8e');
  path(c,[[-9,-130],[10,-130],[10,-118],[-8,-119]],isEnemy?'#dbdbc5':'#384b3a');
  line(c,[[0,-138],[7,-136]],'#283a2a',1.5);
  if(isEnemy){line(c,[[-5,-133],[0,-131],[5,-134]],'#963c30',2);path(c,[[-17,-145],[0,-159],[18,-145],[10,-135],[-10,-135]],'#263c31');}
  else{
    path(c,[[-43,-141+bob],[1,-164+bob],[44,-143+bob],[18,-136+bob],[-28,-136+bob]],'#4a5940','#293f2e',1.5);
    path(c,[[-35,-142+bob],[0,-160+bob],[33,-143+bob],[6,-145+bob]],'#8e9474');
    for(let i=-26;i<30;i+=8)line(c,[[1,-160+bob],[i,-140+bob]],'#394f3477',.8);
    line(c,[[-42,-140+bob],[0,-137+bob],[43,-142+bob]],'#253a2a',2);
  }
  // Back hand and scabbard.
  line(c,[[-20,-107],[-30,-87],[-23,-73]],isEnemy?'#344636':'#bdc5ac',12);
  line(c,[[-20,-77],[-42,-34]],'#293d2d',5);
  const armX=actor.guard?25:attack?30+swing*40:24;
  const armY=actor.guard?-111:attack?-100+swing*32:-88;
  line(c,[[17,-109],[28,-97],[armX,armY]],isEnemy?'#4b5a47':'#d9dfc8',12);
  ellipse(c,armX,armY,4,5,'#9ea68a');
  c.save();c.translate(armX,armY);const rotation=actor.guard?-1.9:attack?-1.7+swing*2.4:.65;c.rotate(rotation);
  line(c,[[0,10],[0,-10]],'#3c442f',5);line(c,[[-7,-9],[7,-9]],'#766e47',3);
  path(c,[[-2,-12],[-1,-88],[3,-102],[4,-26],[2,-12]],'#e8eddb','#5a6d56',.8);line(c,[[2,-18],[2,-90]],'#ffffff88',1);
  c.restore();
  if(actor.guard){c.beginPath();c.arc(0,-83,57,-1.2,1.1);c.strokeStyle=actor.guardTime<.22?'#ad5540':'#657e6077';c.lineWidth=actor.guardTime<.22?3:1;c.stroke();}
  c.restore();
}
function drawWolf(c,e){const s=scale()*1.03;const running=e.recover<=0&&e.windup<=0;const t=clock*10;const crouch=e.windup>0?10:0;c.save();c.translate(screenX(e.x),floorY()-e.y*s);c.scale(e.face*s,s);ellipse(c,0,3,69,9,'#243b262d');if(e.dead){c.rotate(.15);c.scale(1,.45);c.globalAlpha=.6;}if(e.flash>0)c.globalAlpha=.6;
  const body='#2e4035',edge='#53634c';
  // Tail breaks into dry ink shards.
  path(c,[[-43,-63],[-88,-71],[-124,-106],[-114,-70],[-95,-44],[-48,-40]],body);
  path(c,[[-60,-53],[-95,-64],[-122,-92],[-108,-56],[-75,-39]],'#4b5d45');
  for(let i=0;i<4;i++){const lx=i<2?-35:35,dx=running?Math.sin(t+i*Math.PI)*15:0;line(c,[[lx,-51+crouch],[lx-10+dx,-26],[lx+dx+4,-2]],i%2?body:edge,9);path(c,[[lx+dx-1,-6],[lx+dx+16,-4],[lx+dx+19,0],[lx+dx-3,0]],body);}
  path(c,[[-58,-49+crouch],[-47,-75+crouch],[-23,-83+crouch],[11,-77+crouch],[34,-96+crouch],[49,-91+crouch],[67,-69+crouch],[53,-34+crouch],[24,-41+crouch],[-12,-40+crouch]],body,edge,1);
  path(c,[[19,-79+crouch],[35,-113+crouch],[43,-92+crouch],[63,-106+crouch],[62,-84+crouch],[85,-68+crouch],[68,-54+crouch],[44,-60+crouch],[36,-43+crouch]],'#314438');
  path(c,[[36,-83+crouch],[52,-72+crouch],[75,-68+crouch],[57,-59+crouch],[45,-64+crouch]],'#68735a');
  line(c,[[57,-76+crouch],[67,-77+crouch]],'#c34b35',2.6);path(c,[[76,-67+crouch],[86,-65+crouch],[79,-60+crouch]],'#172b21');
  for(let i=0;i<8;i++)line(c,[[-38+i*10,-68+crouch],[-47+i*10,-53+crouch]],'#91a07a22',1);
  c.restore();}
function drawGolem(c,e){const s=scale()*1.3;c.save();c.translate(screenX(e.x),floorY());c.scale(e.face*s,s);ellipse(c,0,4,74,10,'#263c2c33');if(e.dead){c.scale(1,.5);c.globalAlpha=.6;}if(e.flash>0)c.globalAlpha=.6;const heave=e.windup>0?Math.sin((1-e.windup/game.spec.windup)*Math.PI)*23:Math.sin(clock*1.9)*2;
  path(c,[[-40,-65],[-10,-64],[-14,-5],[-48,-2],[-52,-14]],'#485946','#263e2c',2);path(c,[[14,-66],[43,-66],[55,-4],[20,-2]],'#56624b','#263e2c',2);
  path(c,[[-45,-146],[-20,-168],[25,-159],[49,-133],[44,-59],[17,-48],[-34,-63],[-57,-107]],'#53624c','#324b35',2);
  path(c,[[-42,-139],[-15,-150],[-4,-105],[-26,-68],[-44,-87]],'#758068');path(c,[[1,-149],[30,-143],[40,-100],[26,-65],[0,-96]],'#374c37');
  for(const side of [-1,1]){path(c,[[side*40,-137-heave],[side*68,-121-heave],[side*76,-66-heave],[side*52,-56-heave],[side*43,-91-heave]],side===1?'#52654c':'#66735a','#344b34',2);path(c,[[side*59,-79-heave],[side*82,-70-heave],[side*80,-49-heave],[side*55,-51-heave]],'#3b513b');}
  path(c,[[-23,-174],[-11,-195],[16,-193],[30,-174],[20,-145],[-14,-148]],'#b4b59a','#354b35',2);path(c,[[-22,-175],[-34,-202],[-12,-187]],'#536447');path(c,[[14,-188],[35,-208],[28,-174]],'#4a603f');
  line(c,[[-12,-174],[-4,-171]],'#a34532',3);line(c,[[8,-171],[18,-176]],'#a34532',3);path(c,[[-4,-164],[12,-165],[8,-152]],'#415139');
  line(c,[[-12,-143],[2,-122],[-6,-108],[5,-89]],'#a85b3d',2);line(c,[[1,-122],[20,-125],[27,-140]],'#a85b3d',1.5);
  // Moss tufts dissolve the stone edges.
  for(let i=0;i<7;i++)ellipse(c,-39+i*4,-143+(i%3)*4,8,3,'#7a8756');c.restore();}
function drawTelegraph(){const e=game.enemy;if(e.windup<=0)return;const x=screenX(e.x),s=scale(),progress=1-e.windup/game.spec.windup;ctx.save();ctx.globalAlpha=.3+progress*.6;ctx.strokeStyle=colors.red;ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,floorY()+2,(e.attackKind==='quake'?170:90)*s,13*s,0,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x,floorY()-110*s,32*s,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();ctx.font=`${18*s}px serif`;ctx.textAlign='center';ctx.fillStyle=colors.red;ctx.fillText(e.attackKind==='quake'?'震':'危',x,floorY()-104*s);ctx.restore();}
function addParticles(x,y,color,count=15){for(let i=0;i<count;i++)particles.push({x:screenX(x),y:floorY()-y*scale(),vx:(Math.random()-.5)*280,vy:(Math.random()-.7)*240,r:1+Math.random()*5,life:.35+Math.random()*.5,max:.85,color});}
function slash(x,face,large=false,enemy=false){slashes.push({x:screenX(x),y:floorY()-game.player.y*scale()-75*scale(),face,life:large?.65:.28,max:large?.65:.28,large,enemy});}
function render(dt){
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.save();
  if(shake>0&&!reduced){ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake*.6);shake=Math.max(0,shake-50*dt);}
  if(background)ctx.drawImage(background,0,0,width,height);
  // A thin, drifting ink mist crosses the foot of the mountains.
  ctx.save();ctx.globalAlpha=.16;for(let i=0;i<4;i++){const gx=((clock*7+i*width*.3)%(width+250))-120;const g=ctx.createRadialGradient(gx,height*.64,0,gx,height*.64,190);g.addColorStop(0,'#f6f3e6');g.addColorStop(1,'#f6f3e600');ctx.fillStyle=g;ctx.fillRect(gx-190,height*.44,380,height*.4);}ctx.restore();
  // Distant birds, rendered as quick brush gestures.
  for(let i=0;i<4;i++){const x=width*.53+i*22+Math.sin(clock*.3+i)*9,y=height*.23+Math.sin(i*2)*13;line(ctx,[[x-4,y-1],[x,y+Math.sin(clock*3+i)*2],[x+5,y-2]],'#53664c66',.8);}
  if(mode==='title'){drawHuman(ctx,{x:900,y:0,face:-1},false,true);}
  else{
    drawTelegraph();
    for(const wave of game.waves){ctx.save();ctx.globalAlpha=wave.life;const x=screenX(wave.x);ctx.strokeStyle='#9b4c35';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(x,floorY(),wave.r/1280*width,10,0,0,Math.PI*2);ctx.stroke();for(const sign of [-1,1]){const ex=x+sign*wave.r/1280*width;line(ctx,[[ex-12,floorY()],[ex,floorY()-23],[ex+11,floorY()]],'#8e563c88',2);}ctx.restore();}
    if(game.spec.type==='wolf')drawWolf(ctx,game.enemy);else if(game.spec.type==='golem')drawGolem(ctx,game.enemy);else drawHuman(ctx,game.enemy,true);
    drawHuman(ctx,game.player);
  }
  for(const a of slashes){a.life-=dt;const progress=1-a.life/a.max,s=scale();ctx.save();ctx.translate(a.x,a.y);ctx.scale(a.face,1);ctx.rotate(-.3+progress*.9);ctx.globalAlpha=Math.max(0,a.life/a.max);const r=(a.large?180:93)*s;ctx.strokeStyle=a.enemy?'#a34b35':a.large?'#a14732':'#354e37';ctx.lineWidth=(a.large?16:10)*s;ctx.beginPath();ctx.ellipse(25*s,0,r,r*.7,0,-1.7,1.3);ctx.stroke();ctx.strokeStyle='#eef1df';ctx.lineWidth=3*s;ctx.beginPath();ctx.ellipse(28*s,-1,r+5,r*.7+3,0,-1.65,1.2);ctx.stroke();for(let j=0;j<3;j++){ctx.strokeStyle='#2a42352f';ctx.lineWidth=(j+1)*s;ctx.beginPath();ctx.ellipse(20*s,0,r+j*7,r*.7+j*5,0,-1.55,1.2);ctx.stroke();}ctx.restore();}
  slashes=slashes.filter(a=>a.life>0);
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=360*dt;ctx.globalAlpha=Math.max(0,p.life/p.max);ellipse(ctx,p.x,p.y,p.r,p.r*.6,p.color);}ctx.globalAlpha=1;particles=particles.filter(p=>p.life>0);
  for(const p of ambience){if(!reduced){p.x-=p.v*dt;p.y+=Math.sin(clock+p.p)*dt*3;if(p.x<0)p.x=width;}ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(clock+p.p));ellipse(ctx,0,0,p.s*2,p.s*.6,'#6b7a503d');ctx.restore();}
  ctx.restore();
}
function tone(freq,duration=.1,type='sine',gain=.06){if(!sound)return;try{audioCtx||=new AudioContext();if(audioCtx.state==='suspended')audioCtx.resume();const osc=audioCtx.createOscillator(),vol=audioCtx.createGain();osc.type=type;osc.frequency.setValueAtTime(freq,audioCtx.currentTime);osc.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.35),audioCtx.currentTime+duration);vol.gain.setValueAtTime(gain,audioCtx.currentTime);vol.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);osc.connect(vol).connect(audioCtx.destination);osc.start();osc.stop(audioCtx.currentTime+duration);}catch{sound=false;updateSound();}}
function announce(text,time=1.2){$('combat-message').textContent=text;messageTime=time;$('combat-message').style.opacity='1';}
function processEvents(){for(const e of game.drainEvents()){
  if(e.type==='slash'){slash(e.x,game.player.face);tone(370+e.chain*80,.12,'triangle');}
  if(e.type==='enemy-slash'){slash(e.x,game.enemy.face,false,true);tone(180,.1,'triangle',.03);}
  if(['hit','hurt','ultimate-hit','parry'].includes(e.type)){addParticles(e.x,e.y,e.type==='hurt'?'#9d4936':'#263d2e',e.type==='ultimate-hit'?38:18);shake=e.type==='ultimate-hit'?15:e.type==='parry'?10:5;tone(e.type==='parry'?1000:90,.13,e.type==='parry'?'sine':'triangle',.08);}
  if(e.type==='parry')announce('破 · 招',.9);
  if(e.type==='evade')announce('掠 · 影',.7);
  if(e.type==='block'){addParticles(e.x,e.y,'#a08e5d',7);tone(520,.1,'triangle');}
  if(e.type==='ultimate'){slash(e.x,game.player.face,true);announce('墨 破 山 河',1);tone(70,.7,'sawtooth',.035);}
  if(e.type==='quake'){addParticles(e.x,5,'#6e7853',35);shake=8;tone(50,.3,'triangle',.1);}
  if(e.type==='dodge'){addParticles(e.x,45,'#526244',8);tone(240,.09,'sine',.025);}
  if(e.type==='land')addParticles(e.x,0,'#7e8763',5);
  if(e.type==='victory'||e.type==='defeat'){resultDelay=1.2;keys.clear();announce(e.type==='victory'?'勝 負 已 分':'墨 盡 · 再 起',1.2);tone(e.type==='victory'?520:90,.55,'sine');}
}}
function updateHud(){const p=game.player,e=game.enemy;$('player-hp').textContent=p.hp;$('enemy-hp').textContent=e.hp;$('player-health').style.width=`${p.hp/p.maxHp*100}%`;$('enemy-health').style.width=`${e.hp/e.maxHp*100}%`;$('qi-fill').style.width=`${p.qi}%`;$('qi-text').textContent=p.qi>=100?'已滿 · 按 I 施放':`${p.qi} / 100`;$('enemy-intent').textContent=e.stun>.25?'破綻已現 · 趁勢進攻':e.windup>0?(e.attackKind==='quake'?'震地將至 · 跳躍閃避':'蓄勢出招 · 留意紅圈'):e.recover>.2?'收招空檔 · 可以反擊':'保持距離，觀察起手';$('combo').hidden=p.combo<2;$('combo').querySelector('b').textContent=p.combo;}
function begin(index=0,isCampaign=true){game=new Combat(index);campaign=isCampaign;mode='playing';paused=false;resultDelay=0;keys.clear();particles=[];slashes=[];$('overlay').hidden=true;$('title-screen').hidden=true;$('hud').hidden=false;document.querySelector('.game-shell').classList.add('in-game');$('touch-controls').hidden=!(matchMedia('(pointer:coarse)').matches||width<700);$('enemy-name').textContent=game.spec.name;$('enemy-subtitle').textContent=game.spec.subtitle;$('round-count').textContent=['壹','貳','參'][index];$('round-label').textContent=game.spec.chapter;makeBackground();updateHud();announce(`${game.spec.name} · 請賜教`,1.5);canvas.focus({preventScroll:true});}
function home(){mode='title';paused=false;keys.clear();$('overlay').hidden=true;$('title-screen').hidden=false;$('hud').hidden=true;$('touch-controls').hidden=true;$('combo').hidden=true;$('combat-message').textContent='';document.querySelector('.game-shell').classList.remove('in-game');game=new Combat();makeBackground();$('start').focus({preventScroll:true});}
function modal(title,kicker,body,actions,close=true){modalReturn=mode==='playing'&&game.status==='playing';paused=mode==='playing';keys.clear();$('overlay-title').textContent=title;$('overlay-kicker').textContent=kicker;$('overlay-body').innerHTML=body;$('overlay-actions').replaceChildren();for(const a of actions){const b=document.createElement('button');b.textContent=a.text;b.className=a.primary?'primary-button':'secondary-button';b.addEventListener('click',a.action);$('overlay-actions').append(b);}$('close-overlay').hidden=!close;$('overlay').hidden=false;($('overlay-actions').querySelector('button')||$('close-overlay')).focus({preventScroll:true});}
function closeModal(){if($('close-overlay').hidden)return;$('overlay').hidden=true;if(modalReturn){paused=false;canvas.focus({preventScroll:true});}else if(mode==='title')$('start').focus({preventScroll:true});else if(game.status!=='playing')results();}
const controls=`<div class="controls-grid"><div class="control"><kbd>A / D</kbd><span>左右移動</span></div><div class="control"><kbd>空白鍵</kbd><span>跳躍 / 躲避震地</span></div><div class="control"><kbd>J</kbd><span>揮刀 · 長按三段連擊</span></div><div class="control"><kbd>K</kbd><span>格擋 · 瞬間按下彈反</span></div><div class="control"><kbd>L / ⇧</kbd><span>向面朝方向閃避</span></div><div class="control"><kbd>I</kbd><span>墨氣滿時施放絕技</span></div></div>`;
function showHelp(){modal('招式譜','THE ART OF INK',controls+'<p>攻擊與彈反可積蓄墨氣。紅圈是敵人的出招預警。<br>格擋須面向敵人；出招時無法立刻閃避。<br>Esc 暫停 · R 在結算畫面重新挑戰</p>',[{text:'明白了，入畫',primary:true,action:closeModal}]);}
function choose(){modal('擇一而戰','CHOOSE YOUR OPPONENT','<p>自由切磋不必從第一卷開始，每場生命重新恢復。</p><div class="select-opponents">'+ENEMIES.map((e,i)=>`<button data-select="${i}"><span>${e.name}</span><small>${e.place} · ${e.hp} 生命 →</small></button>`).join('')+'</div>',[]);document.querySelectorAll('[data-select]').forEach(b=>b.addEventListener('click',()=>begin(Number(b.dataset.select),false)));}
function pause(){if(mode!=='playing'||game.status!=='playing')return;if(!$('overlay').hidden){closeModal();return;}modal('暫歇筆鋒','A MOMENT OF STILLNESS','<p>風未停，江湖仍在等你。</p>',[{text:'繼續對戰',primary:true,action:closeModal},{text:'重試本卷',action:()=>begin(game.index,campaign)},{text:'回到卷首',action:home}]);}
function results(){const won=game.status==='won',final=campaign&&game.index===2;const actions=[];if(won&&campaign&&!final)actions.push({text:`展開第${['貳','參'][game.index]}卷 →`,primary:true,action:()=>begin(game.index+1,true)});else actions.push({text:won?'再戰一回':'重新挑戰',primary:true,action:()=>begin(game.index,campaign)});actions.push({text:'自由切磋',action:choose},{text:'回到卷首',action:home});modal(won?(final?'山海皆入畫':'此卷，已破'):'勝敗皆一筆',won?'VICTORY':'TRY AGAIN',`<p>${won?(final?'你已越過竹林、古寺與山門，完成三卷試煉。':`你已擊敗${game.spec.name}。下一卷將恢復全部生命。`):game.spec.hint}</p><div class="result-stat"><div><b>${Math.ceil(game.time)}<small>s</small></b><span>交鋒時間</span></div><div><b>${game.stats.maxCombo}</b><span>最高連擊</span></div><div><b>${game.stats.parries}</b><span>成功彈反</span></div></div>`,actions,false);}
function updateSound(){$('sound').querySelector('span').textContent=sound?'開':'關';$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'關閉音效':'開啟音效');}
$('start').addEventListener('click',()=>begin());$('practice').addEventListener('click',choose);$('help').addEventListener('click',showHelp);$('pause').addEventListener('click',pause);$('close-overlay').addEventListener('click',closeModal);$('sound').addEventListener('click',()=>{sound=!sound;updateSound();tone(550,.2);});document.querySelectorAll('[data-enemy]').forEach(b=>b.addEventListener('click',()=>{begin(Number(b.dataset.enemy),false);document.querySelector('.game-shell').scrollIntoView({block:'start',behavior:reduced?'auto':'smooth'});}));
const normalize=key=>({'ArrowLeft':'a','ArrowRight':'d','ArrowUp':' ','Shift':'l'}[key]||key.toLowerCase());
function down(key){keys.add(key);if(mode!=='playing'||paused)return;if(key===' ')game.action('jump');if(key==='l')game.action('dodge');if(key==='i')game.action('ultimate');if(key==='j')game.action('attack');}
window.addEventListener('keydown',e=>{if(e.key==='Tab'&&!$('overlay').hidden){const focusable=[...$('overlay').querySelectorAll('button:not([hidden])')];if(focusable.length){const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}if(e.key==='Escape'){if(!$('overlay').hidden&&game.status==='playing')closeModal();else pause();return;}if(e.key.toLowerCase()==='r'&&mode==='playing'&&game.status!=='playing'){begin(game.index,campaign);return;}const key=normalize(e.key);if(mode==='playing'&&!paused&&['a','d','j','k','l','i',' '].includes(key)){e.preventDefault();if(!e.repeat)down(key);}});
window.addEventListener('keyup',e=>keys.delete(normalize(e.key)));
function suspend(){keys.clear();pointerKeys.clear();if(mode==='playing'&&!paused&&game.status==='playing')pause();}
window.addEventListener('blur',suspend);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
for(const b of document.querySelectorAll('[data-key]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);pointerKeys.set(e.pointerId,b.dataset.key);down(b.dataset.key);});const release=e=>{const key=pointerKeys.get(e.pointerId);pointerKeys.delete(e.pointerId);if(![...pointerKeys.values()].includes(key))keys.delete(key);};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);}
function loop(t){const dt=Math.min((t-last)/1000||0,.04);last=t;if(!paused){clock+=dt;if(mode==='playing'){game.update(dt,{left:keys.has('a'),right:keys.has('d'),attack:keys.has('j'),guard:keys.has('k')});processEvents();updateHud();if(resultDelay>0){resultDelay-=dt;if(resultDelay<=0)results();}}if(messageTime>0){messageTime-=dt;if(messageTime<=0)$('combat-message').style.opacity='0';}}render(paused?0:dt);requestAnimationFrame(loop);}
Object.defineProperty(window,'inkblade',{value:Object.freeze({snapshot:()=>({mode,paused,status:game.status,index:game.index,time:game.time,player:{...game.player},enemy:{...game.enemy},stats:{...game.stats}})})});
resize();requestAnimationFrame(loop);
