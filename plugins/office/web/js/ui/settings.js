// The settings panel (the gear, or S): what the page lets you choose, remembered in this browser.
'use strict';
const PREFS_DEFAULT={time:'auto',badges:true,autohide:false,compact:false,calm:false};
const PREFS={...PREFS_DEFAULT};
const prefsEl=document.getElementById('prefs'),setBtn=document.getElementById('set');
try{Object.assign(PREFS,JSON.parse(localStorage.getItem('office.prefs')||'{}'));}catch(e){}
try{if(!/labels/.test(Q)&&localStorage.getItem('office.labels')==='1'){LABELS=true;lbtn.classList.add('on');}}catch(e){}
lbtn.addEventListener('click',()=>{try{localStorage.setItem('office.labels',LABELS?'1':'0');}catch(e){}});
function savePrefs(){try{localStorage.setItem('office.prefs',JSON.stringify(PREFS));}catch(e){}}
const TIMES={auto:null,day:12,night:23};
// What each choice changes on the page. A ?hour= in the address (the test pages) wins over the setting.
function applyPrefs(){
  HOUR=HOUR_ASKED!=null?HOUR_ASKED:TIMES[PREFS.time]??null;
  document.body.classList.toggle('tuck',PREFS.autohide);
  document.body.classList.toggle('calm',PREFS.calm);
  if(UI_SCALE!==(PREFS.compact?.8:1)){UI_SCALE=PREFS.compact?.8:1;resize();}
}
const prefsKey=()=>JSON.stringify([PREFS,themeKey,LABELS,barOn,soundOn]);
let prefsSeen='';
function prefsHtml(){
  const sw=(k,label,on,note)=>`<button type="button" class="tog" role="switch" aria-checked="${on}" data-sw="${k}"><span>${label}${note?`<small>${note}</small>`:''}</span><i></i></button>`;
  const seg=(k,label,opts)=>`<div class="row"><span>${label}</span><div class="seg" role="radiogroup" aria-label="${label}">${opts.map(([v,t])=>`<button type="button" role="radio" aria-checked="${PREFS[k]===v}" class="${PREFS[k]===v?'on':''}" data-seg="${k}" data-v="${v}">${t}</button>`).join('')}</div></div>`;
  const keys=[['T','Next room'],['L','Labels'],['I','Item bar'],['M','Sound'],['S','Settings'],['1-9','Go to a floor'],['Esc','Close']];
  return `<header><h2>Settings</h2><button type="button" class="x" aria-label="Close">×</button></header>
<section><h3>Room</h3><div class="rooms">${THEME_KEYS.map(k=>{const t=THEMES[k];return `<button type="button" class="${k===themeKey?'on':''}" aria-pressed="${k===themeKey}" data-room="${k}"><span class="sw">${t.swatch.map(c=>`<i style="background:${c}"></i>`).join('')}</span><span class="nm">${esc(t.name)}</span></button>`;}).join('')}</div>
${seg('time','Time of day',[['auto','Live'],['day','Day'],['night','Night']])}</section>
<section><h3>Display</h3>${sw('labels','Labels',LABELS,'Names and plans in words')}${sw('badges','Head icons',PREFS.badges,'The role above each Claude')}${sw('items','Item bar',barOn)}${sw('autohide','Hide the bars',PREFS.autohide,'They come back near the bottom')}${sw('compact','Compact buttons',PREFS.compact)}${sw('calm','Less motion',PREFS.calm,'No slides, no bounces')}</section>
<section><h3>Sound</h3>${sw('sound','Sound',soundOn)}<div class="row"><span>Volume</span><input id="pvol" type="range" min="0" max="100" step="5" aria-label="Volume" value="${volume}"><output id="pvolv">${volume}%</output></div></section>
<section><h3>Shortcuts</h3><dl>${keys.map(([k,t])=>`<div><dt>${k}</dt><dd>${t}</dd></div>`).join('')}</dl></section>
<footer><button type="button" class="reset">Back to defaults</button></footer>`;
}
function renderPrefs(){if(!prefsEl.classList.contains('open'))return;const k=prefsKey();if(k===prefsSeen)return;prefsSeen=k;const top=prefsEl.scrollTop;prefsEl.innerHTML=prefsHtml();prefsEl.scrollTop=top;}
function openPrefs(on){prefsEl.classList.toggle('open',on);setBtn.classList.toggle('on',on);setBtn.setAttribute('aria-expanded',String(on));if(on){prefsSeen='';closeMenu();closeCard();renderPrefs();}}
function setPref(k,v){PREFS[k]=v;savePrefs();applyPrefs();renderPrefs();}
setBtn.addEventListener('click',()=>openPrefs(!prefsEl.classList.contains('open')));
prefsEl.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.classList.contains('x'))openPrefs(false);
  else if(b.classList.contains('reset')){Object.assign(PREFS,PREFS_DEFAULT);savePrefs();applyPrefs();setBar(true);if(LABELS)lbtn.click();renderPrefs();}
  else if(b.dataset.room)setTheme(b.dataset.room);
  else if(b.dataset.seg)setPref(b.dataset.seg,b.dataset.v);
  else if(b.dataset.sw==='labels')lbtn.click();
  else if(b.dataset.sw==='items')setBar(!barOn);
  else if(b.dataset.sw==='sound')setSound(!soundOn);
  else if(b.dataset.sw)setPref(b.dataset.sw,!PREFS[b.dataset.sw]);
  renderPrefs();
});
// the slider moves the same volume as the one by the sound button
prefsEl.addEventListener('input',e=>{if(e.target.id!=='pvol')return;volR.value=e.target.value;volR.dispatchEvent(new Event('input'));document.getElementById('pvolv').textContent=volume+'%';});
prefsEl.addEventListener('change',e=>{if(e.target.id==='pvol')volR.dispatchEvent(new Event('change'));});
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'){openPrefs(false);return;}
  if((e.key==='s'||e.key==='S')&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!(e.target.matches&&e.target.matches('input,textarea')))openPrefs(!prefsEl.classList.contains('open'));
});
setInterval(renderPrefs,500); // T, L, I and M change what the panel shows
// Hidden bars come back when the pointer nears the bottom of the room, or while something is dragged.
window.addEventListener('pointermove',e=>{
  if(!PREFS.autohide)return;const r=stage.getBoundingClientRect();
  document.body.classList.toggle('peek',e.clientY>r.top+r.height*.74||!!carry||!!(boardDrag&&boardDrag.on));
});
applyPrefs();
