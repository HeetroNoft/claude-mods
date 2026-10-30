// The floors: the panel by the item bar with a light per desk (blinking when a Claude waits for you,
// red when one is out of usage), the lift between floors, and sending a desk to another floor.
'use strict';
const floorsEl=document.getElementById('floors'),FLOOR_FADE=240,BASE_TITLE=document.title;
// The office's name, for the tab's title; empty keeps the page's own. Like the cat's name, kept apart from
// PREFS: the settings redraw when PREFS change, which would move the caret while it is typed.
const OFFICE_NAME_MAX=40;
let officeName='';
try{officeName=localStorage.getItem('office.name')||'';}catch(e){}
function setOfficeName(s){officeName=String(s||'').replace(/\s+/g,' ').trim().slice(0,OFFICE_NAME_MAX);try{localStorage.setItem('office.name',officeName);}catch(e){}renderFloors();}
floorsEl.innerHTML='<span class="pill"></span><div class="chips"></div>'; // the pill slides under the floor you are on
const floorPill=floorsEl.firstChild,floorChips=floorsEl.lastChild;
let floorsKey='',floorSlide=null;
const SLIDE_GAP=18,slideSnap=document.createElement('canvas'),slideNew=document.createElement('canvas');
slideSnap.width=slideNew.width=W;slideSnap.height=slideNew.height=H;
const calmMotion=()=>PREFS.calm||(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
const deskState=d=>d.limited?'limit':d.waiting?'wait':'';
function floorDesks(f){return everyDesk.filter(d=>floorOf.get(String(d.id))===f);}
function floorName(f){
  const dk=floorDesks(f),wait=dk.filter(d=>d.waiting&&!d.limited).length;
  return `Floor ${f+1}: ${dk.map(d=>str(d.name||'Claude',16)).join(', ')||'empty'}${wait?` (${wait} waiting)`:''}`;
}
function renderFloors(){
  const drag=!!(boardDrag&&boardDrag.on),waiting=everyDesk.filter(d=>d.waiting&&!d.limited).length;
  document.title=(waiting?`(${waiting}) `:'')+(officeName||BASE_TITLE);
  const many=floorCount>4,fs=[...Array(floorCount).keys()];
  const catF=cat&&floorCount>1?cat.floor:-1;
  const key=[drag,curFloor,floorCount,catF,...everyDesk.map(d=>[d.id,d.name,floorOf.get(String(d.id)),deskState(d)].join(':'))].join('|');
  if(key===floorsKey)return;floorsKey=key;
  floorsEl.classList.toggle('show',floorCount>1||(drag&&everyDesk.length>1));
  floorsEl.classList.toggle('many',many);
  floorChips.innerHTML=fs.map(f=>{
    const dk=floorDesks(f),st=dk.some(d=>d.limited)?'limit':dk.some(d=>d.waiting)?'wait':'',name=esc(floorName(f));
    const lights=(f===catF?'<u class="cat" title="The cat is here"></u>':'')+(many?'':dk.map(d=>`<i class="${deskState(d)}" style="background:${looksFor(String(d.id)).c}"></i>`).join(''));
    return `<button type="button" data-f="${f}" class="${f===curFloor?'cur ':''}${st}${drag&&dk.length>=MAX_DESKS?' full':''}" aria-label="${name}" aria-pressed="${f===curFloor}" title="${name}"><b>${f+1}</b>${lights}</button>`;
  }).join('')+(drag?`<button type="button" data-f="${floorCount}" class="new" aria-label="A new floor" title="A new floor"><b>+</b></button>`:'');
  layoutBars();
  const cur=floorChips.querySelector('.cur');
  floorPill.style.opacity=cur?1:0;if(cur){floorPill.style.width=cur.offsetWidth+'px';floorPill.style.height=cur.offsetHeight+'px';floorPill.style.transform=`translate(${cur.offsetLeft}px,${cur.offsetTop}px)`;}
}
// Leaving a floor: the room as it stands is kept for the ride, then the page clears for the next one.
function leaveFloor(dir,floors){
  const tp=performance.now();
  if(calmMotion())floorFade=tp+FLOOR_FADE;
  else{slideSnap.getContext('2d').drawImage(wx.canvas,0,0,W,H);floorSlide={t0:tp,dir,ms:Math.min(950,620+(floors-1)*110)};}
  dropDrag();
  if(fallen&&fallen.kind==='desk')restoreFallen();
  closeCard();hoverCh=null;grab=null;
  // the files a Claude was carrying still reach the shelf; the Claudes here are back when you are
  chars.forEach(ch=>{ch.removed=true;shelfErrands(ch,tp);ch.hidden=true;});chars.clear();interns.clear();planes=[];banners=[];
  blip(dir>0?196:147,.16,'triangle');
}
function goFloor(f){
  f=Math.max(0,Math.min(floorCount-1,f));if(f===curFloor)return false;
  leaveFloor(f>curFloor?1:-1,Math.abs(f-curFloor));
  saveRoom(curFloor);
  curFloor=f;floorJump=true;
  loadRoom(f);catOnFloor(false);
  ingest(lastData||{desks:everyDesk},true);
  return true;
}
// The ride: the old room leaves as the new one arrives, the slab between them carrying the floor's
// number; it starts slowly, runs, brakes and settles with a small bounce, everyone bobbing on arrival.
// Timed on the wall clock, so late frames only make it skip. Returns the new room's offset.
function drawFloorSlide(g){
  const S_=floorSlide;if(!S_)return 0;
  const u=(performance.now()-S_.t0)/S_.ms;
  if(u>=1){floorSlide=null;chars.forEach(ch=>{ch.sqv-=12;});blip(660,.05,'sine');setTimeout(()=>blip(880,.07,'sine'),90);return 0;}
  const D=H+SLIDE_GAP,e=u<.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2,bump=u>.72?Math.sin((u-.72)/.28*Math.PI)*3:0;
  const y=Math.round(-S_.dir*(D*(1-e)-bump)),old=y+S_.dir*D,slab=S_.dir>0?old-SLIDE_GAP:old+H;
  const n=slideNew.getContext('2d');n.clearRect(0,0,W,H);n.drawImage(g.canvas,0,0);
  g.fillStyle='#000';g.fillRect(0,0,W,H);
  g.drawImage(slideNew,0,y);g.drawImage(slideSnap,0,old);
  R(g,0,slab,W,SLIDE_GAP,'#2A2C36');R(g,0,slab,W,1,'#4A4D5C');R(g,0,slab+SLIDE_GAP-1,W,1,'#15161C');
  for(let x=(hash('s'+curFloor)%14);x<W;x+=26)R(g,x,slab+3,1,SLIDE_GAP-6,'#1E2029');
  pixText(g,'FLOOR '+(curFloor+1),W/2-16,slab+7,'#FFD84A');
  return y;
}
// A desk sent to another floor: its Claude walks out by the door. A full floor refuses.
function moveToFloor(id,f){
  if(floorOf.get(id)===f||floorDesks(f).length>=MAX_DESKS)return false;
  floorOf.set(id,f);floorPinned.add(id);saveFloors();
  if(fallen&&fallen.kind==='desk'&&fallen.id===id)restoreFallen();
  ingest(lastData||{desks:everyDesk},true);
  return true;
}
function floorChipAt(cx,cy){
  for(const b of floorsEl.querySelectorAll('button')){const r=b.getBoundingClientRect();if(cx>=r.left&&cx<=r.right&&cy>=r.top&&cy<=r.bottom)return +b.dataset.f;}
  return null;
}
function floorHover(cx,cy){const f=floorChipAt(cx,cy);floorsEl.querySelectorAll('button').forEach(b=>b.classList.toggle('over',+b.dataset.f===f));}
floorsEl.addEventListener('click',e=>{const b=e.target.closest('button[data-f]');if(b)goFloor(+b.dataset.f);});
window.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||(e.target&&e.target.matches&&e.target.matches('input,textarea')))return;
  if(e.key==='PageUp'||e.key==='PageDown'){e.preventDefault();goFloor(curFloor+(e.key==='PageUp'?1:-1));}
  else if(/^[1-9]$/.test(e.key))goFloor(+e.key-1);
});
