import {SCENES,LORE,REALM_SCENES,NAMES} from './story3d.js';
import {REALMS} from './realms.js';
const $=id=>document.getElementById(id);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// What a realm's journal section opens with, and what an unfound find still says.
const REALM_JOURNAL=Object.freeze({mountain:{intro:'借名山 · 鍾馗入山尋魂的原創長篇。<br>推進無雙征途，逐頁揭開狼群、守橋人、抄名僧與神袍之下的來歷。',unknown:'碑陰仍在路旁某處發著光。'},
 snow:{intro:'寒聲嶺 · 鍾馗循著一張畫出來的狀紙，上山討回被凍住的聲音。',unknown:'還凍在路旁某根冰柱裡。'}});
const page=([id,s])=>`<details data-story-entry="${id}"><summary><small>${s.chapter}</small><b>${s.title}</b></summary><p class="journal-purpose">${s.purpose}</p>${s.lines.map(l=>`<p><strong>${l.speaker}</strong>${l.text}</p>`).join('')}</details>`;
// One section per realm, in the order they are reached; a realm the hero has not reached is not shown at all.
// The duels' own endings sit with the mountain, where those foes live.
export function journalHTML(story){
 const sections=REALMS.map(realm=>{const own=[...REALM_SCENES[realm.id],...(realm.id==='mountain'?['wolfEnd','roninEnd','oniEnd']:[])],entries=own.filter(id=>story.journal.has(id)).map(id=>[id,SCENES[id]]);
  if(realm.id!=='mountain'&&!entries.length)return '';const words=REALM_JOURNAL[realm.id],ids=realm.PICKUPS.filter(p=>p.kind==='rubbing').map(p=>p.id),found=ids.filter(id=>story.names?.has(id)).length;
  return `<section class="journal-realm" data-realm="${realm.id}"><p class="journal-intro">${words.intro}</p><div class="journal-pages">${entries.length?entries.map(page).join(''):'<p class="journal-empty">尚未展卷。進入「無雙征途」聽取村民的委託。<br>跳過的對話也會收錄，可隨時回看。</p>'}</div><div class="journal-lore journal-names"><h3>${realm.findName} · ${found} / ${ids.length}</h3>${ids.map((id,i)=>story.names?.has(id)?`<p data-name="${id}"><strong>${NAMES[id].name}</strong>${NAMES[id].text}</p>`:`<p class="journal-unknown"><strong>第 ${i+1} 張</strong>${words.unknown}</p>`).join('')}</div></section>`;}).join('');
 return `${sections}<div class="journal-lore"><h3>傳說與改編</h3>${LORE.map(l=>`<p><strong>${l.title}</strong>${l.text}<a href="${escape(l.url)}" target="_blank" rel="noopener">${l.source}<svg class="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></a></p>`).join('')}</div>`;}
export class StoryView{
 constructor({next,skip}){this.root=$('story-dialog');this.background=[];this.barkTime=0;$('story-next').addEventListener('click',next);$('story-skip').addEventListener('click',skip);}
 show(view){if(!view){this.hide();return;}if(this.root.hidden){this.background=[...$('app').children].filter(node=>node!==this.root).map(node=>[node,node.inert]);for(const [node]of this.background)node.inert=true;}$('app').classList.add('story-active');this.root.hidden=false;this.clearBark();$('story-chapter').textContent=view.chapter;$('story-title').textContent=view.title;$('story-speaker').textContent=view.line.speaker;$('story-line').textContent=view.line.text;$('story-purpose').textContent=view.purpose;$('story-progress').textContent=`${view.index+1} / ${view.total}`;$('story-next').textContent=view.index===view.total-1?'繼續旅程 →':'下一句 →';$('story-next').focus({preventScroll:true});}
 hide(){this.root.hidden=true;$('app').classList.remove('story-active');for(const [node,inert]of this.background)node.inert=inert;this.background=[];}
 bark(line){if(!line)return;this.barkId=line.id;$('bark-speaker').textContent=line.speaker;$('bark-line').textContent=line.text;$('story-bark').hidden=false;this.barkTime=4.5;}
 clearBark(){this.barkTime=0;this.barkId=null;$('story-bark').hidden=true;}
 update(dt,voice=null){if(this.barkTime>0){this.barkTime-=dt;if(voice?.id===this.barkId&&['loading','playing'].includes(voice.state))this.barkTime=Math.max(.35,this.barkTime);if(this.barkTime<=0)this.clearBark();}}
}
