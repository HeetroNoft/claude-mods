// The settings panel (the gear, or S): what the page lets you choose, remembered in this browser.
'use strict';
const SOUNDS=[['plan','Plan finished','All the steps done'],['ship','Commit or push',''],['pass','Tests passed',''],['fail','Something failed','A failed command or tests'],['denied','Permission refused',''],['usage','Usage alarm','The gauge running low']];
const PREFS_DEFAULT={time:'auto',season:'auto',hemi:'north',badges:true,gauge:true,autohide:false,compact:false,calm:false,...Object.fromEntries(SOUNDS.map(([k])=>['snd_'+k,true]))};
const PREFS={...PREFS_DEFAULT};
const prefsEl=document.getElementById('prefs'),setBtn=document.getElementById('set');
try{Object.assign(PREFS,JSON.parse(localStorage.getItem('office.prefs')||'{}'));}catch(e){}
try{if(!/labels/.test(Q)&&localStorage.getItem('office.labels')==='1')LABELS=true;}catch(e){}
const soundFor=k=>PREFS['snd_'+k]!==false;
function savePrefs(){try{localStorage.setItem('office.prefs',JSON.stringify(PREFS));}catch(e){}}
const TIMES={auto:null,day:12,night:23};
// What each choice changes on the page. A ?hour= in the address (the test pages) wins over the setting.
function applyPrefs(){
  HOUR=HOUR_ASKED!=null?HOUR_ASKED:TIMES[PREFS.time]??null;
  document.body.classList.toggle('tuck',PREFS.autohide);
  document.body.classList.toggle('nogauge',!PREFS.gauge);
  document.body.classList.toggle('calm',PREFS.calm);
  if(UI_SCALE!==(PREFS.compact?.8:1)){UI_SCALE=PREFS.compact?.8:1;resize();}
}
const prefsKey=()=>JSON.stringify([PREFS,themeKey,LABELS,barOn,soundOn,prefsTab]);
let prefsSeen='',prefsTab='room';
const TABS=[['room','Room'],['display','Display'],['sound','Sound'],['legend','Legend'],['keys','Shortcuts']];
// What the boards and badges can show, in the order of the Legend tab. The board's own words come from plan.js.
const TASK_MEANS={tests:'Running the tests',build:'Building',commit:'Making a commit',push:'Pushing',compact:'Compacting the context'};
const LEGEND=[
  ['Working',[...Object.entries(TASK_MEANS).map(([k,t])=>[TASK_LOOK[k][1],TASK_LOOK[k][0],t]),['lamp','PLANNING','In plan mode'],['alarm','WAITING','A background job or a timer']]],
  ['News',[['check','OK','Tests passed, or work shipped'],['box','MOVED','It changed project or branch'],['bolt','NEW MODEL','It changed model']]],
  ['Needs you',[['quest','?','A question or a permission'],['quest','STUCK?','No news for five minutes'],['cross','FAILED','A command or the tests failed'],['noway','DENIED','A permission was refused'],['skull','NO USAGE','Out of usage']]],
];
const iconSrcs={};
function iconSrc(name){
  if(iconSrcs[name])return iconSrcs[name];
  const c=document.createElement('canvas');c.width=c.height=7;drawIcon(c.getContext('2d'),name,0,0,'#FFFFFF');
  return iconSrcs[name]=c.toDataURL();
}
// One tab's content. Radio groups and the tab bar use a roving tabindex: Tab reaches the chosen one, arrows move (see the keydown below).
function prefsTabHtml(){
  const sw=(k,label,on,note)=>`<button type="button" class="tog" role="switch" aria-checked="${on}" data-sw="${k}"><span>${label}${note?`<small>${note}</small>`:''}</span><i></i></button>`;
  const seg=(k,label,opts)=>`<div class="row stack"><span id="seg-${k}">${label}</span><div class="seg" role="radiogroup" aria-labelledby="seg-${k}">${opts.map(([v,t])=>`<button type="button" role="radio" aria-checked="${PREFS[k]===v}" tabindex="${PREFS[k]===v?0:-1}" class="${PREFS[k]===v?'on':''}" data-seg="${k}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
  if(prefsTab==='display')return `<section><h3>On screen</h3>${sw('labels','Labels',LABELS,'Names and plans in words')}${sw('badges','Head icons',PREFS.badges,'The role above each Claude')}${sw('gauge','Usage gauge',PREFS.gauge,'Slides away; its tab stays')}${sw('items','Item bar',barOn)}</section>
<section><h3>Interface</h3>${sw('autohide','Hide the bars',PREFS.autohide,'They come back near the bottom')}${sw('compact','Compact buttons',PREFS.compact)}${sw('calm','Less motion',PREFS.calm,'No slides, no bounces')}</section>`;
  if(prefsTab==='sound')return `<section><h3>Sound</h3>${sw('sound','Sound',soundOn)}<div class="row"><label for="pvol">Volume</label><input id="pvol" type="range" min="0" max="100" step="5" value="${volume}"><output id="pvolv" for="pvol">${volume}%</output></div></section>
<section><h3>Which sounds</h3>${SOUNDS.map(([k,t,n])=>sw('snd_'+k,t,soundFor(k),n)).join('')}</section>`;
  if(prefsTab==='legend')return LEGEND.map(([title,rows])=>`<section><h3>${title}</h3><dl class="legend">${rows.map(([ic,word,t])=>`<div><dt><img src="${iconSrc(ic)}" alt="">${esc(word)}</dt><dd>${t}</dd></div>`).join('')}</dl></section>`).join('');
  if(prefsTab==='keys'){const keys=[['T','Next room'],['L','Labels'],['I','Item bar'],['G','Usage gauge'],['M','Sound'],['S','Settings'],['1-9','Go to a floor'],['Esc','Close']];
    return `<section><h3>Shortcuts</h3><dl>${keys.map(([k,t])=>`<div><dt>${k}</dt><dd>${t}</dd></div>`).join('')}</dl></section>`;}
  return `<section><h3>Room</h3><div class="rooms" role="radiogroup" aria-label="Room">${THEME_KEYS.map(k=>{const t=THEMES[k],on=k===themeKey;return `<button type="button" role="radio" class="${on?'on':''}" aria-checked="${on}" tabindex="${on?0:-1}" data-room="${k}"><span class="sw">${t.swatch.map(c=>`<i style="background:${c}"></i>`).join('')}</span><span class="nm">${esc(t.name)}</span></button>`;}).join('')}</div></section>
<section><h3>Outside</h3>${seg('time','Time of day',[['auto','Live'],['day','Day'],['night','Night']])}${seg('season','Season',[['auto','Live'],['spring','Spring'],['summer','Summer'],['autumn','Autumn'],['winter','Winter']])}${seg('hemi','Hemisphere',[['north','North'],['south','South']])}</section>
<section><h3>Cat</h3><div class="row"><label for="pcat">Name</label><input id="pcat" type="text" maxlength="${CAT_NAME_MAX}" placeholder="No name yet" spellcheck="false" autocomplete="off" value="${esc(catName)}"></div></section>`;
}
function prefsHtml(){
  return `<header><h2>Settings</h2><button type="button" class="x" aria-label="Close">×</button></header>
<div class="tabs" role="tablist" aria-label="Settings">${TABS.map(([k,t])=>`<button type="button" role="tab" id="tab-${k}" aria-controls="ppanel" aria-selected="${k===prefsTab}" tabindex="${k===prefsTab?0:-1}" data-tab="${k}">${t}</button>`).join('')}</div>
<div id="ppanel" role="tabpanel" aria-labelledby="tab-${prefsTab}" tabindex="-1">${prefsTabHtml()}</div>
<footer><button type="button" class="reset">Back to defaults</button></footer>`;
}
// A CSS selector for a control, to give it the focus back once the panel has been redrawn.
function focusSel(el){
  if(el.id)return '#'+el.id;
  const d=el.dataset;
  return d.room?`[data-room="${d.room}"]`:d.sw?`[data-sw="${d.sw}"]`:d.seg?`[data-seg="${d.seg}"][data-v="${d.v}"]`:el.classList.contains('x')?'.x':el.classList.contains('reset')?'.reset':null;
}
function renderPrefs(){
  if(!prefsEl.classList.contains('open'))return;const k=prefsKey();if(k===prefsSeen)return;prefsSeen=k;
  const a=document.activeElement,sel=prefsEl.contains(a)?focusSel(a):null,old=document.getElementById('ppanel'),top=old&&old.getAttribute('aria-labelledby')==='tab-'+prefsTab?old.scrollTop:0;
  prefsEl.innerHTML=prefsHtml();document.getElementById('ppanel').scrollTop=top;
  const back=sel&&prefsEl.querySelector(sel);if(back)back.focus({preventScroll:true});
}
function openPrefs(on){
  const inside=prefsEl.contains(document.activeElement);
  prefsEl.classList.toggle('open',on);setBtn.classList.toggle('on',on);setBtn.setAttribute('aria-expanded',String(on));
  if(on){prefsSeen='';closeCard();renderPrefs();prefsEl.querySelector('[aria-selected=true]').focus({preventScroll:true});}
  else if(inside)setBtn.focus({preventScroll:true});
}
function setPref(k,v){PREFS[k]=v;savePrefs();applyPrefs();renderPrefs();}
setBtn.addEventListener('click',()=>openPrefs(!prefsEl.classList.contains('open')));
prefsEl.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.classList.contains('x'))openPrefs(false);
  else if(b.classList.contains('reset')){Object.assign(PREFS,PREFS_DEFAULT);savePrefs();applyPrefs();setBar(true);setLabels(false);renderPrefs();}
  else if(b.dataset.tab)prefsTab=b.dataset.tab;
  else if(b.dataset.room)setTheme(b.dataset.room);
  else if(b.dataset.seg)setPref(b.dataset.seg,b.dataset.v);
  else if(b.dataset.sw==='labels')setLabels(!LABELS);
  else if(b.dataset.sw==='items')setBar(!barOn);
  else if(b.dataset.sw==='sound')setSound(!soundOn);
  else if(b.dataset.sw)setPref(b.dataset.sw,!PREFS[b.dataset.sw]);
  renderPrefs();
});
// Arrows move inside the tab bar and the radio groups, and choose as they go.
prefsEl.addEventListener('keydown',e=>{
  const grp=e.target.closest&&e.target.closest('[role=tablist],[role=radiogroup]');if(!grp)return;
  const items=[...grp.querySelectorAll('button')],i=items.indexOf(e.target),n=items.length;
  const to={ArrowRight:i+1,ArrowDown:i+1,ArrowLeft:i-1,ArrowUp:i-1,Home:0,End:n-1}[e.key];if(to==null)return;
  e.preventDefault();const b=items[(to+n)%n];b.focus();b.click();
});
prefsEl.addEventListener('input',e=>{
  if(e.target.id==='pcat')setCatName(e.target.value);
  if(e.target.id==='pvol'){setVolume(+e.target.value);document.getElementById('pvolv').textContent=volume+'%';}
});
prefsEl.addEventListener('change',e=>{
  if(e.target.id==='pvol'&&soundOn)blip(660,.04,'triangle'); // a tick at the chosen level
  if(e.target.id==='pcat'&&catName)catMeow(performance.now()); // it answers to its name
});
// typing the cat's name must not change the room or mute the sound; Esc still closes
window.addEventListener('keydown',e=>{if(e.target.id==='pcat'&&e.key!=='Escape')e.stopImmediatePropagation();},true);
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){openPrefs(false);return;}
  if(e.ctrlKey||e.metaKey||e.altKey||(e.target.matches&&e.target.matches('input,textarea')))return;
  if(e.key==='s'||e.key==='S')openPrefs(!prefsEl.classList.contains('open'));
  else if(e.key==='g'||e.key==='G')setPref('gauge',!PREFS.gauge);
});
document.getElementById('gtab').addEventListener('click',()=>setPref('gauge',!PREFS.gauge));
setInterval(renderPrefs,500); // T, L, I and M change what the panel shows
// Hidden bars come back when the pointer nears the bottom of the room, or while something is dragged.
window.addEventListener('pointermove',e=>{
  if(!PREFS.autohide)return;const r=stage.getBoundingClientRect();
  document.body.classList.toggle('peek',e.clientY>r.top+r.height*.74||!!carry||!!(boardDrag&&boardDrag.on));
});
applyPrefs();
