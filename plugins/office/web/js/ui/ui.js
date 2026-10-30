// Pointer basics (hover, pet, poke, click things), the session card and the theme picker.
'use strict';
/* ---------- pointer: hover, pet, poke, click things ---------- */
function toWorld(e){const r=stage.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
function charAt(x,y){
  const list=[...chars.values()].filter(c=>!c.hidden).sort((a,b)=>b.y-a.y);
  for(const c of list){const top=c.headTop!=null?c.headTop:c.y-17;if(x>=c.x-9&&x<=c.x+9&&y>=top-1&&y<=c.y+1)return c;}
  return null;
}
function internAt(x,y){for(const e of interns.values()){if(!e.hidden&&Math.abs(x-e.x)<=6&&y>=e.y-10&&y<=e.y+1)return e;}return null;}
const OBJECTS=[
  {x:COUNTER.x+7,y:142,w:20,h:17,go:tp=>{brewUntil=tp+2600;blip(520,.08,'triangle');}},
  // the window: the glass and the curtains each have their own click (world/window.js)
  {x:274,y:28,w:42,h:38,go:tp=>windowClick(tp)},
  {x:264,y:23,w:10,h:47,go:tp=>curtainClick(tp)},{x:316,y:23,w:4,h:47,go:tp=>curtainClick(tp)},
  {x:292,y:92,w:22,h:38,go:tp=>{plantT=tp;for(let i=0;i<3;i++)leaves.push({x:296+Math.random()*14,y:98+Math.random()*8,vx:(Math.random()-.5)*8,vy:0,life:2.2,p:Math.random()*6,w:2,c:TH.leafB});blip(330,.06,'triangle');}},
  {x:88,y:136,w:36,h:41,go:tp=>{funUntil=tp+2600;blip(880,.05);setTimeout(()=>blip(1175,.05),90);}},
  {x:149,y:2,w:24,h:24,go:tp=>{clockSpin=tp;blip(1320,.03,'sine');}},
  {x:3,y:38,w:25,h:46,go:tp=>knockDoor(tp)},
  // the shelf: a click shows a folder's file name (furniture/shelf.js)
  {x:58,y:7,w:64,h:11,go:tp=>shelfClick(tp)},{x:198,y:7,w:108,h:11,go:tp=>shelfClick(tp)}
];
function objectAt(x,y){
  if(cat&&Math.abs(x-cat.x)<=6&&y>=cat.y-cat.z-10&&y<=cat.y-cat.z+1)return {cat:true,go:catMeow};
  const xs=deskXs(desks.length);
  for(let i=0;i<desks.length;i++){const dx=xs[i],id=String(desks[i].id);
    if(x>=dx+9&&x<=dx+16&&y>=92&&y<=104)return {go:()=>{if(lampOff.has(id))lampOff.delete(id);else lampOff.add(id);blip(lampOff.has(id)?330:600,.04);}};}
  return OBJECTS.find(o=>x>=o.x&&x<=o.x+o.w&&y>=o.y&&y<=o.y+o.h)||null;
}
function poke(c,tp){
  c.pokes=(c.pokes||[]).filter(t=>tp-t<2500);c.pokes.push(tp);
  if(c.pokes.length>=5){c.pokes=[];setMood(c,'dizzy',2200);c.sqv-=22;blip(300,.14,'triangle');return;}
  const r=Math.random();
  if(r<.35){c.jumpUntil=tp+650;setMood(c,'happy',900);}
  else if(r<.6){setMood(c,'surprised',800);c.sqv-=24;emote(c,'excl');}
  else if(r<.8){setMood(c,'love',1100);emote(c,'heart');c.sqv+=16;}
  else{setMood(c,'happy',1000);emote(c,'note');c.sqv+=18;}
  blip(700+Math.random()*300,.04);
}
const overUi=e=>!!(e.target.closest&&e.target.closest('#card,#menu,#items,#floors,button'));
stage.addEventListener('pointermove',e=>{
  const p=toWorld(e),dx=p.x-ptr.x;ptr.x=p.x;ptr.y=p.y;ptr.in=true;
  if(overUi(e)){hoverCh=null;stage.classList.remove('hand');return;}
  const c=charAt(p.x,p.y);
  if(c&&c!==hoverCh)c.sqv+=10;
  hoverCh=c;
  if(c)c.pet=(c.pet||0)+Math.min(6,Math.abs(dx));
  if(cat&&Math.abs(p.x-cat.x)<=6&&p.y>=cat.y-cat.z-10&&p.y<=cat.y-cat.z+1)cat.pet+=Math.min(6,Math.abs(dx));
  stage.classList.toggle('hand',!!(c||internAt(p.x,p.y)||objectAt(p.x,p.y)||boardAt(p.x,p.y)>=0));
});
stage.addEventListener('pointerleave',()=>{ptr.in=false;hoverCh=null;stage.classList.remove('hand');});
stage.addEventListener('click',e=>{
  if(overUi(e)||performance.now()<suppressClickUntil)return;
  closeMenu();
  const p=toWorld(e),tp=performance.now();
  const c=charAt(p.x,p.y);
  if(c){poke(c,tp);if(cardId===c.id)closeCard();else openCard(c.id);return;}
  const it=internAt(p.x,p.y);if(it){it.hopUntil=tp+400;emoteAt(it.x+3,it.y-11,'excl');blip(900,.03);return;}
  const o=objectAt(p.x,p.y);if(o){o.go(tp);return;}
  closeCard();
});

/* ---------- session card ---------- */
const card=document.getElementById('card');
const VARIANTS=['Classic','Headphones','Antenna','Beanie','Glasses','Bow','Sprout','Top hat','Cap','Chef'];
const ACT_TEXT={think:'Thinking',edit:'Editing files',read:'Reading',bash:'Running commands',web:'On the web',send:'Sending a message',agent:'Briefing a helper',ask:'Waiting for you',limit:'Out of usage',idle:'On a break',asleep:'Not joined yet',gone:'Gone home'};
const IDLE_TEXT={coffee:'having a coffee',window:'looking out the window',plant:'watering the plant',stretch:'stretching',wander:'taking a stroll',juggle:'juggling',chat:'chatting with ',play:'playing catch with ',nap:'napping',read:'reading a book',yoga:'doing yoga',dance:'dancing',game:'playing a game',doze:'dozing off',files:'tidying the files',tinker:'tinkering with the machine',tea:'having tea',origami:'folding a paper crane',donut:'eating a doughnut',float:'floating about',catpet:'petting the cat',arcade:'playing the arcade',rps:'playing rock, paper, scissors with ',planes:'throwing paper planes with ',duet:'dancing with ',highfive:'giving a high five'};
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function statusOf(ch){
  const I=ch.idle,dk=ch.desk||{};
  if(ch.act==='limit'){const rs=dk.limited&&dk.limited.resetsAt?Date.parse(dk.limited.resetsAt):NaN;return 'Out of usage'+(isNaN(rs)?'':' · resumes at '+hhmm(rs));}
  if(ch.act==='ask'&&dk.waiting)return 'Waiting for you · '+str(dk.waiting.text,80);
  if(ch.act==='idle'&&I&&I.act)return 'On a break · '+IDLE_TEXT[I.act]+(I.pair?str((I.pair.desk||{}).name||'Claude',14):'');
  return ACT_TEXT[ch.act]||'Working';
}
function openCard(id){cardId=id;card.classList.remove('open');void card.offsetWidth;card._h='';card.classList.add('open');renderCard();}
function closeCard(){cardId=null;card.classList.remove('open');}
function renderCard(){
  if(!cardId)return;const ch=chars.get(cardId);if(!ch||ch.removed){closeCard();return;}
  const dk=ch.desk||{},inf=etaInfo(dk,Date.now());
  card.style.setProperty('--c',ch.look.c);
  let h=`<button class="x" type="button" aria-label="Close">×</button><h3><i></i>${esc(str(dk.name||'Claude',24))}</h3><div class="sub">${esc(VARIANTS[ch.look.style]||'')} · ${esc(statusOf(ch))}</div>`;
  const det=str(dk.detail,140);if(det&&ch.act!=='idle')h+=`<div class="now">${esc(det)}</div>`;
  if(inf.total)h+='<ol>'+inf.steps.map(s=>{const cur=s===inf.cur;return `<li class="${s.doneMs?'done':cur?'cur':''}"><span>${s.doneMs?'✓':cur?'▸':'·'}</span><span>${esc(str(s.label,70))}</span></li>`;}).join('')+'</ol>';
  let eta='';
  if(inf.mode==='ontime')eta=`Done by <b>${hhmm(inf.fin)}</b> · ${about(inf.left)} left`;
  else if(inf.mode==='late')eta=`Now done by ${hhmm(inf.fin)} · <b style="color:#B26A00">${about(inf.late*60000)} behind plan</b>`;
  else if(inf.mode==='finished')eta=`<b style="color:#2E8A57">Finished at ${hhmm(inf.at)}</b>`;
  else if(!inf.total)eta='No plan yet';
  if(eta)h+=`<div class="eta">${eta}</div>`;
  const nh=(Array.isArray(dk.interns)?dk.interns:[]).length;if(nh)h+=`<div class="eta">${nh} helper${nh>1?'s':''} on it</div>`;
  if(h!==card._h){card.innerHTML=h;card._h=h;}
  placeCard(ch);
}
function placeCard(ch){
  const w=card.offsetWidth,hh=card.offsetHeight;
  let x=P(ch.x)+P(12),y=P(ch.headTop!=null?ch.headTop:ch.y-20)-hh*.25;
  if(x+w>cssW-6)x=P(ch.x)-P(12)-w;
  x=Math.max(6,x);y=Math.max(6,Math.min(cssH-hh-6,y));
  card.style.left=Math.round(x)+'px';card.style.top=Math.round(y)+'px';
}
card.addEventListener('click',e=>{if(e.target.closest('.x'))closeCard();});

/* ---------- theme picker ---------- */
const menu=document.getElementById('menu'),tbtn=document.getElementById('thm');
function renderMenu(){menu.innerHTML=THEME_KEYS.map(k=>{const t=THEMES[k];return `<button type="button" role="menuitemradio" aria-checked="${k===themeKey}" class="${k===themeKey?'on':''}" data-k="${k}"><span class="sw">${t.swatch.map(c=>`<i style="background:${c}"></i>`).join('')}</span>${esc(t.name)}</button>`;}).join('');}
function closeMenu(){menu.classList.remove('open');tbtn.classList.remove('on');}
function setTheme(k){if(!THEMES[k])return;themeKey=k;TH=THEMES[k];resetCatWorld();buildBg();try{localStorage.setItem('office.theme',k);}catch(e){}renderMenu();}
tbtn.addEventListener('click',()=>{const o=!menu.classList.contains('open');menu.classList.toggle('open',o);tbtn.classList.toggle('on',o);});
menu.addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(b)setTheme(b.dataset.k);});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){closeCard();closeMenu();}
  else if((e.key==='t'||e.key==='T')&&!e.ctrlKey&&!e.metaKey)setTheme(THEME_KEYS[(THEME_KEYS.indexOf(themeKey)+1)%THEME_KEYS.length]);
});
