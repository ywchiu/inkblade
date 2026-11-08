import { CHAPTERS } from './campaign3d.js';
export function drawBattleMap(canvas,game){const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;ctx.clearRect(0,0,w,h);const x=v=>w/2+v*4.4,z=v=>22+(v+10)/70*(h-44);
 ctx.fillStyle='#121e26';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#7f8b7844';ctx.lineWidth=1;ctx.fillStyle='#48534a';ctx.fillRect(x(-10.5),z(-10),x(10.5)-x(-10.5),z(60)-z(-10));
 for(let i=0;i<3;i++){const c=CHAPTERS[i];ctx.fillStyle=i<game.stage?'#6c78594d':i===game.stage?'#ad864f42':'#222d33';ctx.fillRect(x(-10),z(c.center-10),88,z(c.center+10)-z(c.center-10));ctx.fillStyle=i<game.stage?'#b4bd8d':i===game.stage?'#f1ce88':'#899493';ctx.font='12px serif';ctx.textAlign='left';ctx.fillText(['山門','劍陣','竹林'][2-i],5,z(c.center)+4);if(i<2){ctx.strokeStyle=i<game.stage||i===game.stage&&game.cleared?'#dec38c':'#bb694b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x(-10),z(c.gate));ctx.lineTo(x(10),z(c.gate));ctx.stroke();}}
 for(const e of game.enemies){if(e.hp<=0)continue;ctx.fillStyle=e===game.enemy?'#ffdf91':'#e98665';ctx.beginPath();ctx.arc(x(e.x),z(e.z),e.kindId==='oni'?5:3,0,Math.PI*2);ctx.fill();}
 const p=game.player;ctx.save();ctx.translate(x(p.x),z(p.z));ctx.rotate(-p.yaw);ctx.fillStyle='#c5e9eb';ctx.beginPath();ctx.moveTo(0,6);ctx.lineTo(-4,-4);ctx.lineTo(4,-4);ctx.closePath();ctx.fill();ctx.restore();
 if(game.cleared&&game.stage<2){ctx.strokeStyle='#ffe3a0';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x(0),z(CHAPTERS[game.stage].gate),6,0,Math.PI*2);ctx.stroke();}
}
