// Original fiction inspired by Zhong Kui folklore; no dialogue is a historical quotation.
const line=(speaker,text)=>({speaker,text});
export const SCENES=Object.freeze({
 opening:{title:'借名山',chapter:'序 · 一紙無名狀',purpose:'入山尋回失蹤村民的魂名',lines:[
  line('村中老婦','判官爺，我兒進山還願，三日未歸。今早連他的名字，我也想不起來了。'),
  line('鍾馗','狀紙上只剩手印，連姓名也被抹去……你們向誰求的平安？'),
  line('村中老婦','鎮祟寺的山神。祂說，只借一個名字，便保一家平安。'),
  line('鍾馗','借名不還，便是拘魂。這張無名狀，我接了。') ]},
 wolf:{title:'狼腹有人聲',chapter:'壹 · 雨竹林',purpose:'擊散獵魂狼群，追查魂名去向',lines:[
  line('墨狼腹中的聲音','別……叫我的名字。祂會聽見。'),
  line('鍾馗','活人的聲音，怎會鎖在獸腹裡？這群狼身上，都拴著同一道役魂咒。'),
  line('鍾馗','莫怕。我斬的是拘你的咒，不是你的魂。') ]},
 wolfClear:{title:'一枚空名牌',chapter:'壹 · 咒散之後',purpose:'沿金色路標向北，尋斷橋守關人',lines:[
  line('獲救的殘魂','我只記得……沈家的姑娘。她哥哥守著斷橋，不讓我們下山。'),
  line('鍾馗','這名牌背面刻著「鎮祟寺」。獸是鎖，守橋人是門。'),
  line('鍾馗','跟在我身後。去問問那持劍的，究竟在替誰守門。') ]},
 ronin:{title:'守橋的亡魂',chapter:'貳 · 古道劍陣',purpose:'破開守橋劍陣，查明借名契',lines:[
  line('沈寒舟 · 守橋劍客','止步！山神答應過我，我與劍影守住這條路，我妹妹便能回家。'),
  line('鍾馗','狼腹裡拘著沈家姑娘的殘魂。你守的這道門，只許人進，不許魂出。'),
  line('沈寒舟 · 守橋劍客','我已守了七個寒暑……你叫我如何信你！'),
  line('鍾馗','那便看清楚。你的劍上，纏的是誰的鎖。') ]},
 roninClear:{title:'七年一場騙局',chapter:'貳 · 斷刃照魂',purpose:'前往山門，斬斷山魈的借名契',lines:[
  line('沈寒舟','這斷刃裡的名字……都是被我攔下的人？原來我早已死了，還替祂守著牢門。'),
  line('鍾馗','害你的人，還要借你的手害旁人。這筆債，該去向祂討。'),
  line('沈寒舟','祂不是山神。借名契就藏在祂身上。判官，替我把妹妹的名字帶回去。') ]},
 oni:{title:'山神無名',chapter:'參 · 鎮祟寺',purpose:'擊敗偽神，毀去借名契、釋放眾魂',lines:[
  line('鎮祟山魈','一個名字，換七年平安。是他們自己按的手印。鍾馗，你憑什麼毀我的香火？'),
  line('鍾馗','你驅狼下山，再賣平安；拘人魂魄，卻稱恩典。這香火，供的是恐懼。'),
  line('鎮祟山魈','失了姓名的孤魂，除了我，誰還肯收留？'),
  line('鍾馗','我記。今日來的每一個，都有歸處。') ]},
 ending:{title:'名字還給人間',chapter:'終 · 雨歇天明',purpose:'借名契已破 · 眾魂得歸',lines:[
  line('鎮祟山魈','契毀了……你又怎知，他們回去還有人記得？'),
  line('鍾馗','有人等，便送回家。無人等，我便替他們留名。輪不到你作主。'),
  line('沈寒舟','我想起來了。她叫沈阿蘅。勞你告訴她，哥哥不守這座橋了。'),
  line('後記','天明時，無名狀上重新浮出字跡。有人歸家，有魂入土；鎮祟寺的香火，終於熄了。') ]},
 wolfEnd:{title:'獸腹咒散',chapter:'斷章 · 墨狼',purpose:'線索已記入志怪錄',lines:[line('獲救的殘魂','名牌……在鎮祟寺。求你，別讓別人再進山。'),line('鍾馗','這一縷魂先送出林。餘下的債，沿古道去討。')]},
 roninEnd:{title:'斷刃的囑託',chapter:'斷章 · 劍客',purpose:'線索已記入志怪錄',lines:[line('沈寒舟','我的劍困住的，竟是求救的人……山魈把借名契藏在身上。求你破契。'),line('鍾馗','你且收劍。有人受騙而死，不該再因騙局不得安生。')]},
 oniEnd:{title:'偽神伏誅',chapter:'斷章 · 山魈',purpose:'借名契已毀 · 完整故事見無雙征途',lines:[line('鎮祟山魈','沒了我，誰保他們平安？'),line('鍾馗','先少了你這一害，再談人間的路。'),line('後記','借名契化為灰燼，被抹去的名字逐一浮現。若要知曉來路，請從「無雙征途」讀起。')]}
});
export const CHAPTER_SCENES=['wolf','ronin','oni'];
export const IDENTITIES=Object.freeze({wolf:{name:'墨狼',title:'受役魂咒驅使的獵魂獸'},ronin:{name:'沈寒舟',title:'誤信還魂之約的亡魂'},oni:{name:'鎮祟山魈',title:'竊名拘魂的偽山神'}});
export function identityFor(game){const base=IDENTITIES[game.spec.id];if(game.campaign&&game.spec.id==='ronin'&&game.enemy!==game.enemies.find(e=>e.kindId==='ronin'))return {name:'寒舟劍影',title:'借名契所縛的劍意'};return base;}
export const LORE=Object.freeze([
 {title:'鍾馗捉鬼',text:'借用民間傳說中鍾馗驅鬼除害、護佑人間的形象。本篇的村落、沈寒舟與借名契，均為原創，並非古籍情節。',url:'https://www.th.gov.tw/Epaper_Content/237/7467/',source:'臺灣文獻館 · 鍾馗'},
 {title:'為虎作倀',text:'「倀」原指傳說中被虎吃掉、反而替虎役使的鬼。本篇借用受害者被迫助害的母題，改寫為受騙守橋的亡魂；狼群與役魂咒是遊戲設定。',url:'https://dict.concised.moe.edu.tw/dictView.jsp?ID=32099',source:'教育部國語辭典 · 倀'}
]);
const STORAGE_KEY='inkblade.journal.v1';
export class StoryDirector{
 constructor(storage=null){this.storage=storage;this.journal=new Set();try{const saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'[]');if(Array.isArray(saved))for(const id of saved)if(Object.hasOwn(SCENES,id))this.journal.add(id);}catch{}this.seen=new Set();this.queue=[];this.current=null;this.index=0;this.barkUsed=new Set();this.nextBarkAt=0;this.campaign=false;this.opponent=0;}
 remember(id){this.journal.add(id);try{this.storage?.setItem(STORAGE_KEY,JSON.stringify([...this.journal]));}catch{}}
 start({campaign=false,opponent=0,retry=false,stage=0}={}){this.cancel();this.campaign=campaign;this.opponent=opponent;this.barkUsed.clear();this.nextBarkAt=0;if(!retry){this.seen.clear();this.queue=campaign?['opening','wolf']:[CHAPTER_SCENES[opponent]];}else if(campaign){this.seen.add(CHAPTER_SCENES[stage]);}return this.openNext();}
 open(id){if(!Object.hasOwn(SCENES,id)||this.seen.has(id))return null;this.seen.add(id);this.remember(id);this.current=id;this.index=0;return this.view();}
 openNext(){while(this.queue.length){const view=this.open(this.queue.shift());if(view)return view;}this.current=null;this.index=0;return null;}
 view(){if(!this.current)return null;const scene=SCENES[this.current];return {id:this.current,...scene,line:scene.lines[this.index],index:this.index,total:scene.lines.length};}
 advance(){if(!this.current)return null;if(++this.index<SCENES[this.current].lines.length)return this.view();return this.openNext();}
 skip(){// Skip the full encounter, while keeping every skipped page available in the journal.
  for(const id of this.queue){this.seen.add(id);this.remember(id);}this.cancel();return null;
 }
 cancel(){this.current=null;this.index=0;this.queue=[];}
 event(event,game){if(!this.campaign||this.current)return null;if(event.type==='chapter')return this.open(CHAPTER_SCENES[event.stage]);if(event.type==='gate-open')return this.open(game.stage===0?'wolfClear':'roninClear');return null;}
 finish(won){if(!won)return null;return this.open(this.campaign?'ending':['wolfEnd','roninEnd','oniEnd'][this.opponent]);}
 bark(event,game){if(this.current||game.status!=='playing'||game.time<this.nextBarkAt)return null;const actor=game.campaign?game.enemies.find(e=>e.id===event.enemyId):game.enemy;const kind=actor?.kindId||(!game.campaign?game.spec.id:null);let key,text,speaker;
  if(event.type==='enrage'&&kind==='oni'){key='oni-rage';speaker='鎮祟山魈';text='滿山的名字，都在我掌中！';}
  else if(event.type==='projectile-release'&&kind==='ronin'){key='ronin-blade';speaker='沈寒舟';text='誰也別想越過這座橋！';}
  else if(event.type==='enemy-swing'&&kind==='wolf'){key='wolf-voice';speaker='狼腹中的殘魂';text='救我……我不想再替祂引路。';}
  else if(event.type==='stagger'&&kind==='ronin'){key='ronin-doubt';speaker='沈寒舟';text='這道咒……怎會連著我的劍？';}
  else if(event.type==='parry'){key='hero-parry';speaker='鍾馗';text='看清了，這一刃是斷鎖。';}
  if(!key||this.barkUsed.has(key))return null;this.barkUsed.add(key);this.nextBarkAt=game.time+12;return {id:`bark-${key}`,speaker,text};
 }
 snapshot(){return {scene:this.current,line:this.index,total:this.current?SCENES[this.current].lines.length:0,journal:[...this.journal],seen:[...this.seen]};}
}
