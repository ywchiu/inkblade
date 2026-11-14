// Original fiction inspired by Zhong Kui folklore; no dialogue is a historical quotation.
import {STAGES} from './journey3d.js';
const line=(speaker,text)=>({speaker,text});
export const SCENES=Object.freeze({
 opening:{title:'借名山',chapter:'序 · 一紙無名狀',purpose:'接下無名狀 · 先看看這座村子',lines:[
  line('村中老婦','判官爺，我兒子上山還願，三天了還沒回來。今天早上，我連他叫什麼名字都想不起來了。'),
  line('鍾馗','狀紙上只剩一個手印，連名字都被抹掉了……你們是向誰求的平安？'),
  line('村中老婦','鎮祟寺的山神。祂說只要借一個名字，就保我們全家平安。'),
  line('鍾馗','借了名字不還，就是把人的魂扣住。這張無名狀，我接了。') ]},
 wolf:{title:'狼腹有人聲',chapter:'壹 · 雨竹林',purpose:'擊散獵魂狼群，追查魂名去向',lines:[
  line('墨狼腹中的聲音','不要……不要叫我的名字。祂會聽見的。'),
  line('鍾馗','活人的聲音，怎麼會關在野獸肚子裡？這群狼身上，綁的都是同一道役魂咒。'),
  line('鍾馗','別怕。我砍的是綁住你的咒，不是你的魂。') ]},
 wolfClear:{title:'一枚空名牌',chapter:'壹 · 咒散之後',purpose:'林深處還有一頭領狼 · 先斷牠的鏈',lines:[
  line('獲救的殘魂','我只記得……沈家的姑娘。她哥哥守在斷橋上，不讓我們下山。'),
  line('鍾馗','這塊名牌背面刻著「鎮祟寺」。狼是鎖，守橋的人是門。'),
  line('鍾馗','跟在我後面。我們去問問那個拿劍的，他到底在替誰看門。') ]},
 ronin:{title:'守橋的亡魂',chapter:'肆 · 斷魂橋',purpose:'過橋 · 擊敗守橋劍客沈寒舟',lines:[
  line('沈寒舟 · 守橋劍客','站住！山神答應過我，只要我和我的劍影守住這條路，我妹妹就能回家。'),
  line('鍾馗','沈家姑娘的魂，就關在那些狼的肚子裡。你守的這道門，只讓人進去，不讓魂出來。'),
  line('沈寒舟 · 守橋劍客','我已經守了七年……你要我怎麼相信你！'),
  line('鍾馗','那你就看清楚，纏在你劍上的，到底是誰的鎖。') ]},
 roninClear:{title:'七年一場騙局',chapter:'肆 · 斷刃照魂',purpose:'沿香道上山 · 燈火裡有人聲',lines:[
  line('沈寒舟','這把斷劍裡的名字……都是被我攔下來的人？原來我早就死了，還在替祂看守牢門。'),
  line('鍾馗','祂害了你，還要借你的手去害別人。這筆債，該去找祂算。'),
  line('沈寒舟','祂根本不是山神。借名契就藏在祂身上。判官，幫我把妹妹的名字帶回去。') ]},
 oni:{title:'山神無名',chapter:'捌 · 鎮祟寺',purpose:'擊敗偽神，毀去借名契',lines:[
  line('鎮祟山魈','一個名字，換七年平安。手印是他們自己按的。鍾馗，你憑什麼來斷我的香火？'),
  line('鍾馗','你先放狼下山嚇人，再來賣平安；把人的魂扣住，還說是恩典。這香火拜的不是神，是害怕。'),
  line('鎮祟山魈','沒了名字的孤魂，除了我，還有誰肯收留？'),
  line('鍾馗','我記得他們。今天來到這裡的每一個，我都會送回去。') ]},
 ending:{title:'名字還給人間',chapter:'終 · 雨歇天明',purpose:'借名契已破 · 眾魂得歸',lines:[
  line('鎮祟山魈','契約毀了……可是你怎麼知道，他們回去以後還有人記得？'),
  line('鍾馗','有人等的，我送他回家。沒人等的，我替他把名字留下來。這些事輪不到你決定。'),
  line('沈寒舟','我想起來了。她叫沈阿蘅。麻煩你告訴她，哥哥不守這座橋了。'),
  line('後記','天亮的時候，無名狀上的字又浮了出來。有人回了家，有魂入了土；鎮祟寺的香火，終於熄了。') ]},
 village:{title:'門上無字',chapter:'序 · 無名村',purpose:'擊退闖入村口的墨狼',lines:[
  line('阿苗','判官爺爺，不用看門牌了，上面都是空的。我把哥哥的名字寫在手心，每天描一遍，才沒有忘記。'),
  line('鍾馗','寫的是什麼？'),
  line('阿苗','……只剩一半了。昨天晚上狼一叫，字就淡一點。牠們又來了，就在村口！'),
  line('鍾馗','把手握緊。剩下那一半，我去幫你要回來。') ]},
 villageClear:{title:'狼不吃人',chapter:'序 · 狼退之後',purpose:'穿過無名坊，入山尋人',lines:[
  line('村中老婦','這些狼不咬人，只叼走門牌、族譜、小孩的長命鎖……只要上面寫了名字的，都叼走。'),
  line('鍾馗','不吃肉，專吃名字。這些狼是有人養的。'),
  line('村中老婦','七年前也是這樣下雨的晚上，獵戶魏三帶著大家上山求神。回來以後，狼就沒再進過村子——直到今年。'),
  line('鍾馗','七年。借出去的東西，到期了。') ]},
 alpha:{title:'啣名狼王',chapter:'貳 · 林深處',purpose:'擊敗狼王，斬斷牠頸上的役魂鏈',lines:[
  line('鍾馗','滿嘴都是名牌，卻一塊也不肯吞下去。你在替誰保管？'),
  line('啣名狼王','……魏……三。我……是魏三。'),
  line('啣名狼王','是我帶他們上山的。手印，是我替全村按的。判官，我不能鬆口——一鬆口，這些名字就歸祂了。'),
  line('鍾馗','那你咬緊。你脖子上的鏈子，我來砍。') ]},
 alphaClear:{title:'獵戶的手印',chapter:'貳 · 鏈斷',purpose:'出林向北，進千名碑林',lines:[
  line('魏三','那年鬧饑荒，孩子一個接一個發燒。廟裡那位說，一個名字換七年平安……我心想，名字又不能拿來吃。'),
  line('魏三','第一年，我忘了我娘是怎麼叫我的。第三年，我變成了狼。可是村子裡真的沒有再死人。'),
  line('鍾馗','你沒有害人的心，卻幫害人的開了門。這筆帳，你的和祂的，分開來算。'),
  line('魏三','碑林裡有個抄名字的和尚，每一個名字他都記得。去找無塵。') ]},
 steles:{title:'千碑無字',chapter:'參 · 千名碑林',purpose:'破開碑林中的劍影與抄名鬼吏',lines:[
  line('鍾馗','一個村子、七年的時間，立不了這麼多碑。'),
  line('無塵 · 抄名僧','山下不只一個村子，山上也不只七年。貧僧法號無塵，替這間寺抄了一輩子名字——死了以後，還在抄。'),
  line('無塵 · 抄名僧','碑上的字，是祂叫貧僧磨掉的。小心，祂的差役和那個劍客的影子，就躲在碑後面。') ]},
 stelesClear:{title:'碑陰',chapter:'參 · 碑陰有字',purpose:'向斷魂橋尋守橋人 · 沿路留意發光的碑陰',lines:[
  line('無塵','祂只叫貧僧把正面磨掉，沒說背面。所以每磨掉一個，我就在背面再刻一個。'),
  line('鍾馗','把它拓下來，就能還回去嗎？'),
  line('無塵','名字要有人念，才算活著。施主一路上如果看到碑的背面在發光，請幫貧僧拓一張，念一聲。'),
  line('鍾馗','我這本簿子，本來就是用來記名字的。') ]},
 lanterns:{title:'燈油',chapter:'伍 · 燃名香道',purpose:'斬斷燈奴身上的燃名咒',lines:[
  line('鍾馗','整座山看不到半個人，這一路的燈卻剛添過油。'),
  line('燈中的聲音','不要撥燈芯……燒的是我。這裡的每一盞燈，都是一個人的名字。'),
  line('鍾馗','沈阿蘅？'),
  line('沈阿蘅 · 燈中','這個名字……好久沒有人叫了。我哥哥，還守在橋上嗎？'),
  line('鍾馗','他把劍收起來了。他託我把你的名字帶下山。') ]},
 lanternsClear:{title:'不能吹熄',chapter:'伍 · 燈下',purpose:'前往山門 · 兩尊護法已醒',lines:[
  line('鍾馗','燈奴都倒了，燈卻還亮著。'),
  line('沈阿蘅','不能吹。燈一熄，名字就燒成灰了。祂把我們當燈油，也把我們當人質。'),
  line('沈寒舟','阿蘅……是哥哥太糊塗。這條路我幫你照著。判官，你儘管往上走。'),
  line('鍾馗','燈我一盞都不碰。我去把點燈的那隻手砍下來。') ]},
 forecourt:{title:'護法',chapter:'陸 · 山門前庭',purpose:'擊碎受驅使的石獸與泥塑護法',lines:[
  line('無塵','門口的石獸，還有門裡那兩尊泥像，本來都是護山的。左邊那一尊，還是貧僧親手描的金。'),
  line('鍾馗','現在護的是賊。'),
  line('無塵','塑像不認人，只認坐在神座上的是誰。施主，對不住了——把祂們打碎吧。') ]},
 forecourtClear:{title:'空神座',chapter:'陸 · 泥身碎盡',purpose:'入山門 · 借名殿就在門後',lines:[
  line('無塵','這間寺以前拜的是真正的山神。那本簿子本來叫《保名冊》——祂記著誰，就保護誰。'),
  line('無塵','後來沒人來上香，連祂自己的名號都沒人記得了。神座空了，一頭山魈披上神袍，坐了上去。'),
  line('鍾馗','保護人的冊子倒過來寫，就成了扣住人的契約。'),
  line('無塵','貧僧的名字就在冊子第一頁，所以三百年都走不了。施主，殿裡見。') ]},
 hall:{title:'借名殿',chapter:'柒 · 借名殿',purpose:'闖過借名殿 · 契約在自衛',lines:[
  line('殿上的聲音','鍾馗。當年在金殿上，你的名字也被人從榜上抹掉過。沒有名字是什麼滋味，你應該比誰都清楚。'),
  line('鍾馗','清楚。所以我最看不慣你這種東西。'),
  line('殿上的聲音','留下來幫我管名冊，我就把你的功名寫回去。寫在我這裡的，才算數。'),
  line('鍾馗','我的名字，老百姓貼在門上叫了一千年，不需要你來批准。') ]},
 hallClear:{title:'今夜到期',chapter:'柒 · 名冊末頁',purpose:'推開鎮祟門 · 向偽神討債',lines:[
  line('鍾馗','最後一頁……是山下那位老婆婆的手印。她借出去的，是她自己的名字。'),
  line('無塵','七年前她兒子高燒不退。她瞞著家人上山，替那孩子換了七年。今晚半夜，就到期了。'),
  line('鍾馗','所以兒子替娘上山還願，娘卻連兒子叫什麼都忘了。真是好一筆買賣。'),
  line('無塵','半夜一到，全村的契約會一起收走。祂就在門後面。') ]},
 nameless:{title:'神袍之下',chapter:'終 · 無名之主',purpose:'斬斷祂吞下的每一個名字',lines:[
  line('無塵','契約裂了，神袍也裂了。這底下……不是山魈。施主，那是——'),
  line('無名之主','你抄了三百年，居然認不出我。神座上從來沒有換過人，無塵。是你們先把我忘了。'),
  line('無名之主','沒有人叫的神，是會餓的。餓到最後，就只記得一件事：名字，可以吃。'),
  line('鍾馗','被人忘記是很苦。可是拿這份苦來餵飽自己，就是罪。你吞下去的，一個一個還回來。') ]},
 epilogue:{title:'天明',chapter:'尾聲 · 無名村',purpose:'名字回到了喊它的人口中',lines:[
  line('村中老婦','……柱兒。我兒子叫陳柱。我叫——我叫劉月娥。四十年沒有人這樣叫我了。'),
  line('阿苗','判官爺爺你看！手心的字回來了，一筆都沒少！'),
  line('魏三 · 殘魂','村口那座牌坊，託個夢叫他們重新刻字吧。把全村的名字都刻上去，一個都別漏。'),
  line('鍾馗','刻深一點。別再讓人磨掉了。') ]},
 trueName:{title:'山神有名',chapter:'尾聲 · 十二拓全',purpose:'十二張名拓，拼出了最老的一個名字',lines:[
  line('無塵','十二張拓片拼起來，是碑林裡最老那塊碑的背面。貧僧刻的第一個名字，原來不是人的名字。'),
  line('鍾馗','「青崖君」。這座山的神，叫青崖君。'),
  line('青崖君','……有人在叫我。三百年了。判官，那些名字我都還得起；我自己欠的債，你押我去還。'),
  line('鍾馗','帶路的燈有了，走吧。從今以後，這座山有名有姓。') ]},
 coda:{title:'還有一行',chapter:'尾聲 · 無名狀',purpose:'山不止這一座',lines:[
  line('無塵','施主的簿子，貧僧幫你抄完了。只是那張無名狀，最後怎麼又多出一行空白？'),
  line('鍾馗','山不只這一座。'),
  line('後記','雨停了，天亮了。有人回了家，有魂入了土。判官收起簿子，往下一座山走去。') ]},
 wolfEnd:{title:'獸腹咒散',chapter:'斷章 · 墨狼',purpose:'線索已記入志怪錄',lines:[line('獲救的殘魂','名牌……在鎮祟寺。求求你，別再讓別人上山了。'),line('鍾馗','這一縷魂，我先送出林子。剩下的債，我沿著古道去討。')]},
 roninEnd:{title:'斷刃的囑託',chapter:'斷章 · 劍客',purpose:'線索已記入志怪錄',lines:[line('沈寒舟','我的劍攔住的，竟然都是來求救的人……山魈把借名契藏在身上。求你把它毀掉。'),line('鍾馗','你把劍收起來吧。已經被騙到死了，不該死後還被這場騙局纏著。')]},
 oniEnd:{title:'偽神伏誅',chapter:'斷章 · 山魈',purpose:'借名契已毀 · 完整故事見無雙征途',lines:[line('鎮祟山魈','沒有我，誰來保他們平安？'),line('鍾馗','先除掉你這個禍害，再來談人間的路怎麼走。'),line('後記','借名契燒成了灰，被抹掉的名字一個一個浮了出來。想知道事情的來龍去脈，請從「無雙征途」讀起。')]}
});
// Which page opens each chapter of the road and which closes it; duels use their foe's own page.
export const DUEL_SCENES=['wolf','ronin','oni'];
export const STAGE_INTRO=Object.freeze({village:'village',bamboo:'wolf',alpha:'alpha',steles:'steles',bridge:'ronin',lanterns:'lanterns',forecourt:'forecourt',hall:'hall',oni:'oni',nameless:'nameless'});
export const STAGE_CLEAR=Object.freeze({village:'villageClear',bamboo:'wolfClear',alpha:'alphaClear',steles:'stelesClear',bridge:'roninClear',lanterns:'lanternsClear',forecourt:'forecourtClear',hall:'hallClear'});
// Reading order for the journal, whatever order the pages were found in.
export const SCENE_ORDER=Object.freeze(['opening','village','villageClear','wolf','wolfClear','alpha','alphaClear','steles','stelesClear','ronin','roninClear','lanterns','lanternsClear','forecourt','forecourtClear','hall','hallClear','oni','nameless','ending','epilogue','trueName','coda','wolfEnd','roninEnd','oniEnd']);
// Lines that were recorded. Everything else is read, not heard.
const VOICED=new Set(['opening','wolf','wolfClear','ronin','roninClear','oni','ending','wolfEnd','roninEnd','oniEnd','bark-oni-rage','bark-ronin-blade','bark-wolf-voice','bark-ronin-doubt','bark-hero-parry']);
// Speech is switched off: only the first chapters were ever recorded, and every line has since been reworded
// into plain spoken Chinese, so the recordings in assets/audio/dialogue say the old script.
// Record the current lines again before setting VOICE_ON.
export const VOICE_ON=false;
export const recorded=id=>VOICED.has(id);
export const voiced=id=>VOICE_ON&&recorded(id);
// The names the scribe hid on the backs of the steles, keyed by the pickup that holds each one.
export const NAMES=Object.freeze({
 r1:{name:'陳柱',text:'老婆婆的兒子，上山還願三天沒回來。碑的背面有一行小字：「娘的藥錢，我賺到了。」'},
 r2:{name:'魏三',text:'獵戶。替全村按下手印的人。名字旁邊刻著一把沒上弦的弓。'},
 r3:{name:'林穗',text:'採筍的姑娘。進林子那天，籃子還放在家門口。'},
 r4:{name:'魏小滿',text:'魏三的女兒。鬧饑荒那年，第一個退燒的孩子。'},
 r5:{name:'周石頭',text:'刻碑的師傅。這片碑林有一半是他刻的；最後一塊，刻的是他自己。'},
 r6:{name:'無塵',text:'負責抄寫的和尚。《保名冊》第一頁，墨色最舊的那一行。'},
 r7:{name:'沈寒舟',text:'守橋的劍客。背面的字被劍劃過，又有人一筆一筆補了回去。'},
 r8:{name:'沈阿蘅',text:'寒舟的妹妹。名字只剩半邊，另外半邊在燈裡。'},
 r9:{name:'何三娘',text:'香客。每年上山添燈油，卻不知道燈裡燒的是自己的丈夫。'},
 r10:{name:'小沙彌',text:'沒有俗家的名字。背面只刻了一個木魚，和一句「師父說我叫小沙彌」。'},
 r11:{name:'劉月娥',text:'山下的老婆婆。借出自己的名字，替兒子換了七年。'},
 r12:{name:'青崖',text:'碑林裡最老的一塊。背面只有兩個字，不像人的名字。'}
});
export const IDENTITIES=Object.freeze({wolf:{name:'墨狼',title:'受役魂咒驅使的獵魂獸'},ronin:{name:'沈寒舟',title:'誤信還魂之約的亡魂'},oni:{name:'鎮祟山魈',title:'竊名拘魂的偽山神'}});
// On the road every foe carries its own name; a duel shows the foe's story identity.
export function identityFor(game){return game.campaign&&game.enemy?.identity||IDENTITIES[game.spec.id];}
export const LORE=Object.freeze([
 {title:'鍾馗捉鬼',text:'借用民間傳說中鍾馗驅鬼除害、護佑人間的形象。本篇的村落、沈寒舟與借名契，均為原創，並非古籍情節。',url:'https://www.th.gov.tw/Epaper_Content/237/7467/',source:'臺灣文獻館 · 鍾馗'},
 {title:'為虎作倀',text:'「倀」原指傳說中被虎吃掉、反而替虎役使的鬼。本篇借用受害者被迫助害的母題，改寫為受騙守橋的亡魂；狼群與役魂咒是遊戲設定。',url:'https://dict.concised.moe.edu.tw/dictView.jsp?ID=32099',source:'教育部國語辭典 · 倀'},
 {title:'落第與門神',text:'傳說鍾馗應試得中，卻因相貌被黜，死後受封驅邪；民間將其畫像貼於門戶。本篇「名字從榜上抹掉」「貼在門上叫了一千年」取意於此，對白與山神青崖君皆為原創。',url:'https://www.th.gov.tw/Epaper_Content/237/7467/',source:'臺灣文獻館 · 鍾馗'}
]);
const STORAGE_KEY='inkblade.journal.v1',NAMES_KEY='inkblade.names.v1';
export class StoryDirector{
 constructor(storage=null){this.storage=storage;this.journal=new Set();this.names=new Set();const load=(key,known,into)=>{try{const saved=JSON.parse(storage?.getItem(key)||'[]');if(Array.isArray(saved))for(const id of saved)if(Object.hasOwn(known,id))into.add(id);}catch{}};load(STORAGE_KEY,SCENES,this.journal);load(NAMES_KEY,NAMES,this.names);this.seen=new Set();this.queue=[];this.current=null;this.index=0;this.barkUsed=new Set();this.nextBarkAt=0;this.campaign=false;this.opponent=0;}
 remember(id){this.journal.add(id);try{this.storage?.setItem(STORAGE_KEY,JSON.stringify([...this.journal]));}catch{}}
 start({campaign=false,opponent=0,retry=false,stage=0}={}){this.cancel();this.campaign=campaign;this.opponent=opponent;this.barkUsed.clear();this.nextBarkAt=0;if(!retry){this.seen.clear();this.queue=campaign?['opening',STAGE_INTRO[STAGES[0].id]]:[DUEL_SCENES[opponent]];}else if(campaign){this.seen.add(STAGE_INTRO[STAGES[stage].id]);}return this.openNext();}
 open(id){if(!Object.hasOwn(SCENES,id)||this.seen.has(id))return null;this.seen.add(id);this.remember(id);this.current=id;this.index=0;return this.view();}
 openNext(){while(this.queue.length){const view=this.open(this.queue.shift());if(view)return view;}this.current=null;this.index=0;return null;}
 view(){if(!this.current)return null;const scene=SCENES[this.current];return {id:this.current,...scene,line:scene.lines[this.index],index:this.index,total:scene.lines.length,voiced:voiced(this.current)};}
 advance(){if(!this.current)return null;if(++this.index<SCENES[this.current].lines.length)return this.view();return this.openNext();}
 skip(){// Skip the full encounter, while keeping every skipped page available in the journal.
  for(const id of this.queue){this.seen.add(id);this.remember(id);}this.cancel();return null;
 }
 cancel(){this.current=null;this.index=0;this.queue=[];}
 // A page that falls due while another is being read follows it instead of being lost.
 event(event,game){if(!this.campaign||!['chapter','gate-open'].includes(event.type))return null;const id=STAGES[event.stage??game.stage]?.id,scene=(event.type==='chapter'?STAGE_INTRO:STAGE_CLEAR)[id];if(!scene)return null;if(this.current){if(!this.seen.has(scene)&&!this.queue.includes(scene))this.queue.push(scene);return null;}return this.open(scene);}
 // The road's ending runs on into the village at dawn; whoever brought back every hidden name also learns the mountain's own.
 finish(won,game=null){if(!won||this.current)return null;if(!this.campaign)return this.open(['wolfEnd','roninEnd','oniEnd'][this.opponent]);this.queue=['ending','epilogue',...(game?.rubbings?.()>=Object.keys(NAMES).length?['trueName']:[]),'coda'];return this.openNext();}
 // A name taken from a stele: kept in the journal, and read out once as a passing line.
 rubbing(id,count=this.names.size+1){const entry=NAMES[id];if(!entry)return null;this.names.add(id);try{this.storage?.setItem(NAMES_KEY,JSON.stringify([...this.names]));}catch{}return {id:`rubbing-${id}`,speaker:`名拓 · ${count} / ${Object.keys(NAMES).length}`,text:`「${entry.name}」${entry.text}`};}
 bark(event,game){if(this.current||game.status!=='playing'||game.time<this.nextBarkAt)return null;const actor=game.campaign?game.enemies.find(e=>e.id===event.enemyId):game.enemy;const kind=actor?.kindId||(!game.campaign?game.spec.id:null),role=actor?.role||event.role||kind;let key,text,speaker;
  if(event.type==='enrage'&&role==='oni'){key='oni-rage';speaker='鎮祟山魈';text='整座山的名字，都在我手裡！';}
  else if(event.type==='projectile-release'&&['ronin','hanzhou'].includes(role)){key='ronin-blade';speaker='沈寒舟';text='誰都別想過這座橋！';}
  else if(event.type==='enemy-swing'&&role==='wolf'){key='wolf-voice';speaker='狼腹中的殘魂';text='救救我……我不想再替祂帶路了。';}
  else if(event.type==='stagger'&&['ronin','hanzhou'].includes(role)){key='ronin-doubt';speaker='沈寒舟';text='這道咒……怎麼會連在我的劍上？';}
  else if(event.type==='parry'){key='hero-parry';speaker='鍾馗';text='看清楚，這一劍是幫你砍鎖的。';}
  else if(event.type==='projectile-release'&&role==='alpha'){key='alpha-howl';speaker='啣名狼王';text='不要聽……那聲音裡，全都是他們的名字……';}
  else if(event.type==='projectile-release'&&role==='scribe'){key='scribe-roll';speaker='抄名鬼吏';text='報上名來，我好記你一筆。';}
  else if(event.type==='troop-defeated'&&event.role==='thrall'){key='thrall-out';speaker='燃名燈奴';text='燈……終於不用再亮了。';}
  else if(event.type==='roused'&&role==='lion'){key='lion-wake';speaker='鍾馗';text='護山的獸，認錯主人了。醒一醒。';}
  else if(event.type==='stagger'&&role==='acolyte'){key='acolyte-crack';speaker='無塵';text='泥巴裡還留著金粉……祂們本來不該是這個樣子。';}
  else if(event.type==='ambush'){key='ambush';speaker='鍾馗';text='躲在影子裡的，全都出來。';}
  else if(event.type==='projectile-release'&&role==='nameless'){key='nameless-hunger';speaker='無名之主';text='吞下去的，都是我的！';}
  else if(event.type==='stagger'&&role==='nameless'){key='nameless-names';speaker='無名之主';text='不要念……不要念那些名字！';}
  if(!key||this.barkUsed.has(key))return null;this.barkUsed.add(key);this.nextBarkAt=game.time+12;return {id:`bark-${key}`,speaker,text};
 }
 snapshot(){return {scene:this.current,line:this.index,total:this.current?SCENES[this.current].lines.length:0,journal:[...this.journal],names:[...this.names],seen:[...this.seen]};}
}
